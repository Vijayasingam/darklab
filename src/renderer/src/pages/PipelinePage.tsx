import { TypographyH1, TypographyH2, TypographyP, TypographySpan } from '../components/ui/typography'
import { Button } from '../components/ui/button'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { IPC } from '@shared/ipc-channels'
import { Pipeline, Stage, TestReport } from '@shared/types'
import { invoke } from '../lib/ipc'
import { useAccountStore } from '../store/account'
import { useTabsStore } from '../store/tabs'
import { cn, formatRelativeTime, formatDuration } from '../lib/utils'
import { CircleNotch, Flask } from '@phosphor-icons/react'

interface PipelinePageProps {
  repoId: number
  pipelineId: number
}

export function PipelinePage({ repoId, pipelineId }: PipelinePageProps) {
  const accountId = useAccountStore((s) => s.activeAccountId)
  const openTab = useTabsStore((s) => s.openTab)
  const qc = useQueryClient()

  const { data: pipeline, isLoading } = useQuery<Pipeline>({
    queryKey: ['pipeline', accountId, repoId, pipelineId],
    queryFn: () => invoke<Pipeline>(IPC.PIPELINE.GET, { repoId, pipelineId }),
    enabled: !!accountId
  })

  const { data: stages } = useQuery<Stage[]>({
    queryKey: ['pipeline-stages', accountId, repoId, pipelineId],
    queryFn: () => invoke<Stage[]>(IPC.PIPELINE.GET_STAGES, { repoId, pipelineId }),
    enabled: !!accountId
  })

  const { data: testReport } = useQuery<TestReport | null>({
    queryKey: ['pipeline-test-report', accountId, repoId, pipelineId],
    queryFn: () => invoke<TestReport | null>(IPC.PIPELINE.GET_TEST_REPORT, { repoId, pipelineId }),
    enabled: !!accountId
  })

  const retryMutation = useMutation({
    mutationFn: () => invoke<void>(IPC.PIPELINE.RETRY, { repoId, pipelineId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pipeline', accountId, repoId, pipelineId] })
  })

  const cancelMutation = useMutation({
    mutationFn: () => invoke<void>(IPC.PIPELINE.CANCEL, { repoId, pipelineId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pipeline', accountId, repoId, pipelineId] })
  })

  if (isLoading || !pipeline) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <CircleNotch size={20} className="animate-spin" />
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto max-w-4xl px-6 py-6">
        {/* Header */}
        <div className="mb-6 flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <TypographyH1 className="text-xl font-semibold text-foreground">Pipeline #{pipeline.id}</TypographyH1>
            <TypographyP className="mt-1 text-sm text-muted-foreground/70">
              {pipeline.ref} · {pipeline.sha.slice(0, 8)} · updated {formatRelativeTime(pipeline.updatedAt)}
            </TypographyP>
          </div>
          <div className="flex items-center gap-2">
            <TypographySpan
              className={cn(
                'px-2 py-1 text-xs font-medium',
                pipeline.status === 'success' && 'bg-emerald-500/15 text-emerald-500',
                pipeline.status === 'failed' && 'bg-destructive/15 text-destructive',
                pipeline.status === 'running' && 'bg-primary/15 text-primary',
                pipeline.status === 'pending' && 'bg-muted text-muted-foreground',
                pipeline.status === 'canceled' && 'bg-muted text-muted-foreground/70'
              )}
            >
              {pipeline.status}
            </TypographySpan>

            <Button
              onClick={() => retryMutation.mutate()}
              disabled={retryMutation.isPending}
              variant="outline"
            >
              Retry
            </Button>

            {(pipeline.status === 'running' || pipeline.status === 'pending') && (
              <Button
                onClick={() => cancelMutation.mutate()}
                disabled={cancelMutation.isPending}
                variant="destructive"
              >
                Cancel
              </Button>
            )}
          </div>
        </div>

        {/* Summary */}
        <div className="mb-6 grid gap-3 sm:grid-cols-4">
          <StatCard label="Duration" value={formatDuration(pipeline.duration)} />
          <StatCard label="Coverage" value={pipeline.coverage != null ? `${pipeline.coverage}%` : '—'} />
          <StatCard label="Source" value={pipeline.source} />
          <StatCard label="Status" value={pipeline.status} />
        </div>

        {/* Test report */}
        {testReport && (
          <section className="mb-6 border border-border bg-muted p-4">
            <div className="mb-3 flex items-center gap-2">
              <Flask size={14} className="text-primary" />
              <TypographyH2 className="text-sm font-medium text-foreground">Test report</TypographyH2>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-5">
              <Metric label="Total" value={testReport.totalCount} />
              <Metric label="Passed" value={testReport.successCount} className="text-emerald-500" />
              <Metric label="Failed" value={testReport.failedCount} className="text-destructive" />
              <Metric label="Skipped" value={testReport.skippedCount} className="text-muted-foreground" />
              <Metric label="Errors" value={testReport.errorCount} className="text-destructive" />
            </div>
          </section>
        )}

        {/* Stages & jobs */}
        <section>
          <TypographyH2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Stages</TypographyH2>
          <div className="space-y-3">
            {(stages ?? []).map((stage) => (
              <div key={stage.name} className="border border-border bg-muted">
                <div className="flex items-center justify-between border-b border-border/50 px-4 py-2.5">
                  <TypographyP className="text-sm font-medium text-foreground">{stage.name}</TypographyP>
                  <TypographySpan
                    className={cn(
                      'text-xs',
                      stage.status === 'success' && 'text-emerald-500',
                      stage.status === 'failed' && 'text-destructive',
                      stage.status === 'running' && 'text-primary',
                      stage.status === 'pending' && 'text-muted-foreground'
                    )}
                  >
                    {stage.status}
                  </TypographySpan>
                </div>
                <div className="divide-y divide-border/50">
                  {stage.jobs.map((job) => (
                    <Button
                      key={job.id}
                      onClick={(e) =>
                        openTab(
                          {
                            type: 'job' as never,
                            title: job.name,
                            icon: '',
                            route: `/job/${job.repoId}/${job.id}`,
                            routeState: { repoId: job.repoId, jobId: job.id }
                          },
                          { newTab: e.metaKey || e.ctrlKey }
                        )
                      }
                      variant="ghost"
                      className="flex h-auto w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-muted/50"
                    >
                      <TypographySpan
                        className={cn(
                          'w-[64px] flex-shrink-0 text-xs font-medium',
                          job.status === 'success' && 'text-emerald-500',
                          job.status === 'failed' && 'text-destructive',
                          job.status === 'running' && 'text-primary',
                          job.status === 'pending' && 'text-muted-foreground'
                        )}
                      >
                        {job.status}
                      </TypographySpan>
                      <TypographySpan className="flex-1 truncate text-sm text-muted-foreground">{job.name}</TypographySpan>
                      <TypographySpan className="text-xs text-muted-foreground">{formatDuration(job.duration)}</TypographySpan>
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-border bg-muted px-3 py-2.5">
      <TypographyP className="text-xs text-muted-foreground">{label}</TypographyP>
      <TypographyP className="mt-0.5 text-sm text-foreground">{value}</TypographyP>
    </div>
  )
}

function Metric({ label, value, className }: { label: string; value: number; className?: string }) {
  return (
    <div className="bg-black/20 px-2 py-2 text-center">
      <TypographyP className="text-[11px] text-muted-foreground">{label}</TypographyP>
      <TypographyP className={cn('mt-0.5 text-sm font-medium text-foreground', className)}>{value}</TypographyP>
    </div>
  )
}
