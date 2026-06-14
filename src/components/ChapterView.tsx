import { Fragment, useEffect, useRef, type ReactNode } from 'react'
import { useBible, useOutline, findChapter, chapterOutlineByAnchor } from '@/data/loadBible'
import { BOOK_BY_NO } from '@/data/canon'
import { toChineseNumber, chapterUnit } from '@/lib/chinese'
import type { OutlineEntry } from '@/types/bible'

function OutlineHeading({ entry, tight }: { entry: OutlineEntry; tight: boolean }) {
  const cls =
    'col-start-2 flex gap-1.5 font-sans text-sm text-muted-foreground ' +
    (tight ? '' : 'pt-2 first:pt-0')
  const indent = { paddingLeft: `${(entry.level - 1) * 0.5}rem` }

  if (entry.continued) {
    const inner = entry.marker ? `${entry.marker} ${entry.title}` : entry.title
    return (
      <div className={cls} style={indent}>
        <span>({inner})</span>
      </div>
    )
  }
  return (
    <div className={cls} style={indent}>
      {entry.marker && <span className="shrink-0">{entry.marker}</span>}
      <span>{entry.title}</span>
    </div>
  )
}

type Row =
  | { kind: 'heading'; entry: OutlineEntry; tight: boolean; key: string }
  | { kind: 'verse'; num: number | ''; text: string; hl: boolean; ref: boolean; key: string }

export function ChapterView({
  bookNo,
  chapterNo,
  highlightStart,
  highlightEnd,
  leftAction,
  rightAction,
}: {
  bookNo: number
  chapterNo: number
  highlightStart?: number
  highlightEnd?: number
  leftAction?: ReactNode
  rightAction?: ReactNode
}) {
  const { data, error } = useBible()
  const { data: outline } = useOutline()
  const book = BOOK_BY_NO.get(bookNo)
  const firstHighlightRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!data || highlightStart == null) return
    firstHighlightRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [data, bookNo, chapterNo, highlightStart])

  if (error) {
    return <p className="p-8 text-sm text-destructive">資料載入失敗：{error}</p>
  }
  if (!data) {
    return <p className="p-8 text-sm text-muted-foreground">載入中…</p>
  }
  if (!book) {
    return <p className="p-8 text-sm text-muted-foreground">找不到書卷</p>
  }

  const chapter = findChapter(data, bookNo, chapterNo)
  const outlineMap = chapterOutlineByAnchor(outline, bookNo, chapterNo)

  const rows: Row[] = []
  if (chapter) {
    for (const v of chapter.verses) {
      const hl =
        highlightStart != null &&
        highlightEnd != null &&
        v.verse >= highlightStart &&
        v.verse <= highlightEnd
      const isFirst = hl && v.verse === highlightStart
      const headingsAt = (seg: number) => outlineMap.get(`${v.verse}:${seg}`) ?? []
      const segCount = v.segments?.length ?? 1
      const anyMid =
        segCount > 1 &&
        Array.from({ length: segCount }, (_, s) => s).some((s) => s > 0 && headingsAt(s).length > 0)

      const pushHeading = (e: OutlineEntry, key: string) =>
        rows.push({
          kind: 'heading',
          entry: e,
          tight: rows[rows.length - 1]?.kind === 'heading',
          key,
        })

      if (anyMid && v.segments) {
        v.segments.forEach((segText, s) => {
          headingsAt(s).forEach((e, i) => pushHeading(e, `h${v.verse}-${s}-${i}`))
          rows.push({
            kind: 'verse',
            num: s === 0 && v.verse !== 0 ? v.verse : '',
            text: segText,
            hl,
            ref: isFirst && s === 0,
            key: `v${v.verse}-${s}`,
          })
        })
      } else {
        headingsAt(0).forEach((e, i) => pushHeading(e, `h${v.verse}-${i}`))
        rows.push({
          kind: 'verse',
          num: v.verse === 0 ? '' : v.verse,
          text: v.text,
          hl,
          ref: isFirst,
          key: `v${v.verse}`,
        })
      }
    }
  }

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-8 py-3">
          <div className="flex w-9 justify-start">{leftAction}</div>
          <h1 className="text-lg font-medium tracking-tight">
            {book.name}{' '}
            <span className="text-muted-foreground">
              第{toChineseNumber(chapterNo)}{chapterUnit(bookNo)}
            </span>
          </h1>
          <div className="flex w-9 justify-end">{rightAction}</div>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-8 py-10">
        {chapter ? (
        <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-2.5 font-serif text-base leading-relaxed">
          {rows.map((r) =>
            r.kind === 'heading' ? (
              <OutlineHeading key={r.key} entry={r.entry} tight={r.tight} />
            ) : (
              <Fragment key={r.key}>
                <span
                  ref={r.ref ? firstHighlightRef : undefined}
                  className="pt-1 text-right text-xs font-sans text-muted-foreground"
                >
                  {r.num}
                </span>
                <p className={r.hl ? 'rounded bg-yellow-400/25 px-1 -mx-1' : undefined}>
                  {r.text}
                </p>
              </Fragment>
            ),
          )}
        </div>
        ) : (
          <div className="rounded-md border border-dashed border-border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
            {book.name} 第 {chapterNo} 章 — 資料尚未爬取
          </div>
        )}
      </article>
    </>
  )
}
