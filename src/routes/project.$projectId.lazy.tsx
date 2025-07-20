import { createLazyFileRoute } from '@tanstack/react-router'

export const Route = createLazyFileRoute('/project/$projectId')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/project/$projectId"!</div>
}
