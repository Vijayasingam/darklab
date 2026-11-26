import { TypographyH1, TypographyH2, TypographyP, TypographySpan } from '../components/ui/typography'
import { Button } from '../components/ui/button'
import { useQuery } from '@tanstack/react-query'
import { IPC } from '@shared/ipc-channels'
import { Repo, MergeRequest, Pipeline } from '@shared/types'
import { invoke } from '../lib/ipc'
import { useTabsStore } from '../store/tabs'
import { useAccountStore } from '../store/account'
import { cn, formatRelativeTime } from '../lib/utils'
import { CircleNotch, GitPullRequest, GitBranch, Pulse } from '@phosphor-icons/react'

interface RepoPageProps {
  repoId: number
  repoPath: string
}

export function RepoPage({ repoId, repoPath: _repoPath }: RepoPageProps) {
  const accountId = useAccountStore((s) => s.activeAccountId)
  const openTab = useTabsStore((s) => s.openTab)

  const { data: repo, isLoading: repoLoading } = useQuery<Repo>({
    queryKey: ['repo', accountId, repoId],
    queryFn: () => invoke<Repo>(IPC.REPOS.GET, repoId),
    enabled: !!accountId && !!repoId
  })

  const { data: mrs } = useQuery<MergeRequest[]>({
    queryKey: ['mrs', accountId, repoId, 'opened'],
    queryFn: () => invoke<MergeRequest[]>(IPC.MR.LIST, { repoId, state: 'opened', perPage: 20 }),
    enabled: !!accountId && !!repoId
  })

  const { data: pipelines } = useQuery<Pipeline[]>({
    queryKey: ['pipelines', accountId, repoId],
    queryFn: () => invoke<Pipeline[]>(IPC.PIPELINE.LIST, { repoId, perPage: 10 }),
    enabled: !!accountId && !!repoId
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

  function openPipeline(p: Pipeline, newTab: boolean): void {
    openTab(
      {
        type: 'pipeline' as never,
        title: `Pipeline #${p.id}`,
        icon: '',
        route: `/pipeline/${p.repoId}/${p.id}`,
        routeState: { repoId: p.repoId, pipelineId: p.id }
      },
      { newTab }
    )
  }

  if (repoLoading || !repo) {
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
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center bg-muted">
            <GitBranch size={18} className="text-primary" />
          </div>
          <div>
            <TypographyH1 className="text-xl font-semibold text-foreground">{repo.fullPath}</TypographyH1>
            {repo.description && (
              <TypographyP className="mt-1 text-sm text-muted-foreground/70">{repo.description}</TypographyP>
            )}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button
              onClick={() =>
                openTab({
                  type: 'mr-list' as never,
                  title: `MRs · ${repo.name}`,
                  icon: '',
                  route: '/merge-requests',
                  routeState: { filters: { repoId } }
                })
              }
              variant="outline"
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm"
            >
              <GitPullRequest size={14} />
              Merge Requests
            </Button>
            <Button
              onClick={() =>
                openTab({
                  type: 'pipeline-list' as never,
                  title: `Pipelines · ${repo.name}`,
                  icon: '',
                  route: '/pipelines',
                  routeState: { filters: { repoId } }
                })
              }
              variant="outline"
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm"
            >
              <Pulse size={14} />
              Pipelines
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Open MRs */}
          <section>
            <TypographyH2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
              Open merge requests
            </TypographyH2>
            <div className="space-y-0.5">
              {(mrs ?? []).slice(0, 10).map((mr) => (
                <Button
                  key={mr.id}
                  onClick={(e) => openMR(mr, e.metaKey || e.ctrlKey)}
                  variant="ghost"
                  className="flex h-auto w-full items-center gap-2 px-3 py-2 text-left hover:bg-muted/50"
                >
                  <GitPullRequest size={13} className="flex-shrink-0 text-primary" />
                  <TypographySpan className="flex-1 truncate text-sm text-foreground">{mr.title}</TypographySpan>
                  <TypographySpan className="flex-shrink-0 text-xs text-muted-foreground">!{mr.iid}</TypographySpan>
                </Button>
              ))}
              {(mrs ?? []).length === 0 && (
                <TypographyP className="py-4 text-center text-sm text-muted-foreground">No open MRs</TypographyP>
              )}
            </div>
          </section>

          {/* Recent pipelines */}
          <section>
            <TypographyH2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
              Recent pipelines
            </TypographyH2>
            <div className="space-y-0.5">
              {(pipelines ?? []).slice(0, 10).map((p) => (
                <Button
                  key={p.id}
                  onClick={(e) => openPipeline(p, e.metaKey || e.ctrlKey)}
                  variant="ghost"
                  className="flex h-auto w-full items-center gap-2 px-3 py-2 text-left hover:bg-muted/50"
                >
                  <TypographySpan
                    className={cn(
                      'flex-shrink-0 text-xs font-medium',
                      p.status === 'success' && 'text-emerald-500',
                      p.status === 'failed' && 'text-destructive',
                      p.status === 'running' && 'text-primary',
                      p.status === 'canceled' && 'text-muted-foreground/70'
                    )}
                  >
                    {p.status}
                  </TypographySpan>
                  <TypographySpan className="flex-1 truncate text-sm text-muted-foreground">{p.ref}</TypographySpan>
                  <TypographySpan className="flex-shrink-0 text-xs text-muted-foreground">{formatRelativeTime(p.updatedAt)}</TypographySpan>
                </Button>
              ))}
              {(pipelines ?? []).length === 0 && (
                <TypographyP className="py-4 text-center text-sm text-muted-foreground">No pipelines</TypographyP>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
