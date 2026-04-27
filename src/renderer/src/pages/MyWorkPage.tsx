import { useQuery } from '@tanstack/react-query'
import { IPC } from '@shared/ipc-channels'
import { MergeRequest, Pipeline } from '@shared/types'
import { invoke } from '../lib/ipc'
import { useAccountStore } from '../store/account'
import { useTabsStore } from '../store/tabs'
import { formatRelativeTime, cn } from '../lib/utils'
import { Loader2, GitPullRequest, GitBranch, CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react'

interface MyWorkData {
  needsReview: MergeRequest[]
  assignedToMe: MergeRequest[]
  myOpenMRs: MergeRequest[]
  myPipelines: Pipeline[]
}

function PipelineStatusIcon({ status }: { status: string }): JSX.Element {
  const map: Record<string, { icon: React.ReactNode; className: string }> = {
    success: { icon: <CheckCircle2 size={14} />, className: 'text-status-success' },
    failed: { icon: <XCircle size={14} />, className: 'text-status-failed' },
    running: { icon: <Loader2 size={14} className="animate-spin" />, className: 'text-status-running' },
    pending: { icon: <Clock size={14} />, className: 'text-status-pending' },
    canceled: { icon: <XCircle size={14} />, className: 'text-neutral-500' }
  }
  const entry = map[status] ?? { icon: <AlertCircle size={14} />, className: 'text-neutral-500' }
  return <span className={entry.className}>{entry.icon}</span>
}

function MRRow({ mr, onOpen }: { mr: MergeRequest; onOpen: (mr: MergeRequest, newTab: boolean) => void }): JSX.Element {
  return (
    <button
      onClick={(e) => onOpen(mr, e.metaKey || e.ctrlKey)}
      className="flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-white/5"
    >
      <GitPullRequest size={14} className="mt-0.5 flex-shrink-0 text-accent-400" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-neutral-200">{mr.title}</p>
        <p className="mt-0.5 text-xs text-neutral-500">
          {mr.repoFullPath} · !{mr.iid} · {formatRelativeTime(mr.updatedAt)}
        </p>
      </div>
      {mr.pipelineStatus && (
        <PipelineStatusIcon status={mr.pipelineStatus} />
      )}
    </button>
  )
}

function Section({
  title,
  count,
  children
}: {
  title: string
  count: number
  children: React.ReactNode
}): JSX.Element {
  return (
    <section className="mb-6">
      <div className="mb-2 flex items-center gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">{title}</h2>
        <span className="rounded-full bg-white/5 px-1.5 py-0.5 text-xs text-neutral-500">{count}</span>
      </div>
      {count === 0 ? (
        <p className="py-2 text-sm text-neutral-600">None</p>
      ) : (
        <div className="space-y-0.5">{children}</div>
      )}
    </section>
  )
}

export function MyWorkPage(): JSX.Element {
  const accountId = useAccountStore((s) => s.activeAccountId)
  const openTab = useTabsStore((s) => s.openTab)

  const { data, isLoading, error } = useQuery<MyWorkData>({
    queryKey: ['my-work', accountId],
    queryFn: () => invoke<MyWorkData>(IPC.MY_WORK.GET, accountId),
    enabled: !!accountId,
    refetchInterval: 60_000
  })

  function openMR(mr: MergeRequest, newTab: boolean): void {
    openTab(
      {
        type: 'mr' as never,
        title: `!${mr.iid} ${mr.title}`,
        icon: '',
        route: `/mr/${mr.repoId}/${mr.iid}`,
        routeState: { repoId: mr.repoId, mrIid: mr.iid }
      },
      { newTab }
    )
  }

  if (!accountId) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-neutral-500">
        <GitBranch size={40} className="opacity-30" />
        <p className="text-sm">Add an account to get started</p>
        <button
          onClick={() =>
            openTab({
              type: 'settings' as never,
              title: 'Settings',
              icon: '',
              route: '/settings',
              routeState: { section: 'accounts' }
            })
          }
          className="rounded-lg bg-accent-500 px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-accent-400"
        >
          Add account
        </button>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-neutral-600">
        <Loader2 size={20} className="animate-spin" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex h-full items-center justify-center text-neutral-500 text-sm">
        Failed to load My Work
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto max-w-3xl px-6 py-6">
        <h1 className="mb-6 text-xl font-semibold text-neutral-100">My Work</h1>

        <Section title="Needs your review" count={data.needsReview.length}>
          {data.needsReview.map((mr) => (
            <MRRow key={mr.id} mr={mr} onOpen={openMR} />
          ))}
        </Section>

        <Section title="Assigned to me" count={data.assignedToMe.length}>
          {data.assignedToMe.map((mr) => (
            <MRRow key={mr.id} mr={mr} onOpen={openMR} />
          ))}
        </Section>

        <Section title="My open MRs" count={data.myOpenMRs.length}>
          {data.myOpenMRs.map((mr) => (
            <MRRow key={mr.id} mr={mr} onOpen={openMR} />
          ))}
        </Section>

        {data.myPipelines.length > 0 && (
          <section className="mb-6">
            <div className="mb-2 flex items-center gap-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Recent pipelines
              </h2>
            </div>
            <div className="space-y-0.5">
              {data.myPipelines.map((p) => (
                <button
                  key={p.id}
                  onClick={(e) =>
                    openTab(
                      {
                        type: 'pipeline' as never,
                        title: `Pipeline #${p.id}`,
                        icon: '',
                        route: `/pipeline/${p.repoId}/${p.id}`,
                        routeState: { repoId: p.repoId, pipelineId: p.id }
                      },
                      { newTab: e.metaKey || e.ctrlKey }
                    )
                  }
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-white/5"
                >
                  <PipelineStatusIcon status={p.status} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-neutral-200">
                      #{p.id} · {p.ref}
                    </p>
                    <p className="mt-0.5 text-xs text-neutral-500">{formatRelativeTime(p.updatedAt)}</p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
