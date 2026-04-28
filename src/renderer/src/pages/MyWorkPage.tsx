import { TypographyH1, TypographyH2, TypographyP, TypographySpan } from '../components/ui/typography'
import { Button } from '../components/ui/button'
import { useQuery } from '@tanstack/react-query'
import { IPC } from '@shared/ipc-channels'
import { MergeRequest, Pipeline } from '@shared/types'
import { invoke } from '../lib/ipc'
import { useAccountStore } from '../store/account'
import { useTabsStore } from '../store/tabs'
import { formatRelativeTime } from '../lib/utils'
import { Loader2, GitPullRequest, GitBranch, CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react'

interface MyWorkData {
  needsReview: MergeRequest[]
  assignedToMe: MergeRequest[]
  myOpenMRs: MergeRequest[]
  myPipelines: Pipeline[]
}

function PipelineStatusIcon({ status }: { status: string }) {
  const map: Record<string, { icon: React.ReactNode; className: string }> = {
    success: { icon: <CheckCircle2 size={14} />, className: 'text-status-success' },
    failed: { icon: <XCircle size={14} />, className: 'text-status-failed' },
    running: { icon: <Loader2 size={14} className="animate-spin" />, className: 'text-status-running' },
    pending: { icon: <Clock size={14} />, className: 'text-status-pending' },
    canceled: { icon: <XCircle size={14} />, className: 'text-neutral-500' }
  }
  const entry = map[status] ?? { icon: <AlertCircle size={14} />, className: 'text-neutral-500' }
  return <TypographySpan className={entry.className}>{entry.icon}</TypographySpan>
}

function MRRow({ mr, onOpen }: { mr: MergeRequest; onOpen: (mr: MergeRequest, newTab: boolean) => void }) {
  return (
    <Button
      onClick={(e) => onOpen(mr, e.metaKey || e.ctrlKey)}
      variant="ghost"
      className="flex h-auto w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-white/5"
    >
      <GitPullRequest size={14} className="mt-0.5 flex-shrink-0 text-accent-400" />
      <div className="min-w-0 flex-1">
        <TypographyP className="truncate text-sm text-neutral-200">{mr.title}</TypographyP>
        <TypographyP className="mt-0.5 text-xs text-neutral-500">
          {mr.repoFullPath} · !{mr.iid} · {formatRelativeTime(mr.updatedAt)}
        </TypographyP>
      </div>
      {mr.pipelineStatus && (
        <PipelineStatusIcon status={mr.pipelineStatus} />
      )}
    </Button>
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
}) {
  return (
    <section className="mb-6">
      <div className="mb-2 flex items-center gap-2">
        <TypographyH2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">{title}</TypographyH2>
        <TypographySpan className="rounded-full bg-white/5 px-1.5 py-0.5 text-xs text-neutral-500">{count}</TypographySpan>
      </div>
      {count === 0 ? (
        <TypographyP className="py-2 text-sm text-neutral-600">None</TypographyP>
      ) : (
        <div className="space-y-0.5">{children}</div>
      )}
    </section>
  )
}

export function MyWorkPage() {
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
        <TypographyP className="text-sm">Add an account to get started</TypographyP>
        <Button
          onClick={() =>
            openTab({
              type: 'settings' as never,
              title: 'Settings',
              icon: '',
              route: '/settings',
              routeState: { section: 'accounts' }
            })
          }
          className="px-4 py-2 text-sm font-medium"
        >
          Add account
        </Button>
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
        <TypographyH1 className="mb-6 text-xl font-semibold text-neutral-100">My Work</TypographyH1>

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
              <TypographyH2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Recent pipelines
              </TypographyH2>
            </div>
            <div className="space-y-0.5">
              {data.myPipelines.map((p) => (
                <Button
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
                  variant="ghost"
                  className="flex h-auto w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-white/5"
                >
                  <PipelineStatusIcon status={p.status} />
                  <div className="min-w-0 flex-1">
                    <TypographyP className="truncate text-sm text-neutral-200">
                      #{p.id} · {p.ref}
                    </TypographyP>
                    <TypographyP className="mt-0.5 text-xs text-neutral-500">{formatRelativeTime(p.updatedAt)}</TypographyP>
                  </div>
                </Button>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
