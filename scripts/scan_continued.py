"""Scan for outline rows whose marker cell is blank (continuation 續 headings)."""
from __future__ import annotations
import re
from collections import Counter
from pathlib import Path
from bs4 import BeautifulSoup

CACHE = Path(__file__).parent / "cache"
VERSE_RE = re.compile(r"^\s*(\d+)\s*:\s*(\d+)\s*$")

blank = []          # (file, level, title)
title_shapes = Counter()

for p in sorted(CACHE.glob("[0-9]*_*.html")):
    soup = BeautifulSoup(p.read_text(encoding="utf-8"), "lxml")
    for tr in soup.find_all("tr"):
        tds = tr.find_all("td", recursive=False)
        if not tds:
            continue
        # skip verse rows
        a = tds[0].find("a", attrs={"name": True})
        if a is not None and len(tds) >= 2 and VERSE_RE.match(tds[0].get_text(strip=True)):
            continue
        mtd = next((td for td in tds if td.get("title", "").isdigit()), None)
        if mtd is None:
            continue
        b = mtd.find("b")
        if b is None:
            continue
        marker = b.get_text(strip=True)
        if marker:
            continue  # has a marker, already captured
        sib = mtd.find_next_sibling("td")
        if sib is None or sib.find("b") is None:
            continue
        title = sib.find("b").get_text(strip=True)
        if not title:
            continue
        blank.append((p.name, mtd["title"], title))
        # classify shape
        if re.match(r"^（.+　.+）$", title):
            title_shapes["（marker　title）"] += 1
        elif title.startswith("（") and title.endswith("）"):
            title_shapes["（…） no fw-space"] += 1
        else:
            title_shapes["other"] += 1

print(f"blank-marker outline rows: {len(blank)}")
print("title shapes:", dict(title_shapes))
print("\nsamples:")
for f, lvl, t in blank[:25]:
    print(f"  {f} L{lvl}: {t}")
print("\nany 'other' (non-paren) samples:")
for f, lvl, t in blank:
    if not (t.startswith("（") and t.endswith("）")):
        print(f"  {f} L{lvl}: {t!r}")
