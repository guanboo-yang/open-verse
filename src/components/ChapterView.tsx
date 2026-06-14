import { Fragment, useEffect, useRef, type ReactNode } from 'react'
import { useBible, findChapter } from '@/data/loadBible'
import { BOOK_BY_NO } from '@/data/canon'
import { toChineseNumber, chapterUnit } from '@/lib/chinese'

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
          {chapter.verses.map((v) => {
            const highlighted =
              highlightStart != null &&
              highlightEnd != null &&
              v.verse >= highlightStart &&
              v.verse <= highlightEnd
            const isFirst = highlighted && v.verse === highlightStart
            return (
              <Fragment key={v.verse}>
                <span
                  ref={isFirst ? firstHighlightRef : undefined}
                  className="pt-1 text-right text-xs font-sans text-muted-foreground"
                >
                  {v.verse === 0 ? '' : v.verse}
                </span>
                <p className={highlighted ? 'rounded bg-yellow-400/25 px-1 -mx-1' : undefined}>
                  {v.text}
                </p>
              </Fragment>
            )
          })}
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
