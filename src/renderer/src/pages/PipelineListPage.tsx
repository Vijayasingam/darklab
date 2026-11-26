import { TypographyH1, TypographyP, TypographySpan } from '../components/ui/typography'
import { Button } from '../components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { IPC } from '@shared/ipc-channels'
import { Pipeline, PipelineStatus } from '@shared/types'
import { invoke } from '../lib/ipc'
import { useAccountStore } from '../store/account'
import { useTabsStore } from '../store/tabs'
import { cn, formatRelativeTime, formatDuration } from '../lib/utils'
import { CircleNotch } from '@phosphor-icons/react'

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

export function PipelineListPage({ filters }: PipelineListPageProps) {
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
          <TypographyH1 className="text-xl font-semibold text-foreground">Pipelines</TypographyH1>

          <Tabs value={status} onValueChange={(v) => setStatus(v as PipelineStatus | 'all')} className="w-auto">
            <TabsList variant="compact">
              {STATUS_OPTIONS.map((opt) => (
                <TabsTrigger key={opt.value} value={opt.value}>
                  {opt.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <CircleNotch size={20} className="animate-spin" />
          </div>
        ) : (
          <div className="space-y-0.5">
            {(pipelines ?? []).map((p) => (
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
                className="flex h-auto w-full items-center gap-3 px-3 py-3 text-left hover:bg-muted/50"
              >
                <TypographySpan
                  className={cn(
                    'w-[72px] flex-shrink-0 text-sm font-medium',
                    p.status === 'success' && 'text-emerald-500',
                    p.status === 'failed' && 'text-destructive',
                    p.status === 'running' && 'text-primary',
                    p.status === 'pending' && 'text-muted-foreground',
                    p.status === 'canceled' && 'text-muted-foreground/70'
                  )}
                >
                  {p.status}
                </TypographySpan>
                <div className="min-w-0 flex-1">
                  <TypographyP className="truncate text-sm text-foreground">
                    #{p.id} · {p.ref}
                  </TypographyP>
                  <TypographyP className="mt-0.5 text-xs text-muted-foreground/70">{p.repoFullPath || `repo:${p.repoId}`}</TypographyP>
                </div>
                <div className="flex-shrink-0 text-right text-xs text-muted-foreground">
                  <TypographyP>{formatDuration(p.duration)}</TypographyP>
                  <TypographyP>{formatRelativeTime(p.updatedAt)}</TypographyP>
                </div>
              </Button>
            ))}
            {(pipelines ?? []).length === 0 && (
              <TypographyP className="py-8 text-center text-sm text-muted-foreground">No pipelines</TypographyP>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
