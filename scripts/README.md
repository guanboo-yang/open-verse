# scripts — 經文與綱目資料管線

聖經恢復本資料來自兩個官方網站,經爬取、比對、整併後產生 `public/verse.json`
與 `public/outline.json`。需要 `.venv`(見 `requirements.txt`)。

## 三個主要腳本(經文)

| 腳本 | 作用 | 來源 | 產出 |
|---|---|---|---|
| `scrape_verse_old.py` | **舊版爬經文** | recoveryversion.com.tw | `output/verse_old.json`(text + 切段 segments + 註釋位置 notes) |
| `scrape_verse_new.py` | **新版爬經文** | line.twgbr.org | `output/verse_new.json`(較新版的 text,含方引號「」) |
| `merge_verse.py` | **整併成最好的** | 上兩者 | `public/verse.json` |

整併原則:
- **用字遣詞**用新版(最新修訂)、**方引號「」**用新版。
- **異體字**保留舊版較好的(裡/牠/衛…),用逐字對位回填,只有真改寫才變動。
- **註釋 notes / 切段 segments** 沿用舊版;字數變動處標 `noteShift` 待修。

## 綱目腳本

| 腳本 | 作用 | 產出 |
|---|---|---|
| `scrape_outline.py` | 從舊站 cache 解析綱目(舊版) | `output/outline_old.json` |
| `scrape_outline_newsite.py` | 從新站解析綱目(目前採用) | `public/outline.json` |

## 比對 / 診斷工具

- `compare_text.py` — 新舊經文比對,分類 variant/punct/wording → `output/cmp_*.txt`
- `dump_verse_diffs.py` — 新舊經文差異輸出,分三類(異體字 / 標點引號 / 用字遣詞)→ `output/verse_diffs.txt`
- `compare_outline.py` — 新舊綱目比對
- `explore_outline.py`、`scan_continued.py` — 一次性結構探查(開發用)

## 紀錄文件

- `OUTLINE_ISSUES.md` — 綱目原始資料問題(marker 錯位等)
- `OUTLINE_GAPS.md` — 舊版有、新版無的綱目條目(待補,決定全補)

## 注意

`cache/`、`cache_new/`、`output/`、`.venv/` 皆 gitignore;爬取後的 HTML 會快取,
重跑只讀本機檔。`public/verse.json`、`public/outline.json` 才是 app 用的成品。
