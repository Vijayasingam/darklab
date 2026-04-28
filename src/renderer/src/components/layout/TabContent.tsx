import { lazy, Suspense } from 'react'
import { useTabsStore } from '../../store/tabs'
import { Skeleton } from '../ui/skeleton'

// Lazy-loaded pages
const MyWorkPage = lazy(() => import('../../pages/MyWorkPage').then((m) => ({ default: m.MyWorkPage })))
const RepoListPage = lazy(() => import('../../pages/RepoListPage').then((m) => ({ default: m.RepoListPage })))
const RepoPage = lazy(() => import('../../pages/RepoPage').then((m) => ({ default: m.RepoPage })))
const MRListPage = lazy(() => import('../../pages/MRListPage').then((m) => ({ default: m.MRListPage })))
const MRPage = lazy(() => import('../../pages/MRPage').then((m) => ({ default: m.MRPage })))
const PipelineListPage = lazy(() => import('../../pages/PipelineListPage').then((m) => ({ default: m.PipelineListPage })))
const PipelinePage = lazy(() => import('../../pages/PipelinePage').then((m) => ({ default: m.PipelinePage })))
const JobPage = lazy(() => import('../../pages/JobPage').then((m) => ({ default: m.JobPage })))
const ActivityPage = lazy(() => import('../../pages/ActivityPage').then((m) => ({ default: m.ActivityPage })))
const SettingsPage = lazy(() => import('../../pages/SettingsPage').then((m) => ({ default: m.SettingsPage })))
const OnboardingPage = lazy(() => import('../../pages/OnboardingPage').then((m) => ({ default: m.OnboardingPage })))

function PageLoader() {
  return (
    <div className="p-6">
      <Skeleton className="mb-3 h-8 w-56 rounded" />
      <Skeleton className="mb-2 h-4 w-96 rounded" />
      <Skeleton className="h-[70vh] w-full rounded-xl" />
    </div>
  )
}

export function TabContent() {
  const tabs = useTabsStore((s) => s.tabs)
  const activeTabId = useTabsStore((s) => s.activeTabId)

  return (
    <div className="relative flex-1 overflow-hidden bg-base-950">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className="absolute inset-0 overflow-auto"
          style={{ display: tab.id === activeTabId ? 'block' : 'none' }}
        >
          <Suspense fallback={<PageLoader />}>
            <RouteView route={tab.route} state={tab.routeState} />
          </Suspense>
        </div>
      ))}
    </div>
  )
}

function RouteView({ route, state }: { route?: string; state: Record<string, unknown> }) {
  if (!route) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-neutral-600">
        No route selected
      </div>
    )
  }

  if (route === '/my-work') return <MyWorkPage />
  if (route === '/repos') return <RepoListPage />
  if (route.startsWith('/repos/')) return <RepoPage repoId={state['repoId'] as number} repoPath={state['repoPath'] as string} />
  if (route === '/merge-requests') return <MRListPage filters={state['filters'] as Record<string, unknown>} />
  if (route.startsWith('/mr/')) return <MRPage repoId={state['repoId'] as number} mrIid={state['mrIid'] as number} />
  if (route === '/pipelines') return <PipelineListPage filters={state['filters'] as Record<string, unknown>} />
  if (route.startsWith('/pipeline/')) return <PipelinePage repoId={state['repoId'] as number} pipelineId={state['pipelineId'] as number} />
  if (route.startsWith('/job/')) return <JobPage repoId={state['repoId'] as number} jobId={state['jobId'] as number} />
  if (route === '/activity') return <ActivityPage repoId={state['repoId'] as number | undefined} />
  if (route === '/settings') return <SettingsPage section={state['section'] as string} />
  if (route === '/onboarding') return <OnboardingPage />
  return (
    <div className="flex h-full items-center justify-center text-neutral-600 text-sm">
      Unknown route: {route}
    </div>
  )
}
