import { useEffect, useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { IPC } from '@shared/ipc-channels'
import { Job, Artifact } from '@shared/types'
import { invoke, on } from '../lib/ipc'
import { useAccountStore } from '../store/account'
import { cn, formatRelativeTime, formatDuration, formatBytes } from '../lib/utils'
import { parseAnsi } from '../lib/ansi'
import { Loader2, PlayCircle, XCircle, Download, FileArchive } from 'lucide-react'

interface JobPageProps {
  repoId: number
  jobId: number
}

export function JobPage({ repoId, jobId }: JobPageProps): JSX.Element {
  const accountId = useAccountStore((s) => s.activeAccountId)
  const qc = useQueryClient()
  const [log, setLog] = useState('')
  const [progress, setProgress] = useState<Record<number, number>>({})

  const { data: job, isLoading } = useQuery<Job>({
    queryKey: ['job', accountId, repoId, jobId],
    queryFn: () => invoke<Job>(IPC.JOB.GET, { repoId, jobId }),
    enabled: !!accountId
  })

  const { data: artifacts } = useQuery<Artifact[]>({
    queryKey: ['job-artifacts', accountId, repoId, jobId],
    queryFn: () => invoke<Artifact[]>(IPC.JOB.LIST_ARTIFACTS, { repoId, jobId }),
    enabled: !!accountId
  })

  const retryMutation = useMutation({
    mutationFn: () => invoke<Job>(IPC.JOB.RETRY, { repoId, jobId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['job', accountId, repoId, jobId] })
  })

  const cancelMutation = useMutation({
    mutationFn: () => invoke<Job>(IPC.JOB.CANCEL, { repoId, jobId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['job', accountId, repoId, jobId] })
  })

  const downloadMutation = useMutation({
    mutationFn: (artifact: Artifact) =>
      invoke<void>(IPC.JOB.DOWNLOAD_ARTIFACT, {
        repoId,
        jobId,
        artifactId: artifact.id,
        filename: artifact.filename
      })
  })

  // Subscribe to job log stream events
  useEffect(() => {
    const unsubChunk = on(IPC.JOB.LOG_CHUNK, (payload) => {
      const p = payload as { jobId: number; chunk: string }
      if (p.jobId === jobId) {
        setLog((prev) => prev + p.chunk)
      }
    })

    const unsubDone = on(IPC.JOB.LOG_DONE, (payload) => {
      const p = payload as { jobId: number }
      if (p.jobId === jobId) {
        // no-op; could set a flag if needed
      }
    })

    const unsubProgress = on(IPC.JOB.ARTIFACT_PROGRESS, (payload) => {
      const p = payload as { jobId: number; artifactId: number; percent: number }
      if (p.jobId === jobId) {
        setProgress((prev) => ({ ...prev, [p.artifactId]: p.percent }))
      }
    })

    // Start streaming on mount
    invoke<void>(IPC.JOB.STREAM_LOG, { repoId, jobId }).catch(console.error)

    return () => {
      unsubChunk()
      unsubDone()
      unsubProgress()
    }
  }, [repoId, jobId])

  if (isLoading || !job) {
    return (
      <div className="flex h-full items-center justify-center text-neutral-600">
        <Loader2 size={20} className="animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Main log area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex flex-shrink-0 items-start gap-3 border-b border-white/5 px-6 py-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-semibold text-neutral-100">{job.name}</h1>
            <p className="mt-1 text-xs text-neutral-500">
              Stage: {job.stage} · #{job.id} · updated {formatRelativeTime(job.createdAt)}
            </p>
          </div>
          <span
            className={cn(
              'rounded px-2 py-1 text-xs font-medium',
              job.status === 'success' && 'bg-status-success/15 text-status-success',
              job.status === 'failed' && 'bg-status-failed/15 text-status-failed',
              job.status === 'running' && 'bg-status-running/15 text-status-running',
              job.status === 'pending' && 'bg-status-pending/15 text-status-pending'
            )}
          >
            {job.status}
          </span>
          <button
            onClick={() => retryMutation.mutate()}
            className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-neutral-300 hover:bg-white/5"
          >
            Retry
          </button>
          {(job.status === 'running' || job.status === 'pending') && (
            <button
              onClick={() => cancelMutation.mutate()}
              className="rounded-lg border border-status-failed/30 px-3 py-1.5 text-sm text-status-failed hover:bg-status-failed/10"
            >
              Cancel
            </button>
          )}
        </div>

        <div className="flex-1 overflow-auto bg-[#0b0f14] px-4 py-3 font-mono text-xs leading-relaxed">
          {log.length === 0 ? (
            <p className="text-neutral-600">Waiting for log stream…</p>
          ) : (
            <AnsiLog text={log} />
          )}
        </div>
      </div>

      {/* Right sidebar */}
      <aside className="w-[280px] flex-shrink-0 overflow-auto border-l border-white/5 bg-base-900 px-4 py-4">
        <section className="mb-6">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">Details</h2>
          <div className="space-y-1 text-sm">
            <DetailRow label="Status" value={job.status} />
            <DetailRow label="Stage" value={job.stage} />
            <DetailRow label="Duration" value={formatDuration(job.duration)} />
            <DetailRow label="Allow failure" value={job.allowFailure ? 'Yes' : 'No'} />
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">Artifacts</h2>
          <div className="space-y-2">
            {(artifacts ?? []).map((artifact) => (
              <div key={artifact.id} className="rounded-lg border border-white/10 p-2.5">
                <div className="flex items-start gap-2">
                  <FileArchive size={14} className="mt-0.5 flex-shrink-0 text-neutral-500" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-neutral-300">{artifact.filename}</p>
                    <p className="text-xs text-neutral-600">{formatBytes(artifact.size)}</p>
                  </div>
                  <button
                    onClick={() => downloadMutation.mutate(artifact)}
                    className="rounded p-1 text-neutral-500 hover:bg-white/5 hover:text-neutral-300"
                    title="Download artifact"
                  >
                    <Download size={13} />
                  </button>
                </div>
                {progress[artifact.id] != null && progress[artifact.id] < 100 && (
                  <div className="mt-2 h-1 overflow-hidden rounded bg-white/10">
                    <div
                      className="h-full bg-accent-500 transition-all"
                      style={{ width: `${progress[artifact.id]}%` }}
                    />
                  </div>
                )}
              </div>
            ))}
            {(artifacts ?? []).length === 0 && (
              <p className="text-sm text-neutral-600">No artifacts</p>
            )}
          </div>
        </section>
      </aside>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="flex items-center justify-between rounded bg-white/5 px-2 py-1.5">
      <span className="text-neutral-500">{label}</span>
      <span className="text-neutral-300">{value}</span>
    </div>
  )
}

function AnsiLog({ text }: { text: string }): JSX.Element {
  const segments = useMemo(() => parseAnsi(text), [text])
  return (
    <pre className="whitespace-pre-wrap break-words">
      {segments.map((seg, i) => (
        <span key={i} className={seg.className}>{seg.text}</span>
      ))}
    </pre>
  )
}
