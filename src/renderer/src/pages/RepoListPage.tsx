import { TypographyH1, TypographyP, TypographySpan } from '../components/ui/typography'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { IPC } from '@shared/ipc-channels'
import { Repo } from '@shared/types'
import { invoke } from '../lib/ipc'
import { useAccountStore } from '../store/account'
import { useTabsStore } from '../store/tabs'
import { cn, formatRelativeTime } from '../lib/utils'
import { MagnifyingGlass, CircleNotch, Star, Folder } from '@phosphor-icons/react'

export function RepoListPage() {
  const accountId = useAccountStore((s) => s.activeAccountId)
  const openTab = useTabsStore((s) => s.openTab)
  const [search, setSearch] = useState('')

  const { data: repos, isLoading } = useQuery<Repo[]>({
    queryKey: ['repos', accountId, search],
    queryFn: () => invoke<Repo[]>(IPC.REPOS.LIST, { search: search || undefined }),
    enabled: !!accountId,
    staleTime: 60_000
  })

  const { data: starred = [] } = useQuery<string[]>({
    queryKey: ['repos-starred', accountId],
    queryFn: () => invoke<string[]>(IPC.REPOS.LIST_STARRED),
    enabled: !!accountId
  })

  function openRepo(repo: Repo, newTab: boolean): void {
    openTab(
      {
        type: 'repo' as never,
        title: repo.name,
        icon: '',
        route: `/repos/${repo.id}`,
        routeState: { repoId: repo.id, repoPath: repo.fullPath }
      },
      { newTab }
    )
  }

  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto max-w-3xl px-6 py-6">
        <TypographyH1 className="mb-4 text-xl font-semibold text-foreground">Repositories</TypographyH1>

        {/* MagnifyingGlass */}
        <div className="mb-4 flex items-center gap-2 border border-border bg-muted px-3 py-2">
          <MagnifyingGlass size={14} className="flex-shrink-0 text-muted-foreground/70" />
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="MagnifyingGlass repositories…"
            className="h-auto flex-1 border-none bg-transparent p-0 text-sm text-foreground placeholder-muted-foreground"
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <CircleNotch size={20} className="animate-spin" />
          </div>
        ) : (
          <div className="space-y-0.5">
            {(repos ?? []).map((repo) => (
              <Button
                key={repo.id}
                onClick={(e) => openRepo(repo, e.metaKey || e.ctrlKey)}
                variant="ghost"
                className="flex h-auto w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-muted/50"
              >
                <Folder size={16} className="flex-shrink-0 text-muted-foreground/70" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <TypographyP className="truncate text-sm font-medium text-foreground">{repo.fullPath}</TypographyP>
                    {starred.includes(`${accountId}:${repo.id}`) && (
                      <Star size={12} className="flex-shrink-0 fill-primary text-primary" />
                    )}
                  </div>
                  {repo.description && (
                    <TypographyP className="mt-0.5 truncate text-xs text-muted-foreground/70">{repo.description}</TypographyP>
                  )}
                </div>
                <div className="flex-shrink-0 text-right">
                  {repo.lastPipelineStatus && (
                    <TypographySpan
                      className={cn(
                        'inline-block px-1.5 py-0.5 text-xs',
                        repo.lastPipelineStatus === 'success' && 'bg-emerald-500/10 text-emerald-500',
                        repo.lastPipelineStatus === 'failed' && 'bg-destructive/10 text-destructive',
                        repo.lastPipelineStatus === 'running' && 'bg-primary/10 text-primary'
                      )}
                    >
                      {repo.lastPipelineStatus}
                    </TypographySpan>
                  )}
                  <TypographyP className="mt-0.5 text-xs text-muted-foreground">{formatRelativeTime(repo.lastActivityAt)}</TypographyP>
                </div>
              </Button>
            ))}
            {(repos ?? []).length === 0 && !isLoading && (
              <TypographyP className="py-8 text-center text-sm text-muted-foreground">No repositories found</TypographyP>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
