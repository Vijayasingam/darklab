import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { IPC } from '@shared/ipc-channels'
import { Pipeline, Stage, TestReport } from '@shared/types'
import { invoke } from '../lib/ipc'
import { useAccountStore } from '../store/account'
import { useTabsStore } from '../store/tabs'
import { cn, formatRelativeTime, formatDuration } from '../lib/utils'
import { Loader2, FlaskConical } from 'lucide-react'

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
      <div className="flex h-full items-center justify-center text-neutral-600">
        <Loader2 size={20} className="animate-spin" />
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto max-w-4xl px-6 py-6">
        {/* Header */}
        <div className="mb-6 flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-semibold text-neutral-100">Pipeline #{pipeline.id}</h1>
            <p className="mt-1 text-sm text-neutral-500">
              {pipeline.ref} · {pipeline.sha.slice(0, 8)} · updated {formatRelativeTime(pipeline.updatedAt)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'rounded px-2 py-1 text-xs font-medium',
                pipeline.status === 'success' && 'bg-status-success/15 text-status-success',
                pipeline.status === 'failed' && 'bg-status-failed/15 text-status-failed',
                pipeline.status === 'running' && 'bg-status-running/15 text-status-running',
                pipeline.status === 'pending' && 'bg-status-pending/15 text-status-pending',
                pipeline.status === 'canceled' && 'bg-white/5 text-neutral-500'
              )}
            >
              {pipeline.status}
            </span>

            <button
              onClick={() => retryMutation.mutate()}
              disabled={retryMutation.isPending}
              className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-neutral-300 hover:bg-white/5 disabled:opacity-50"
            >
              Retry
            </button>

            {(pipeline.status === 'running' || pipeline.status === 'pending') && (
              <button
                onClick={() => cancelMutation.mutate()}
                disabled={cancelMutation.isPending}
                className="rounded-lg border border-status-failed/30 px-3 py-1.5 text-sm text-status-failed hover:bg-status-failed/10 disabled:opacity-50"
              >
                Cancel
              </button>
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
          <section className="mb-6 rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="mb-3 flex items-center gap-2">
              <FlaskConical size={14} className="text-accent-400" />
              <h2 className="text-sm font-medium text-neutral-200">Test report</h2>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-5">
              <Metric label="Total" value={testReport.totalCount} />
              <Metric label="Passed" value={testReport.successCount} className="text-status-success" />
              <Metric label="Failed" value={testReport.failedCount} className="text-status-failed" />
              <Metric label="Skipped" value={testReport.skippedCount} className="text-neutral-400" />
              <Metric label="Errors" value={testReport.errorCount} className="text-status-failed" />
            </div>
          </section>
        )}

        {/* Stages & jobs */}
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">Stages</h2>
          <div className="space-y-3">
            {(stages ?? []).map((stage) => (
              <div key={stage.name} className="rounded-xl border border-white/10 bg-white/5">
                <div className="flex items-center justify-between border-b border-white/5 px-4 py-2.5">
                  <p className="text-sm font-medium text-neutral-200">{stage.name}</p>
                  <span
                    className={cn(
                      'text-xs',
                      stage.status === 'success' && 'text-status-success',
                      stage.status === 'failed' && 'text-status-failed',
                      stage.status === 'running' && 'text-status-running',
                      stage.status === 'pending' && 'text-status-pending'
                    )}
                  >
                    {stage.status}
                  </span>
                </div>
                <div className="divide-y divide-white/5">
                  {stage.jobs.map((job) => (
                    <button
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
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-white/5"
                    >
                      <span
                        className={cn(
                          'w-[64px] flex-shrink-0 text-xs font-medium',
                          job.status === 'success' && 'text-status-success',
                          job.status === 'failed' && 'text-status-failed',
                          job.status === 'running' && 'text-status-running',
                          job.status === 'pending' && 'text-status-pending'
                        )}
                      >
                        {job.status}
                      </span>
                      <span className="flex-1 truncate text-sm text-neutral-300">{job.name}</span>
                      <span className="text-xs text-neutral-600">{formatDuration(job.duration)}</span>
                    </button>
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
    <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2.5">
      <p className="text-xs text-neutral-600">{label}</p>
      <p className="mt-0.5 text-sm text-neutral-200">{value}</p>
    </div>
  )
}

function Metric({ label, value, className }: { label: string; value: number; className?: string }) {
  return (
    <div className="rounded-lg bg-black/20 px-2 py-2 text-center">
      <p className="text-[11px] text-neutral-600">{label}</p>
      <p className={cn('mt-0.5 text-sm font-medium text-neutral-200', className)}>{value}</p>
    </div>
  )
}
