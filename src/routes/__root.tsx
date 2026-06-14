import { Link, Outlet, createRootRoute, useLocation } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { BookOpen, LayoutGrid, List, Search } from 'lucide-react'
import { CANON, BOOK_BY_NO, type CanonBook } from '@/data/canon'
import { BOOK_ABBREV } from '@/data/abbrev'
import { LookupPanel } from '@/components/LookupPanel'
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
  const otBooks = CANON.filter((b) => b.testament === 'OT')
  const ntBooks = CANON.filter((b) => b.testament === 'NT')

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
        <>
          {/* Layer 1: Books */}
          <aside className="w-[213px] shrink-0 overflow-y-auto border-r border-border bg-card">
            <StickyHeader action={<ViewToggle view={bookView} onChange={setBookView} />}>
              舊約
            </StickyHeader>
            <BookSection books={otBooks} activeBookNo={activeBookNo} view={bookView} />
            <StickyHeader>新約</StickyHeader>
            <BookSection books={ntBooks} activeBookNo={activeBookNo} view={bookView} />
          </aside>

          {/* Layer 2: Chapters */}
          <aside className="w-[213px] shrink-0 overflow-y-auto border-r border-border bg-card">
            {activeBook ? (
              <>
                <StickyHeader>{activeBook.name}</StickyHeader>
                <div className="p-2">
                  <div className="grid grid-cols-5 gap-1">
                    {Array.from({ length: activeBook.chapterCount }, (_, i) => i + 1).map((ch) => (
                      <Link
                        key={ch}
                        to="/$bookNo/$chapterNo"
                        params={{ bookNo: activeBook.bookNo, chapterNo: ch }}
                        search={{}}
                        className={cn(
                          'flex aspect-square items-center justify-center rounded-md text-sm transition-colors',
                          activeChapterNo === ch
                            ? 'bg-secondary text-secondary-foreground font-medium'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                        )}
                      >
                        {ch}
                      </Link>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="p-4 text-sm text-muted-foreground">← 選擇一卷書</div>
            )}
          </aside>
        </>
      )}

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
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
    <h2 className="sticky top-0 z-10 flex h-12 items-center justify-between border-b border-border bg-card/95 px-4 text-sm font-semibold backdrop-blur">
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
}: {
  books: CanonBook[]
  activeBookNo: number | null
  view: BookView
}) {
  if (view === 'grid') {
    return (
      <div className="p-2">
        <div className="grid grid-cols-5 gap-1">
          {books.map((b) => (
            <BookGridCell key={b.bookNo} book={b} active={activeBookNo === b.bookNo} />
          ))}
        </div>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-1 px-2 pt-3 pb-3">
      {books.map((b) => (
        <BookLink key={b.bookNo} bookNo={b.bookNo} name={b.name} active={activeBookNo === b.bookNo} />
      ))}
    </div>
  )
}

function BookLink({ bookNo, name, active }: { bookNo: number; name: string; active: boolean }) {
  return (
    <Link
      to="/$bookNo/$chapterNo"
      params={{ bookNo, chapterNo: 1 }}
      search={{}}
      className={cn(
        'block rounded-md px-2.5 py-1.5 text-sm transition-colors',
        active
          ? 'bg-secondary text-secondary-foreground font-medium'
          : 'text-foreground/80 hover:bg-muted hover:text-foreground',
      )}
    >
      {name}
    </Link>
  )
}

function BookGridCell({ book, active }: { book: CanonBook; active: boolean }) {
  const abbrev = BOOK_ABBREV[book.bookNo] ?? book.name.slice(0, 1)
  return (
    <Link
      to="/$bookNo/$chapterNo"
      params={{ bookNo: book.bookNo, chapterNo: 1 }}
      search={{}}
      title={book.name}
      className={cn(
        'flex aspect-square items-center justify-center rounded-md text-sm transition-colors',
        active
          ? 'bg-secondary text-secondary-foreground font-medium'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      {abbrev}
    </Link>
  )
}
