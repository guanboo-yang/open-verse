import { createFileRoute, notFound, Link } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { BOOK_BY_NO } from '@/data/canon'
import { ChapterView } from '@/components/ChapterView'
import { cn } from '@/lib/utils'

interface ChapterSearch {
  hl?: string
}

export const Route = createFileRoute('/$bookNo/$chapterNo')({
  validateSearch: (search: Record<string, unknown>): ChapterSearch => ({
    hl: typeof search.hl === 'string' ? search.hl : undefined,
  }),
  parseParams: (raw) => ({
    bookNo: Number(raw.bookNo),
    chapterNo: Number(raw.chapterNo),
  }),
  stringifyParams: (p) => ({
    bookNo: String(p.bookNo),
    chapterNo: String(p.chapterNo),
  }),
  loader: ({ params }) => {
    const book = BOOK_BY_NO.get(params.bookNo)
    if (!book) throw notFound()
    if (params.chapterNo < 1 || params.chapterNo > book.chapterCount) throw notFound()
    return { book }
  },
  component: ChapterPage,
})

function ArrowLink({
  target,
  children,
}: {
  target: { bookNo: number; chapterNo: number } | null
  children: React.ReactNode
}) {
  const cls = cn(
    'inline-flex size-9 items-center justify-center rounded-md transition-colors',
    target
      ? 'text-muted-foreground hover:bg-muted hover:text-foreground'
      : 'text-muted-foreground/40 pointer-events-none',
  )
  if (!target) return <span className={cls}>{children}</span>
  return (
    <Link to="/$bookNo/$chapterNo" params={target} search={{}} className={cls}>
      {children}
    </Link>
  )
}

function parseHighlight(hl: string | undefined): { start?: number; end?: number } {
  if (!hl) return {}
  const m = hl.match(/^(\d+)(?:-(\d+))?$/)
  if (!m) return {}
  const start = Number(m[1])
  const end = m[2] ? Number(m[2]) : start
  return { start, end }
}

function ChapterPage() {
  const { bookNo, chapterNo } = Route.useParams()
  const { hl } = Route.useSearch()
  const { book } = Route.useLoaderData()

  const prevCh = chapterNo > 1 ? chapterNo - 1 : null
  const nextCh = chapterNo < book.chapterCount ? chapterNo + 1 : null
  const { start, end } = parseHighlight(hl)

  return (
    <ChapterView
      bookNo={bookNo}
      chapterNo={chapterNo}
      highlightStart={start}
      highlightEnd={end}
      leftAction={
        <ArrowLink target={prevCh ? { bookNo, chapterNo: prevCh } : null}>
          <ChevronLeft className="size-4" />
        </ArrowLink>
      }
      rightAction={
        <ArrowLink target={nextCh ? { bookNo, chapterNo: nextCh } : null}>
          <ChevronRight className="size-4" />
        </ArrowLink>
      }
    />
  )
}
