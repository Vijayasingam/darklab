import { TypographyH2, TypographyP, TypographySpan } from '../components/ui/typography'
import { Button } from '../components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { IPC } from '@shared/ipc-channels'
import { MergeRequest, DiffFile, Thread, MergeStrategy } from '@shared/types'
import { invoke } from '../lib/ipc'
import { useAccountStore } from '../store/account'
import { useTabsStore } from '../store/tabs'
import { cn, formatRelativeTime } from '../lib/utils'
import { CircleNotch } from '@phosphor-icons/react'
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
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <CircleNotch size={20} className="animate-spin" />
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
      <div className="flex flex-shrink-0 items-center border-b border-border/50 px-6 py-1.5">
        <Tabs value={activePanel} onValueChange={(v) => setActivePanel(v as ActivePanel)} className="w-auto">
          <TabsList variant="compact">
            {PANELS.map((p) => (
              <TabsTrigger key={p.id} value={p.id}>
                {p.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Panel content */}
      <div className="flex flex-1 overflow-hidden">
        {activePanel === 'overview' && <MROverview mr={mr} />}

        {activePanel === 'changes' && (
          <div className="flex flex-1 overflow-hidden">
            {/* File tree */}
            <div className="w-64 flex-shrink-0 overflow-auto border-r border-border/50 py-2">
              {(diffFiles ?? []).map((file) => (
                <Button
                  key={file.newPath}
                  onClick={() => setSelectedFile(file)}
                  variant="ghost"
                  className={cn(
                    'flex h-auto w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors',
                    selectedFile?.newPath === file.newPath
                      ? 'bg-muted text-foreground'
                      : 'text-muted-foreground hover:bg-muted/50'
                  )}
                >
                  <TypographySpan
                    className={cn(
                      'flex-shrink-0 px-1 text-xs font-mono',
                      file.isNew && 'bg-emerald-500/10 text-emerald-500',
                      file.isDeleted && 'bg-destructive/10 text-destructive',
                      file.isRenamed && 'bg-primary/10 text-primary',
                      !file.isNew && !file.isDeleted && !file.isRenamed && 'bg-muted text-muted-foreground/70'
                    )}
                  >
                    {file.isNew ? '+' : file.isDeleted ? '−' : file.isRenamed ? 'R' : 'M'}
                  </TypographySpan>
                  <TypographySpan className="truncate">{file.newPath.split('/').pop()}</TypographySpan>
                </Button>
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
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
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
          <TypographyH2 className="mb-3 text-sm font-medium text-muted-foreground">Description</TypographyH2>
          {mr.description ? (
            <div className="prose prose-sm prose-invert max-w-none">
              <TypographyP className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {mr.description}
              </TypographyP>
            </div>
          ) : (
            <TypographyP className="text-sm text-muted-foreground">No description</TypographyP>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div>
            <TypographyP className="mb-1 text-xs text-muted-foreground">Assignees</TypographyP>
            {mr.assignees.length > 0 ? (
              mr.assignees.map((a) => (
                <div key={a.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="h-5 w-5 bg-muted text-xs flex items-center justify-center">
                    {a.name[0]}
                  </div>
                  {a.name}
                </div>
              ))
            ) : (
              <TypographyP className="text-xs text-muted-foreground">None</TypographyP>
            )}
          </div>

          <div>
            <TypographyP className="mb-1 text-xs text-muted-foreground">Reviewers</TypographyP>
            {mr.reviewers.length > 0 ? (
              mr.reviewers.map((r) => (
                <div key={r.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="h-5 w-5 bg-muted text-xs flex items-center justify-center">
                    {r.name[0]}
                  </div>
                  {r.name}
                </div>
              ))
            ) : (
              <TypographyP className="text-xs text-muted-foreground">None</TypographyP>
            )}
          </div>

          {mr.labels.length > 0 && (
            <div>
              <TypographyP className="mb-1 text-xs text-muted-foreground">Labels</TypographyP>
              <div className="flex flex-wrap gap-1">
                {mr.labels.map((l) => (
                  <TypographySpan
                    key={l.id}
                    className="px-2 py-0.5 text-xs"
                    style={{ background: l.color + '20', color: l.color }}
                  >
                    {l.name}
                  </TypographySpan>
                ))}
              </div>
            </div>
          )}

          <div>
            <TypographyP className="mb-1 text-xs text-muted-foreground">Branches</TypographyP>
            <TypographyP className="text-xs text-muted-foreground">
              <TypographySpan className="font-mono">{mr.sourceBranch}</TypographySpan>
              {' → '}
              <TypographySpan className="font-mono">{mr.targetBranch}</TypographySpan>
            </TypographyP>
          </div>

          <div>
            <TypographyP className="mb-1 text-xs text-muted-foreground">Created</TypographyP>
            <TypographyP className="text-xs text-muted-foreground">{formatRelativeTime(mr.createdAt)}</TypographyP>
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
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <CircleNotch size={16} className="animate-spin" />
        </div>
      ) : (
        <div className="space-y-1">
          {(pipelines ?? []).map((p) => (
            <Button
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
              variant="ghost"
              className="flex h-auto w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/50"
            >
              <TypographySpan
                className={cn(
                  'text-sm font-medium',
                  p.status === 'success' && 'text-emerald-500',
                  p.status === 'failed' && 'text-destructive',
                  p.status === 'running' && 'text-primary'
                )}
              >
                {p.status}
              </TypographySpan>
              <TypographySpan className="flex-1 text-sm text-muted-foreground">#{p.id} · {p.ref}</TypographySpan>
              <TypographySpan className="text-xs text-muted-foreground">{formatRelativeTime(p.updatedAt)}</TypographySpan>
            </Button>
          ))}
          {(pipelines ?? []).length === 0 && (
            <TypographyP className="py-8 text-center text-sm text-muted-foreground">No pipelines</TypographyP>
          )}
        </div>
      )}
    </div>
  )
}
