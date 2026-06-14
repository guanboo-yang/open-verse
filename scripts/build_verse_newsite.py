"""Rebuild verse.json using line.twgbr.org text, carrying over our notes/segments.

- `text` for every verse is taken from the new site (line.twgbr.org).
- `notes` (annotation positions) are carried over from the old scrape. Where the
  new text has a different character length, the old note offsets no longer line
  up, so the verse is flagged `noteShift: true` for later manual fixing.
- `segments` are kept only when the text is unchanged (otherwise the old split no
  longer matches the new text and is dropped).
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from compare_text import fetch_book, parse_book, norm

# True orthographic variants (異體字): where new-site char differs from ours by one
# of these, keep OUR character. Everything else (genuine rewording, and the
# 「」 quote marks) takes the new-site text. Each entry is "ours→newsite".
# NOTE: 那→哪, 儘→盡, 什→甚, 複→復, 瞭→了 are intentionally NOT here — for those
# our old data used the archaic/less-correct form, so we keep the new site's
# (common) char instead of reverting.
_VARIANT_PAIRS = """
裡→裏 衛→衞 群→羣 牠→它 舍→捨 崙→侖 麵→面 罵→駡 蹟→迹 軟→輭 床→牀 餘→余
略→畧 冤→寃 痲→麻 瘋→風 鍊→鏈 啟→啓 託→托 乾→干 毀→譭 鉤→鈎 冑→胄
儆→警 製→制 穀→谷 颳→刮 醡→搾 籤→簽 鬥→鬪 耽→躭 撚→捻 犁→犂 裏→里 愈→癒
繙→翻 杆→桿 磚→甎 效→傚 罣→掛 髮→發 敘→敍 鎔→熔 吧→罷 隻→只 鬨→哄
梁→樑 賙→周 臟→髒 佈→布 準→准 才→纔 蔯→陳 裡→里 繸→穗 困→睏 巖→岩
鵰→雕 櫺→欞 摀→捂 沖→衝 餽→饋 榦→幹 凶→兇 彩→綵 挂→掛 他→祂 姪→侄
並→併 夥→伙 倣→仿 飢→饑 矇→蒙 慾→欲 惡→噁 后→後 榦→干 跡→迹 菴→庵
剋→克 搆→構 遊→游 畫→劃 卷→捲 只→祇 颻→搖 讚→贊 檐→簷 罈→壇 扎→紮 咽→嚥
採→采 衝→沖 絃→弦 捲→卷 采→採 占→佔 榨→搾 註→注 升→昇 啣→銜 係→系 鉋→刨
杯→盃 家→傢 具→俱 耦→偶 鬱→郁 里→裏 銲→焊 餧→喂 薩→撒 返→反 干→幹
墜→墮 它→他 佔→占 游→遊 劃→畫 併→並
"""
TRUE_VARIANTS = {
    tuple(p.split("→")) for p in _VARIANT_PAIRS.split() if "→" in p
}


def merge_text(old_text: str, new_text: str) -> str:
    """New-site text, but revert true-variant chars back to ours (position-aligned).
    Only possible when lengths match; otherwise it's a genuine rewording → new text.
    """
    if len(old_text) != len(new_text):
        return new_text
    return "".join(
        oc if oc != nc and (oc, nc) in TRUE_VARIANTS else nc
        for oc, nc in zip(old_text, new_text)
    )


SCRIPT_DIR = Path(__file__).parent
OLD_VERSE = SCRIPT_DIR / "output" / "verse.json"
DEFAULT_OUT = SCRIPT_DIR.parent / "public" / "verse.json"


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--out", type=Path, default=DEFAULT_OUT)
    ap.add_argument("--pretty", action="store_true")
    args = ap.parse_args()

    old = json.loads(OLD_VERSE.read_text(encoding="utf-8"))

    n_changed = n_flagged = n_seg_resplit = n_seg_dropped = n_missing = 0
    flagged_list: list[str] = []

    for b in old["books"]:
        theirs = parse_book(fetch_book(b["bookNo"]))
        for c in b["chapters"]:
            tv = theirs.get(c["chapterNo"], {})
            new_verses = []
            for v in c["verses"]:
                raw_new = tv.get(v["verse"])
                if raw_new is None:
                    n_missing += 1
                    newtext = v["text"]  # fall back to old (shouldn't happen)
                else:
                    newtext = merge_text(v["text"], raw_new)
                changed = norm(newtext) != norm(v["text"])
                shifted = len(norm(newtext)) != len(norm(v["text"]))
                if changed:
                    n_changed += 1

                entry: dict = {"verse": v["verse"], "text": newtext}
                if "segments" in v:
                    old_text = "".join(v["segments"])
                    if newtext == old_text:
                        entry["segments"] = v["segments"]
                    elif len(newtext) == len(old_text):
                        # same length → split the new text at the old boundaries
                        segs, pos = [], 0
                        for s in v["segments"]:
                            segs.append(newtext[pos : pos + len(s)])
                            pos += len(s)
                        entry["segments"] = segs
                        n_seg_resplit += 1
                    else:
                        # length changed → boundary unknown; drop (none in practice)
                        n_seg_dropped += 1
                if "notes" in v:
                    entry["notes"] = v["notes"]
                    if shifted:
                        entry["noteShift"] = True
                        n_flagged += 1
                        flagged_list.append(f"{b['name']} {c['chapterNo']}:{v['verse']}")
                new_verses.append(entry)
            c["verses"] = new_verses

    old["source"] = (
        "https://line.twgbr.org/recoveryversion/ (text); "
        "recoveryversion.com.tw (notes/outline)"
    )

    args.out.parent.mkdir(parents=True, exist_ok=True)
    if args.pretty:
        args.out.write_text(json.dumps(old, ensure_ascii=False, indent=2), encoding="utf-8")
    else:
        args.out.write_text(json.dumps(old, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    size_mb = args.out.stat().st_size / 1024 / 1024
    print(f"Wrote {args.out} ({size_mb:.2f} MB)")
    print(f"  文字換成新站、與舊版不同的節: {n_changed}")
    print(f"  *注記 noteShift (字數變動且有註釋): {n_flagged}")
    print(f"  segments 同字數重切(保留): {n_seg_resplit}")
    print(f"  segments 因字數變動丟棄: {n_seg_dropped}")
    if n_missing:
        print(f"  ! 新站找不到、沿用舊文字: {n_missing}")
    (SCRIPT_DIR / "output" / "noteshift_list.txt").write_text("\n".join(flagged_list), encoding="utf-8")
    print(f"  注記清單已寫出 output/noteshift_list.txt")
    return 0


if __name__ == "__main__":
    sys.exit(main())
