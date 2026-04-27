import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { IPC } from '@shared/ipc-channels'
import { MergeRequest, MRState } from '@shared/types'
import { invoke } from '../lib/ipc'
import { useAccountStore } from '../store/account'
import { useTabsStore } from '../store/tabs'
import { cn, formatRelativeTime } from '../lib/utils'
import { Loader2, GitPullRequest, User } from 'lucide-react'

interface MRListPageProps {
  filters?: Record<string, unknown>
}

const STATE_OPTIONS: { label: string; value: MRState | 'all' }[] = [
  { label: 'Open', value: 'opened' },
  { label: 'Merged', value: 'merged' },
  { label: 'Closed', value: 'closed' },
  { label: 'All', value: 'all' }
]

export function MRListPage({ filters }: MRListPageProps): JSX.Element {
  const accountId = useAccountStore((s) => s.activeAccountId)
  const openTab = useTabsStore((s) => s.openTab)
  const [state, setState] = useState<MRState | 'all'>('opened')

  const { data: mrs, isLoading } = useQuery<MergeRequest[]>({
    queryKey: ['mrs', accountId, filters?.repoId, state],
    queryFn: () =>
      invoke<MergeRequest[]>(IPC.MR.LIST, {
        repoId: filters?.repoId as number | undefined,
        state: state === 'all' ? undefined : state,
        perPage: 50
      }),
    enabled: !!accountId
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

  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto max-w-4xl px-6 py-6">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-neutral-100">Merge Requests</h1>

          {/* State filter */}
          <div className="flex items-center gap-1 rounded-lg bg-white/5 p-1">
            {STATE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setState(opt.value)}
                className={cn(
                  'rounded px-3 py-1 text-sm transition-colors',
                  state === opt.value
                    ? 'bg-white/10 text-neutral-100'
                    : 'text-neutral-500 hover:text-neutral-300'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-neutral-600">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : (
          <div className="space-y-0.5">
            {(mrs ?? []).map((mr) => (
              <button
                key={mr.id}
                onClick={(e) => openMR(mr, e.metaKey || e.ctrlKey)}
                className="flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-white/5"
              >
                <GitPullRequest size={15} className="mt-0.5 flex-shrink-0 text-accent-400" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-neutral-200">{mr.title}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                    <span>{mr.repoFullPath} · !{mr.iid}</span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <User size={11} />
                      {mr.author.username}
                    </span>
                    <span>·</span>
                    <span>{formatRelativeTime(mr.updatedAt)}</span>
                    {mr.labels.map((l) => (
                      <span
                        key={l.id}
                        className="rounded px-1.5 py-0.5"
                        style={{ background: l.color + '20', color: l.color }}
                      >
                        {l.name}
                      </span>
                    ))}
                  </div>
                </div>
                {mr.pipelineStatus && (
                  <span
                    className={cn(
                      'flex-shrink-0 text-xs',
                      mr.pipelineStatus === 'success' && 'text-status-success',
                      mr.pipelineStatus === 'failed' && 'text-status-failed',
                      mr.pipelineStatus === 'running' && 'text-status-running'
                    )}
                  >
                    {mr.pipelineStatus}
                  </span>
                )}
              </button>
            ))}
            {(mrs ?? []).length === 0 && (
              <p className="py-8 text-center text-sm text-neutral-600">No merge requests</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
