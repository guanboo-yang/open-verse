import { useState } from 'react'
import { Link, Outlet, createRootRoute, useLocation } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { BookOpen, ChevronDown, LayoutGrid, List, Search } from 'lucide-react'
import { CANON, BOOK_BY_NO, type CanonBook } from '@/data/canon'
import { BOOK_ABBREV } from '@/data/abbrev'
import { LookupPanel } from '@/components/LookupPanel'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useLocalStorage } from '@/lib/useLocalStorage'
import { cn } from '@/lib/utils'

export const Route = createRootRoute({
  component: RootComponent,
})

type BookView = 'list' | 'grid'
type SidebarMode = 'catalog' | 'lookup'

function RootComponent() {
  const { pathname } = useLocation()
  const match = pathname.match(/^\/(\d+)(?:\/(\d+))?/)
  const activeBookNo = match ? Number(match[1]) : null
  const activeChapterNo = match && match[2] ? Number(match[2]) : null
  const activeBook = activeBookNo ? BOOK_BY_NO.get(activeBookNo) ?? null : null

  const [mode, setMode] = useLocalStorage<SidebarMode>('open-verse/sidebar-mode', 'catalog')
  const [bookView, setBookView] = useLocalStorage<BookView>('open-verse/book-view', 'grid')
  const [booksOpen, setBooksOpen] = useState(false)
  // Book whose chapters are shown for picking — defaults to the book in the URL,
  // but selecting a book in the list only changes this (no navigation until a
  // chapter is chosen).
  const [pickedBookNo, setPickedBookNo] = useState<number | null>(null)
  const catalogBook = (pickedBookNo ? BOOK_BY_NO.get(pickedBookNo) : null) ?? activeBook
  const otBooks = CANON.filter((b) => b.testament === 'OT')
  const ntBooks = CANON.filter((b) => b.testament === 'NT')

  const pickBook = (bookNo: number) => {
    setPickedBookNo(bookNo)
    setBooksOpen(false)
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {/* Nav rail */}
      <nav className="flex w-12 shrink-0 flex-col items-center gap-1 border-r border-border bg-card p-1.5">
        <NavButton active={mode === 'catalog'} label="目錄" onClick={() => setMode('catalog')}>
          <BookOpen className="size-4" />
        </NavButton>
        <NavButton active={mode === 'lookup'} label="查詢" onClick={() => setMode('lookup')}>
          <Search className="size-4" />
        </NavButton>
      </nav>

      {mode === 'lookup' ? (
        <aside className="w-[426px] shrink-0 overflow-hidden border-r border-border bg-card">
          <LookupPanel />
        </aside>
      ) : (
        <aside className="flex w-[213px] shrink-0 flex-col border-r border-border bg-card">
          {/* Book selector header — toggles the book list open/closed */}
          <button
            type="button"
            onClick={() => setBooksOpen((o) => !o)}
            className="sticky top-0 z-10 flex h-12 shrink-0 items-center justify-between gap-2 border-b border-border bg-muted/80 px-4 text-sm font-semibold backdrop-blur transition-colors hover:bg-muted"
          >
            <span className="truncate">{catalogBook?.name ?? '選擇書卷'}</span>
            <ChevronDown
              className={cn('size-4 shrink-0 text-muted-foreground transition-transform', booksOpen && 'rotate-180')}
            />
          </button>

          {booksOpen ? (
            <div className="overflow-y-auto">
              <StickyHeader action={<ViewToggle view={bookView} onChange={setBookView} />}>
                舊約
              </StickyHeader>
              <BookSection books={otBooks} activeBookNo={catalogBook?.bookNo ?? null} view={bookView} onPick={pickBook} />
              <StickyHeader>新約</StickyHeader>
              <BookSection books={ntBooks} activeBookNo={catalogBook?.bookNo ?? null} view={bookView} onPick={pickBook} />
            </div>
          ) : catalogBook ? (
            <div className="overflow-y-auto p-2">
              <div className="grid grid-cols-5 gap-1">
                {Array.from({ length: catalogBook.chapterCount }, (_, i) => i + 1).map((ch) => (
                  <Link
                    key={ch}
                    to="/$bookNo/$chapterNo"
                    params={{ bookNo: catalogBook.bookNo, chapterNo: ch }}
                    search={{}}
                    className={cn(
                      'flex aspect-square items-center justify-center rounded-md text-sm transition-colors',
                      catalogBook.bookNo === activeBookNo && activeChapterNo === ch
                        ? 'bg-secondary text-secondary-foreground font-medium'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                  >
                    {ch}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </aside>
      )}

      {/* Main */}
      <main className="flex-1 overflow-y-auto" data-scroll-restoration-id="main">
        <Outlet />
      </main>

      <TanStackRouterDevtools position="bottom-right" />
    </div>
  )
}

function NavButton({
  active,
  label,
  onClick,
  children,
}: {
  active: boolean
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        'inline-flex size-9 items-center justify-center rounded-md transition-colors',
        active
          ? 'bg-secondary text-secondary-foreground'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}

function StickyHeader({
  children,
  action,
}: {
  children: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <h2 className="sticky top-0 z-10 flex h-12 items-center justify-between border-b border-border bg-muted/80 px-4 text-sm font-semibold backdrop-blur">
      <span>{children}</span>
      {action}
    </h2>
  )
}

function ViewToggle({
  view,
  onChange,
}: {
  view: BookView
  onChange: (v: BookView) => void
}) {
  const next: BookView = view === 'list' ? 'grid' : 'list'
  const Icon = view === 'list' ? LayoutGrid : List
  return (
    <button
      type="button"
      onClick={() => onChange(next)}
      aria-label={`切換為${next === 'list' ? '列表' : '網格'}`}
      className="-mr-1.5 inline-flex size-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      <Icon className="size-3.5" />
    </button>
  )
}

function BookSection({
  books,
  activeBookNo,
  view,
  onPick,
}: {
  books: CanonBook[]
  activeBookNo: number | null
  view: BookView
  onPick: (bookNo: number) => void
}) {
  if (view === 'grid') {
    return (
      <TooltipProvider delay={0}>
        <div className="p-2">
          <div className="grid grid-cols-5 gap-1">
            {books.map((b) => (
              <BookGridCell key={b.bookNo} book={b} active={activeBookNo === b.bookNo} onPick={onPick} />
            ))}
          </div>
        </div>
      </TooltipProvider>
    )
  }
  return (
    <div className="flex flex-col gap-1 px-2 pt-3 pb-3">
      {books.map((b) => (
        <BookLink key={b.bookNo} bookNo={b.bookNo} name={b.name} active={activeBookNo === b.bookNo} onPick={onPick} />
      ))}
    </div>
  )
}

function BookLink({
  bookNo,
  name,
  active,
  onPick,
}: {
  bookNo: number
  name: string
  active: boolean
  onPick: (bookNo: number) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onPick(bookNo)}
      className={cn(
        'block w-full rounded-md px-2.5 py-1.5 text-left text-sm transition-colors',
        active
          ? 'bg-secondary text-secondary-foreground font-medium'
          : 'text-foreground/80 hover:bg-muted hover:text-foreground',
      )}
    >
      {name}
    </button>
  )
}

function BookGridCell({
  book,
  active,
  onPick,
}: {
  book: CanonBook
  active: boolean
  onPick: (bookNo: number) => void
}) {
  const abbrev = BOOK_ABBREV[book.bookNo] ?? book.name.slice(0, 1)
  return (
    <Tooltip disableHoverablePopup>
      <TooltipTrigger
        render={
          <button
            type="button"
            onClick={() => onPick(book.bookNo)}
            className={cn(
              'flex aspect-square items-center justify-center rounded-md text-sm transition-colors',
              active
                ? 'bg-secondary text-secondary-foreground font-medium'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          />
        }
      >
        {abbrev}
      </TooltipTrigger>
      <TooltipContent>{book.name}</TooltipContent>
    </Tooltip>
  )
}
