import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { IPC } from '@shared/ipc-channels'
import { MergeRequest, DiffFile, Thread, MergeStrategy } from '@shared/types'
import { invoke } from '../lib/ipc'
import { useAccountStore } from '../store/account'
import { useTabsStore } from '../store/tabs'
import { cn, formatRelativeTime } from '../lib/utils'
import { Loader2 } from 'lucide-react'
import { DiffViewer } from '../components/mr/DiffViewer'
import { ThreadList } from '../components/mr/ThreadList'
import { MRHeader } from '../components/mr/MRHeader'

interface MRPageProps {
  repoId: number
  mrIid: number
}

type ActivePanel = 'overview' | 'changes' | 'threads' | 'pipelines'

export function MRPage({ repoId, mrIid }: MRPageProps) {
  const accountId = useAccountStore((s) => s.activeAccountId)
  const qc = useQueryClient()
  const [activePanel, setActivePanel] = useState<ActivePanel>('overview')
  const [selectedFile, setSelectedFile] = useState<DiffFile | null>(null)

  const { data: mr, isLoading } = useQuery<MergeRequest>({
    queryKey: ['mr', accountId, repoId, mrIid],
    queryFn: () => invoke<MergeRequest>(IPC.MR.GET, { repoId, mrIid }),
    enabled: !!accountId
  })

  const { data: diffFiles } = useQuery<DiffFile[]>({
    queryKey: ['mr-diffs', accountId, repoId, mrIid],
    queryFn: () => invoke<DiffFile[]>(IPC.MR.GET_DIFF_FILES, { repoId, mrIid }),
    enabled: !!accountId && activePanel === 'changes'
  })

  const { data: threads } = useQuery<Thread[]>({
    queryKey: ['mr-threads', accountId, repoId, mrIid],
    queryFn: () => invoke<Thread[]>(IPC.MR.GET_THREADS, { repoId, mrIid }),
    enabled: !!accountId && (activePanel === 'threads' || activePanel === 'changes')
  })

  const approveMutation = useMutation({
    mutationFn: () => invoke<void>(IPC.MR.APPROVE, { repoId, mrIid }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mr', accountId, repoId, mrIid] })
  })

  const mergeMutation = useMutation({
    mutationFn: (strategy: MergeStrategy) =>
      invoke<void>(IPC.MR.MERGE, { repoId, mrIid, strategy }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mr', accountId, repoId, mrIid] })
  })

  if (isLoading || !mr) {
    return (
      <div className="flex h-full items-center justify-center text-neutral-600">
        <Loader2 size={20} className="animate-spin" />
      </div>
    )
  }

  const PANELS: { id: ActivePanel; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'changes', label: `Changes${diffFiles ? ` (${diffFiles.length})` : ''}` },
    { id: 'threads', label: `Threads${threads ? ` (${threads.length})` : ''}` },
    { id: 'pipelines', label: 'Pipelines' }
  ]

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* MR Header */}
      <MRHeader
        mr={mr}
        onApprove={() => approveMutation.mutate()}
        onMerge={(strategy) => mergeMutation.mutate(strategy)}
        approving={approveMutation.isPending}
        merging={mergeMutation.isPending}
      />

      {/* Panel nav */}
      <div className="flex flex-shrink-0 items-center gap-0 border-b border-white/5 px-6">
        {PANELS.map((p) => (
          <button
            key={p.id}
            onClick={() => setActivePanel(p.id)}
            className={cn(
              'relative border-b-2 px-4 py-2.5 text-sm transition-colors',
              activePanel === p.id
                ? 'border-accent-500 text-neutral-100'
                : 'border-transparent text-neutral-500 hover:text-neutral-300'
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Panel content */}
      <div className="flex flex-1 overflow-hidden">
        {activePanel === 'overview' && <MROverview mr={mr} />}

        {activePanel === 'changes' && (
          <div className="flex flex-1 overflow-hidden">
            {/* File tree */}
            <div className="w-64 flex-shrink-0 overflow-auto border-r border-white/5 py-2">
              {(diffFiles ?? []).map((file) => (
                <button
                  key={file.newPath}
                  onClick={() => setSelectedFile(file)}
                  className={cn(
                    'flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors',
                    selectedFile?.newPath === file.newPath
                      ? 'bg-white/5 text-neutral-100'
                      : 'text-neutral-400 hover:bg-white/5'
                  )}
                >
                  <span
                    className={cn(
                      'flex-shrink-0 rounded px-1 text-xs font-mono',
                      file.isNew && 'bg-status-success/10 text-status-success',
                      file.isDeleted && 'bg-status-failed/10 text-status-failed',
                      file.isRenamed && 'bg-accent-500/10 text-accent-400',
                      !file.isNew && !file.isDeleted && !file.isRenamed && 'bg-white/5 text-neutral-500'
                    )}
                  >
                    {file.isNew ? '+' : file.isDeleted ? '−' : file.isRenamed ? 'R' : 'M'}
                  </span>
                  <span className="truncate">{file.newPath.split('/').pop()}</span>
                </button>
              ))}
            </div>

            {/* Diff viewer */}
            <div className="flex-1 overflow-hidden">
              {selectedFile ? (
                <DiffViewer
                  repoId={repoId}
                  mrIid={mrIid}
                  file={selectedFile}
                  threads={threads ?? []}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-neutral-600">
                  Select a file to view changes
                </div>
              )}
            </div>
          </div>
        )}

        {activePanel === 'threads' && (
          <div className="flex-1 overflow-auto px-6 py-4">
            <ThreadList threads={threads ?? []} repoId={repoId} mrIid={mrIid} />
          </div>
        )}

        {activePanel === 'pipelines' && (
          <MRPipelines repoId={repoId} mr={mr} />
        )}
      </div>
    </div>
  )
}

function MROverview({ mr }: { mr: MergeRequest }) {
  return (
    <div className="flex-1 overflow-auto px-6 py-4">
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Description */}
        <div className="lg:col-span-2">
          <h2 className="mb-3 text-sm font-medium text-neutral-400">Description</h2>
          {mr.description ? (
            <div className="prose prose-sm prose-invert max-w-none">
              <p className="text-sm text-neutral-300 leading-relaxed whitespace-pre-wrap">
                {mr.description}
              </p>
            </div>
          ) : (
            <p className="text-sm text-neutral-600">No description</p>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div>
            <p className="mb-1 text-xs text-neutral-600">Assignees</p>
            {mr.assignees.length > 0 ? (
              mr.assignees.map((a) => (
                <div key={a.id} className="flex items-center gap-2 text-sm text-neutral-300">
                  <div className="h-5 w-5 rounded-full bg-white/10 text-xs flex items-center justify-center">
                    {a.name[0]}
                  </div>
                  {a.name}
                </div>
              ))
            ) : (
              <p className="text-xs text-neutral-600">None</p>
            )}
          </div>

          <div>
            <p className="mb-1 text-xs text-neutral-600">Reviewers</p>
            {mr.reviewers.length > 0 ? (
              mr.reviewers.map((r) => (
                <div key={r.id} className="flex items-center gap-2 text-sm text-neutral-300">
                  <div className="h-5 w-5 rounded-full bg-white/10 text-xs flex items-center justify-center">
                    {r.name[0]}
                  </div>
                  {r.name}
                </div>
              ))
            ) : (
              <p className="text-xs text-neutral-600">None</p>
            )}
          </div>

          {mr.labels.length > 0 && (
            <div>
              <p className="mb-1 text-xs text-neutral-600">Labels</p>
              <div className="flex flex-wrap gap-1">
                {mr.labels.map((l) => (
                  <span
                    key={l.id}
                    className="rounded px-2 py-0.5 text-xs"
                    style={{ background: l.color + '20', color: l.color }}
                  >
                    {l.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="mb-1 text-xs text-neutral-600">Branches</p>
            <p className="text-xs text-neutral-400">
              <span className="font-mono">{mr.sourceBranch}</span>
              {' → '}
              <span className="font-mono">{mr.targetBranch}</span>
            </p>
          </div>

          <div>
            <p className="mb-1 text-xs text-neutral-600">Created</p>
            <p className="text-xs text-neutral-400">{formatRelativeTime(mr.createdAt)}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function MRPipelines({ repoId, mr }: { repoId: number; mr: MergeRequest }) {
  const accountId = useAccountStore((s) => s.activeAccountId)
  const openTab = useTabsStore((s) => s.openTab)

  const { data: pipelines, isLoading } = useQuery({
    queryKey: ['pipelines', accountId, repoId, mr.iid],
    queryFn: () =>
      invoke<{ id: number; status: string; ref: string; updatedAt: string }[]>(
        IPC.PIPELINE.LIST,
        { repoId, perPage: 10 }
      ),
    enabled: !!accountId
  })

  return (
    <div className="flex-1 overflow-auto px-6 py-4">
      {isLoading ? (
        <div className="flex items-center justify-center py-8 text-neutral-600">
          <Loader2 size={16} className="animate-spin" />
        </div>
      ) : (
        <div className="space-y-1">
          {(pipelines ?? []).map((p) => (
            <button
              key={p.id}
              onClick={(e) =>
                openTab(
                  {
                    type: 'pipeline' as never,
                    title: `Pipeline #${p.id}`,
                    icon: '',
                    route: `/pipeline/${repoId}/${p.id}`,
                    routeState: { repoId, pipelineId: p.id }
                  },
                  { newTab: e.metaKey || e.ctrlKey }
                )
              }
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-white/5"
            >
              <span
                className={cn(
                  'text-sm font-medium',
                  p.status === 'success' && 'text-status-success',
                  p.status === 'failed' && 'text-status-failed',
                  p.status === 'running' && 'text-status-running'
                )}
              >
                {p.status}
              </span>
              <span className="flex-1 text-sm text-neutral-300">#{p.id} · {p.ref}</span>
              <span className="text-xs text-neutral-600">{formatRelativeTime(p.updatedAt)}</span>
            </button>
          ))}
          {(pipelines ?? []).length === 0 && (
            <p className="py-8 text-center text-sm text-neutral-600">No pipelines</p>
          )}
        </div>
      )}
    </div>
  )
}
