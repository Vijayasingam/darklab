import { TypographyH1, TypographyH2, TypographyP, TypographySpan } from '../components/ui/typography'
import { Button } from '../components/ui/button'
import { useEffect, useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { IPC } from '@shared/ipc-channels'
import { Job, Artifact } from '@shared/types'
import { invoke, on } from '../lib/ipc'
import { useAccountStore } from '../store/account'
import { cn, formatRelativeTime, formatDuration, formatBytes } from '../lib/utils'
import { parseAnsi } from '../lib/ansi'
import { CircleNotch, Download, FileArchive } from '@phosphor-icons/react'

interface JobPageProps {
  repoId: number
  jobId: number
}

export function JobPage({ repoId, jobId }: JobPageProps) {
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
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <CircleNotch size={20} className="animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Main log area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex flex-shrink-0 items-start gap-3 border-b border-border/50 px-6 py-4">
          <div className="min-w-0 flex-1">
            <TypographyH1 className="text-lg font-semibold text-foreground">{job.name}</TypographyH1>
            <TypographyP className="mt-1 text-xs text-muted-foreground/70">
              Stage: {job.stage} · #{job.id} · updated {formatRelativeTime(job.createdAt)}
            </TypographyP>
          </div>
          <TypographySpan
            className={cn(
              'px-2 py-1 text-xs font-medium',
              job.status === 'success' && 'bg-emerald-500/15 text-emerald-500',
              job.status === 'failed' && 'bg-destructive/15 text-destructive',
              job.status === 'running' && 'bg-primary/15 text-primary',
              job.status === 'pending' && 'bg-muted text-muted-foreground'
            )}
          >
            {job.status}
          </TypographySpan>
          <Button
            onClick={() => retryMutation.mutate()}
            variant="outline"
          >
            Retry
          </Button>
          {(job.status === 'running' || job.status === 'pending') && (
            <Button
              onClick={() => cancelMutation.mutate()}
              variant="destructive"
            >
              Cancel
            </Button>
          )}
        </div>

        <div className="flex-1 overflow-auto bg-background px-4 py-3 font-mono text-xs leading-relaxed">
          {log.length === 0 ? (
            <TypographyP className="text-muted-foreground">Waiting for log stream…</TypographyP>
          ) : (
            <AnsiLog text={log} />
          )}
        </div>
      </div>

      {/* Right sidebar */}
      <aside className="w-[280px] flex-shrink-0 overflow-auto border-l border-border/50 bg-card px-4 py-4">
        <section className="mb-6">
          <TypographyH2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Details</TypographyH2>
          <div className="space-y-1 text-sm">
            <DetailRow label="Status" value={job.status} />
            <DetailRow label="Stage" value={job.stage} />
            <DetailRow label="Duration" value={formatDuration(job.duration)} />
            <DetailRow label="Allow failure" value={job.allowFailure ? 'Yes' : 'No'} />
          </div>
        </section>

        <section>
          <TypographyH2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Artifacts</TypographyH2>
          <div className="space-y-2">
            {(artifacts ?? []).map((artifact) => (
              <div key={artifact.id} className="border border-border p-2.5">
                <div className="flex items-start gap-2">
                  <FileArchive size={14} className="mt-0.5 flex-shrink-0 text-muted-foreground/70" />
                  <div className="min-w-0 flex-1">
                    <TypographyP className="truncate text-sm text-muted-foreground">{artifact.filename}</TypographyP>
                    <TypographyP className="text-xs text-muted-foreground">{formatBytes(artifact.size)}</TypographyP>
                  </div>
                  <Button
                    onClick={() => downloadMutation.mutate(artifact)}
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 p-1 text-muted-foreground/70 hover:bg-muted/50 hover:text-foreground"
                    title="Download artifact"
                  >
                    <Download size={13} />
                  </Button>
                </div>
                {progress[artifact.id] != null && progress[artifact.id] < 100 && (
                  <div className="mt-2 h-1 overflow-hidden bg-muted">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${progress[artifact.id]}%` }}
                    />
                  </div>
                )}
              </div>
            ))}
            {(artifacts ?? []).length === 0 && (
              <TypographyP className="text-sm text-muted-foreground">No artifacts</TypographyP>
            )}
          </div>
        </section>
      </aside>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between bg-muted px-2 py-1.5">
      <TypographySpan className="text-muted-foreground/70">{label}</TypographySpan>
      <TypographySpan className="text-muted-foreground">{value}</TypographySpan>
    </div>
  )
}

function AnsiLog({ text }: { text: string }) {
  const segments = useMemo(() => parseAnsi(text), [text])
  return (
    <pre className="whitespace-pre-wrap break-words">
      {segments.map((seg, i) => (
        <TypographySpan key={i} className={seg.className}>{seg.text}</TypographySpan>
      ))}
    </pre>
  )
}
