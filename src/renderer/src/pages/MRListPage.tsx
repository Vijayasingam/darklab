import { TypographyH1, TypographyP, TypographySpan } from '../components/ui/typography'
import { Button } from '../components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs'
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

export function MRListPage({ filters }: MRListPageProps) {
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
          <TypographyH1 className="text-xl font-semibold text-neutral-100">Merge Requests</TypographyH1>

          {/* State filter */}
          <Tabs value={state} onValueChange={(v) => setState(v as MRState | 'all')} className="w-auto">
            <TabsList variant="compact">
              {STATE_OPTIONS.map((opt) => (
                <TabsTrigger key={opt.value} value={opt.value} variant="compact">
                  {opt.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-neutral-600">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : (
          <div className="space-y-0.5">
            {(mrs ?? []).map((mr) => (
              <Button
                key={mr.id}
                onClick={(e) => openMR(mr, e.metaKey || e.ctrlKey)}
                variant="ghost"
                className="flex h-auto w-full items-start gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-white/5"
              >
                <GitPullRequest size={15} className="mt-0.5 flex-shrink-0 text-accent-400" />
                <div className="min-w-0 flex-1">
                  <TypographyP className="truncate text-sm text-neutral-200">{mr.title}</TypographyP>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                    <TypographySpan>{mr.repoFullPath} · !{mr.iid}</TypographySpan>
                    <TypographySpan>·</TypographySpan>
                    <TypographySpan className="flex items-center gap-1">
                      <User size={11} />
                      {mr.author.username}
                    </TypographySpan>
                    <TypographySpan>·</TypographySpan>
                    <TypographySpan>{formatRelativeTime(mr.updatedAt)}</TypographySpan>
                    {mr.labels.map((l) => (
                      <TypographySpan
                        key={l.id}
                        className="rounded px-1.5 py-0.5"
                        style={{ background: l.color + '20', color: l.color }}
                      >
                        {l.name}
                      </TypographySpan>
                    ))}
                  </div>
                </div>
                {mr.pipelineStatus && (
                  <TypographySpan
                    className={cn(
                      'flex-shrink-0 text-xs',
                      mr.pipelineStatus === 'success' && 'text-status-success',
                      mr.pipelineStatus === 'failed' && 'text-status-failed',
                      mr.pipelineStatus === 'running' && 'text-status-running'
                    )}
                  >
                    {mr.pipelineStatus}
                  </TypographySpan>
                )}
              </Button>
            ))}
            {(mrs ?? []).length === 0 && (
              <TypographyP className="py-8 text-center text-sm text-neutral-600">No merge requests</TypographyP>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
