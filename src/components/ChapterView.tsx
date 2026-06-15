import { Fragment, useEffect, useRef, type ReactNode } from 'react'
import { useBible, useOutline, findChapter, chapterOutlineByAnchor } from '@/data/loadBible'
import { BOOK_BY_NO } from '@/data/canon'
import { toChineseNumber, chapterUnit, formatOutlineRange } from '@/lib/chinese'
import type { Mark, OutlineEntry } from '@/types/bible'

// 人名 單底線、地名 雙底線、補字 點底線（音譯 tl 不標）；線用淡色
const MARK_CLASS: Record<string, string> = {
  pn: 'underline decoration-1 decoration-muted-foreground/60 underline-offset-4',
  png: 'underline decoration-double decoration-1 decoration-muted-foreground/60 underline-offset-4',
  add: 'underline decoration-dotted decoration-1 decoration-muted-foreground/60 underline-offset-4',
}

/** Marks overlapping [start, end), re-based to that slice. */
function sliceMarks(marks: Mark[] | undefined, start: number, end: number): Mark[] {
  if (!marks) return []
  const out: Mark[] = []
  for (const m of marks) {
    const s = Math.max(m.s, start)
    const e = Math.min(m.e, end)
    if (e > s) out.push({ k: m.k, s: s - start, e: e - start })
  }
  return out
}

function renderMarkedText(text: string, marks?: Mark[]): ReactNode {
  const ms = (marks ?? [])
    .filter((m) => MARK_CLASS[m.k] && m.e > m.s)
    .sort((a, b) => a.s - b.s)
  if (ms.length === 0) return text
  const out: ReactNode[] = []
  let pos = 0
  ms.forEach((m, i) => {
    if (m.s < pos) return // skip an overlapping mark already covered
    if (m.s > pos) out.push(text.slice(pos, m.s))
    out.push(
      <span key={i} className={MARK_CLASS[m.k]}>
        {text.slice(m.s, m.e)}
      </span>,
    )
    pos = m.e
  })
  if (pos < text.length) out.push(text.slice(pos))
  return out
}

function OutlineHeading({ entry, tight }: { entry: OutlineEntry; tight: boolean }) {
  const cls =
    'col-start-2 flex gap-1.5 font-sans text-sm text-muted-foreground ' +
    (tight ? '' : 'pt-2 first:pt-0')
  const indent = { paddingLeft: `${(entry.level - 1) * 0.5}rem` }

  return (
    <div className={cls} style={indent}>
      {entry.marker && <span className="shrink-0">{entry.marker}</span>}
      <span>
        {entry.title}
        {entry.continued && ' (續)'}
        {entry.range && (
          <span className="ml-1.5 text-muted-foreground/60">{formatOutlineRange(entry.range)}</span>
        )}
      </span>
    </div>
  )
}

type Row =
  | { kind: 'heading'; entry: OutlineEntry; tight: boolean; key: string }
  | {
      kind: 'verse'
      num: number | ''
      text: string
      marks?: Mark[]
      hl: boolean
      ref: boolean
      key: string
    }

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
        let off = 0
        v.segments.forEach((segText, s) => {
          headingsAt(s).forEach((e, i) => pushHeading(e, `h${v.verse}-${s}-${i}`))
          rows.push({
            kind: 'verse',
            num: s === 0 && v.verse !== 0 ? v.verse : '',
            text: segText,
            marks: sliceMarks(v.marks, off, off + segText.length),
            hl,
            ref: isFirst && s === 0,
            key: `v${v.verse}-${s}`,
          })
          off += segText.length
        })
      } else {
        headingsAt(0).forEach((e, i) => pushHeading(e, `h${v.verse}-${i}`))
        rows.push({
          kind: 'verse',
          num: v.verse === 0 ? '' : v.verse,
          text: v.text,
          marks: v.marks,
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
                  {renderMarkedText(r.text, r.marks)}
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
