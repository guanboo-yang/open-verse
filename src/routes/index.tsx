import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: HomeComponent,
})

function HomeComponent() {
  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold">Open Verse</h1>
      <p className="mt-2 text-gray-600">Tailwind + TanStack Router 已就緒。</p>
    </div>
  )
}
