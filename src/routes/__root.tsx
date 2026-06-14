import { Link, Outlet, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  return (
    <>
      <nav className="flex gap-4 p-4 border-b">
        <Link
          to="/"
          activeProps={{ className: 'font-bold' }}
          activeOptions={{ exact: true }}
        >
          Home
        </Link>
      </nav>
      <Outlet />
      <TanStackRouterDevtools position="bottom-right" />
    </>
  )
}
