import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { IPC } from '@shared/ipc-channels'
import { Repo } from '@shared/types'
import { invoke } from '../lib/ipc'
import { useAccountStore } from '../store/account'
import { useTabsStore } from '../store/tabs'
import { cn, formatRelativeTime } from '../lib/utils'
import { Search, Loader2, Star, Folder } from 'lucide-react'

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
        <h1 className="mb-4 text-xl font-semibold text-neutral-100">Repositories</h1>

        {/* Search */}
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
          <Search size={14} className="flex-shrink-0 text-neutral-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search repositories…"
            className="flex-1 bg-transparent text-sm text-neutral-200 placeholder-neutral-600 outline-none"
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-neutral-600">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : (
          <div className="space-y-0.5">
            {(repos ?? []).map((repo) => (
              <button
                key={repo.id}
                onClick={(e) => openRepo(repo, e.metaKey || e.ctrlKey)}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-white/5"
              >
                <Folder size={16} className="flex-shrink-0 text-neutral-500" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-neutral-200">{repo.fullPath}</p>
                    {starred.includes(`${accountId}:${repo.id}`) && (
                      <Star size={12} className="flex-shrink-0 fill-accent-500 text-accent-500" />
                    )}
                  </div>
                  {repo.description && (
                    <p className="mt-0.5 truncate text-xs text-neutral-500">{repo.description}</p>
                  )}
                </div>
                <div className="flex-shrink-0 text-right">
                  {repo.lastPipelineStatus && (
                    <span
                      className={cn(
                        'inline-block rounded px-1.5 py-0.5 text-xs',
                        repo.lastPipelineStatus === 'success' && 'bg-status-success/10 text-status-success',
                        repo.lastPipelineStatus === 'failed' && 'bg-status-failed/10 text-status-failed',
                        repo.lastPipelineStatus === 'running' && 'bg-status-running/10 text-status-running'
                      )}
                    >
                      {repo.lastPipelineStatus}
                    </span>
                  )}
                  <p className="mt-0.5 text-xs text-neutral-600">{formatRelativeTime(repo.lastActivityAt)}</p>
                </div>
              </button>
            ))}
            {(repos ?? []).length === 0 && !isLoading && (
              <p className="py-8 text-center text-sm text-neutral-600">No repositories found</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
