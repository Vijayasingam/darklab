import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { IPC } from '@shared/ipc-channels'
import { Pipeline, PipelineStatus } from '@shared/types'
import { invoke } from '../lib/ipc'
import { useAccountStore } from '../store/account'
import { useTabsStore } from '../store/tabs'
import { cn, formatRelativeTime, formatDuration } from '../lib/utils'
import { Loader2, PlayCircle, XCircle, RefreshCw, Clock } from 'lucide-react'

interface PipelineListPageProps {
  filters?: Record<string, unknown>
}

const STATUS_OPTIONS: { label: string; value: PipelineStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Running', value: 'running' },
  { label: 'Failed', value: 'failed' },
  { label: 'Success', value: 'success' },
  { label: 'Pending', value: 'pending' }
]

export function PipelineListPage({ filters }: PipelineListPageProps): JSX.Element {
  const accountId = useAccountStore((s) => s.activeAccountId)
  const openTab = useTabsStore((s) => s.openTab)
  const [status, setStatus] = useState<PipelineStatus | 'all'>('all')

  const { data: pipelines, isLoading } = useQuery<Pipeline[]>({
    queryKey: ['pipelines', accountId, filters?.repoId, status],
    queryFn: () =>
      invoke<Pipeline[]>(IPC.PIPELINE.LIST, {
        repoId: filters?.repoId as number | undefined,
        status: status === 'all' ? undefined : status,
        perPage: 50
      }),
    enabled: !!accountId
  })

  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto max-w-4xl px-6 py-6">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-neutral-100">Pipelines</h1>

          <div className="flex items-center gap-1 rounded-lg bg-white/5 p-1">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setStatus(opt.value)}
                className={cn(
                  'rounded px-3 py-1 text-sm transition-colors',
                  status === opt.value
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
            {(pipelines ?? []).map((p) => (
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
                className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left hover:bg-white/5"
              >
                <span
                  className={cn(
                    'w-[72px] flex-shrink-0 text-sm font-medium',
                    p.status === 'success' && 'text-status-success',
                    p.status === 'failed' && 'text-status-failed',
                    p.status === 'running' && 'text-status-running',
                    p.status === 'pending' && 'text-status-pending',
                    p.status === 'canceled' && 'text-neutral-500'
                  )}
                >
                  {p.status}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-neutral-200">
                    #{p.id} · {p.ref}
                  </p>
                  <p className="mt-0.5 text-xs text-neutral-500">{p.repoFullPath || `repo:${p.repoId}`}</p>
                </div>
                <div className="flex-shrink-0 text-right text-xs text-neutral-600">
                  <p>{formatDuration(p.duration)}</p>
                  <p>{formatRelativeTime(p.updatedAt)}</p>
                </div>
              </button>
            ))}
            {(pipelines ?? []).length === 0 && (
              <p className="py-8 text-center text-sm text-neutral-600">No pipelines</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
