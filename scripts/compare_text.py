"""Scrape verse text from line.twgbr.org and compare with our verse.json.

The site serves one HTML page per book (01.html .. 66.html). Chapters are
marked by <h3 id="C{n}...">, verses by <sup>N</sup> inside <p class="calibre2">.
This site does not split verses into segments, so its verse text is compared
against our merged `text` field.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
from pathlib import Path

import requests
from bs4 import BeautifulSoup, NavigableString, Tag

BASE_URL = "https://line.twgbr.org/recoveryversion/bible/{book:02d}.html"
SCRIPT_DIR = Path(__file__).parent
CACHE_DIR = SCRIPT_DIR / "cache_new"
VERSE_JSON = SCRIPT_DIR / "output" / "verse.json"
DELAY = 0.4
UA = "open-verse-compare/0.1 (study tool; github.com/guanboo-yang/open-verse)"

# Chapter number from the <h3> TEXT ("… 第 N 章/篇"). The id (e.g. C11Sam =
# C1 + 1Sam, C12John = C1 + 2John) is ambiguous because some book suffixes start
# with a digit, so we never parse the id number. A book with no "第 N 章" text is
# single-chapter (俄巴底亞書, 約翰二書…) → chapter 1.
CHAPTER_TEXT_RE = re.compile(r"第\s*(\d+)\s*[章篇]")


def fetch_book(book_no: int, use_cache: bool = True) -> str:
    cache = CACHE_DIR / f"{book_no:02d}.html"
    if use_cache and cache.exists():
        return cache.read_text(encoding="utf-8")
    resp = requests.get(BASE_URL.format(book=book_no), headers={"User-Agent": UA}, timeout=30)
    resp.raise_for_status()
    resp.encoding = "utf-8"
    cache.parent.mkdir(parents=True, exist_ok=True)
    cache.write_text(resp.text, encoding="utf-8")
    time.sleep(DELAY)
    return resp.text


def parse_book(html: str) -> dict[int, dict[int, str]]:
    """Return {chapter: {verse: text}}.

    Verse text is split on <sup> markers. The site wraps verses inconsistently
    (sometimes <p class="calibre2">, sometimes a bare <p>), and a verse can span
    a <p> boundary (a paragraph may open with the tail of the previous verse
    before the next <sup>), so the verse number is carried across paragraphs
    within a chapter and any leading text continues the previous verse.
    """
    soup = BeautifulSoup(html, "lxml")
    chapters: dict[int, dict[int, str]] = {}
    cur_ch: int | None = None
    cur_verse: int | None = None
    buf: list[str] = []

    def flush():
        if cur_ch is not None and cur_verse is not None and cur_verse >= 0:
            txt = "".join(buf).strip()
            if txt:
                chapters[cur_ch][cur_verse] = chapters[cur_ch].get(cur_verse, "") + txt

    for el in soup.find_all(["h3", "p"]):
        if el.name == "h3":
            if not el.get("id", "").startswith("C"):
                continue
            flush()
            buf = []
            cur_verse = None
            m = CHAPTER_TEXT_RE.search(el.get_text())
            cur_ch = int(m.group(1)) if m else 1
            chapters.setdefault(cur_ch, {})
        elif el.name == "p" and cur_ch is not None and el.find("sup") is not None:
            for node in el.descendants:
                if isinstance(node, Tag) and node.name == "sup":
                    flush()
                    buf = []
                    t = node.get_text().strip()
                    mnum = re.match(r"(\d+)", t)
                    if mnum:
                        cur_verse = int(mnum.group(1))  # "3", "3上", "3下" → 3
                    else:
                        cur_verse = 0  # superscription (詩篇 title)
                        buf = [t]
                elif isinstance(node, NavigableString):
                    if node.parent is not None and node.parent.name == "sup":
                        continue
                    buf.append(str(node))
    flush()
    return chapters


def norm(s: str) -> str:
    return re.sub(r"\s+", "", s)


# Orthographic variant groups treated as equal for classification. Each char in
# a group is folded to the group's first char.
VARIANT_GROUPS = [
    "它牠", "乾干", "羣群", "那哪", "裏裡", "著着", "麼么嗎", "為爲",
    "甎磚", "侄姪", "崙侖", "啓啟", "麵面", "畧略", "託托", "隻只",
    "鉤鈎", "床牀", "梁樑", "彫雕", "回迴", "並併", "蹟跡", "綑捆", "貍狸",
    "餧餵", "栢柏", "粧妝", "妝粧", "陞升", "雇僱", "傚效", "羶膻", "燄焰",
]
VARIANT_MAP = {c: g[0] for g in VARIANT_GROUPS for c in g}
PUNCT = "，。；：、！？（）「」『』─－…‧"


def fold_variants(s: str) -> str:
    return "".join(VARIANT_MAP.get(c, c) for c in s)


def strip_punct(s: str) -> str:
    return "".join(c for c in s if c not in PUNCT)


def classify(a: str, b: str) -> str:
    """variant | punct | wording, given two non-identical (whitespace-normed) strings."""
    fa, fb = fold_variants(a), fold_variants(b)
    if fa == fb:
        return "variant"
    if strip_punct(fa) == strip_punct(fb):
        return "punct"
    return "wording"


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--book", type=int, help="single book (1-66)")
    ap.add_argument("--no-cache", action="store_true")
    ap.add_argument("--show", type=int, default=30, help="how many diffs to print")
    args = ap.parse_args()

    ours = json.loads(VERSE_JSON.read_text(encoding="utf-8"))
    ours_by_book = {b["bookNo"]: b for b in ours["books"]}

    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    books = [args.book] if args.book else list(range(1, 67))

    total = same = 0
    cats = {"variant": 0, "punct": 0, "wording": 0}
    wording_diffs: list[str] = []
    miss_ours: list[str] = []   # verse exists on new site, not in ours
    miss_new: list[str] = []    # verse exists in ours, not on new site

    for book_no in books:
        html = fetch_book(book_no, use_cache=not args.no_cache)
        theirs = parse_book(html)
        ob = ours_by_book[book_no]
        name = ob["name"]
        our_ch = {c["chapterNo"]: {v["verse"]: v["text"] for v in c["verses"]} for c in ob["chapters"]}

        all_ch = sorted(set(our_ch) | set(theirs))
        for ch in all_ch:
            ours_v = our_ch.get(ch, {})
            theirs_v = theirs.get(ch, {})
            for v in sorted(set(ours_v) | set(theirs_v)):
                total += 1
                a = ours_v.get(v)
                b = theirs_v.get(v)
                if a is None:
                    miss_ours.append(f"{name} {ch}:{v}\t新站={b}")
                elif b is None:
                    miss_new.append(f"{name} {ch}:{v}\t我們={a}")
                elif norm(a) == norm(b):
                    same += 1
                else:
                    cat = classify(norm(a), norm(b))
                    cats[cat] += 1
                    if cat == "wording":
                        dl = len(norm(b)) - len(norm(a))
                        wording_diffs.append(
                            f"{name} {ch}:{v}  (字數差 {dl:+d})\n    我們={a}\n    新站={b}"
                        )

    print(f"比對總節數: {total}")
    print(f"  完全相同: {same}")
    print(f"  正字變體差 (它/牠、那/哪、乾/干…): {cats['variant']}")
    print(f"  標點差: {cats['punct']}")
    print(f"  *用詞不同*: {cats['wording']}")
    print(f"  我們缺(新站有): {len(miss_ours)}，新站缺(我們有): {len(miss_new)}")

    shift = [d for d in wording_diffs if not d.split("\n")[0].endswith("(字數差 +0)")]
    outdir = VERSE_JSON.parent
    (outdir / "cmp_missing_newsite.txt").write_text("\n".join(miss_new), encoding="utf-8")
    (outdir / "cmp_missing_ours.txt").write_text("\n".join(miss_ours), encoding="utf-8")
    (outdir / "cmp_wording.txt").write_text("\n\n".join(wording_diffs), encoding="utf-8")
    (outdir / "cmp_wording_shift.txt").write_text("\n\n".join(shift), encoding="utf-8")
    print(f"\n已寫出 output/cmp_missing_newsite.txt ({len(miss_new)})")
    print(f"已寫出 output/cmp_missing_ours.txt ({len(miss_ours)})")
    print(f"已寫出 output/cmp_wording.txt ({len(wording_diffs)} 全部用詞不同)")
    print(f"已寫出 output/cmp_wording_shift.txt ({len(shift)} 字數有變、會位移註釋)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
