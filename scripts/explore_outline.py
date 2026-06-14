"""Exploratory scan of outline rows across all cached chapter HTML.

Reports: distinct TITLE levels, marker styles per level, and any range
strings that don't match the expected pattern, so we can spot irregularities
before committing to a parser.
"""

from __future__ import annotations

import re
from collections import defaultdict
from pathlib import Path

from bs4 import BeautifulSoup

CACHE_DIR = Path(__file__).parent / "cache"
FULLWIDTH_SPACE = "　"

# Expected range start: optional CN chapter, arabic verse, optional 上/下.
RANGE_START_RE = re.compile(r"^([零一二三四五六七八九十百]+)?(\d+)?([上下])?$")
SEP_RE = re.compile(r"[∼~～]")

levels_seen: set[str] = set()
markers_by_level: dict[str, set[str]] = defaultdict(set)
weird_ranges: list[tuple[str, str, str]] = []  # (file, title, range)
no_range: list[tuple[str, str]] = []           # (file, raw)
range_samples: set[str] = set()


def scan_file(path: Path) -> None:
    soup = BeautifulSoup(path.read_text(encoding="utf-8"), "lxml")
    for td in soup.find_all("td", attrs={"title": True}):
        title_attr = td.get("title")
        # outline marker cells carry a numeric TITLE and a bold marker
        if not title_attr:
            continue
        b = td.find("b")
        if not b:
            continue
        marker = b.get_text(strip=True)
        if not marker:
            continue
        # the sibling cell holds "title　range"
        sib = td.find_next_sibling("td")
        if not sib:
            continue
        sib_b = sib.find("b")
        if not sib_b:
            continue
        text = sib_b.get_text(strip=True)
        if not text:
            continue

        levels_seen.add(title_attr)
        markers_by_level[title_attr].add(marker)

        if FULLWIDTH_SPACE not in text:
            no_range.append((path.name, text))
            continue
        title, _, rng = text.rpartition(FULLWIDTH_SPACE)
        range_samples.add(rng)
        start = SEP_RE.split(rng)[0]
        if not RANGE_START_RE.match(start):
            weird_ranges.append((path.name, title, rng))


def main() -> None:
    files = sorted(CACHE_DIR.glob("[0-9]*_*.html"))
    for p in files:
        scan_file(p)

    print(f"scanned {len(files)} files")
    print(f"\nlevels (TITLE) seen: {sorted(levels_seen, key=lambda x: (len(x), x))}")
    print("\nmarkers per level:")
    for lvl in sorted(markers_by_level, key=lambda x: (len(x), x)):
        ms = sorted(markers_by_level[lvl])
        sample = ms[:12]
        print(f"  level {lvl}: {len(ms)} distinct, e.g. {sample}")

    print(f"\nrows with NO range (no 　): {len(no_range)}")
    for f, t in no_range[:20]:
        print(f"  {f}: {t!r}")

    print(f"\nranges whose START didn't parse: {len(weird_ranges)}")
    for f, t, r in weird_ranges[:40]:
        print(f"  {f}: title={t!r} range={r!r}")

    # sample of range separators / oddities
    seps = set()
    for r in range_samples:
        for ch in r:
            if not (ch.isdigit() or ch in "零一二三四五六七八九十百上下"):
                seps.add(ch)
    print(f"\nnon-digit/non-CN chars appearing in ranges: {sorted(seps)}")


if __name__ == "__main__":
    main()
