import { MergeRequest, MergeStrategy } from '@shared/types'
import { cn, formatRelativeTime } from '../../lib/utils'
import { invoke } from '../../lib/ipc'
import { IPC } from '@shared/ipc-channels'
import { useQuery } from '@tanstack/react-query'
import { useAccountStore } from '../../store/account'
import { ExternalLink, CheckCircle2, GitMerge, Loader2 } from 'lucide-react'
import { useState } from 'react'

interface MRHeaderProps {
  mr: MergeRequest
  onApprove: () => void
  onMerge: (strategy: MergeStrategy) => void
  approving: boolean
  merging: boolean
}

export function MRHeader({ mr, onApprove, onMerge, approving, merging }: MRHeaderProps) {
  const accountId = useAccountStore((s) => s.activeAccountId)
  const [showMergeMenu, setShowMergeMenu] = useState(false)

  const { data: mergeOptions = ['merge'] } = useQuery<MergeStrategy[]>({
    queryKey: ['mr-merge-options', accountId, mr.repoId, mr.iid],
    queryFn: () => invoke<MergeStrategy[]>(IPC.MR.GET_MERGE_OPTIONS, { repoId: mr.repoId, mrIid: mr.iid }),
    enabled: !!accountId && mr.state === 'opened'
  })

  const canMerge = mr.state === 'opened' && !mr.hasConflicts && mr.detailedMergeStatus !== 'blocked_status'

  function openInBrowser(): void {
    invoke<void>(IPC.APP.OPEN_EXTERNAL, mr.webUrl)
  }

  return (
    <div className="flex-shrink-0 border-b border-white/5 bg-base-900 px-6 py-4">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'rounded px-2 py-0.5 text-xs font-medium',
                mr.state === 'opened' && 'bg-status-success/15 text-status-success',
                mr.state === 'merged' && 'bg-accent-500/15 text-accent-400',
                mr.state === 'closed' && 'bg-status-failed/15 text-status-failed'
              )}
            >
              {mr.state}
            </span>
            {mr.isDraft && (
              <span className="rounded bg-white/5 px-2 py-0.5 text-xs text-neutral-500">Draft</span>
            )}
          </div>
          <h1 className="mt-1.5 text-lg font-semibold leading-snug text-neutral-100 line-clamp-2">
            {mr.title}
          </h1>
          <p className="mt-1 text-xs text-neutral-500">
            !{mr.iid} · opened by {mr.author.name} · {formatRelativeTime(mr.createdAt)}
            {mr.threadCount > 0 && ` · ${mr.unresolvedThreadCount}/${mr.threadCount} threads`}
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-shrink-0 items-center gap-2">
          <button
            onClick={openInBrowser}
            className="app-button-secondary rounded-lg px-3 py-1.5 text-sm"
            title="Open in GitLab"
          >
            <ExternalLink size={13} />
          </button>

          {mr.state === 'opened' && (
            <>
              <button
                onClick={onApprove}
                disabled={approving}
                className="flex items-center gap-1.5 rounded-lg border border-status-success/30 px-3 py-1.5 text-sm text-status-success transition-colors hover:bg-status-success/10 disabled:opacity-50"
              >
                {approving ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                Approve
              </button>

              {canMerge && (
                <div className="relative">
                  <button
                    onClick={() => {
                      if (mergeOptions.length === 1) {
                        onMerge(mergeOptions[0])
                      } else {
                        setShowMergeMenu((v) => !v)
                      }
                    }}
                    disabled={merging}
                    className="app-button-primary rounded-lg px-3 py-1.5 text-sm font-medium"
                  >
                    {merging ? <Loader2 size={13} className="animate-spin" /> : <GitMerge size={13} />}
                    Merge
                  </button>

                  {showMergeMenu && (
                    <div className="absolute right-0 top-full z-50 mt-1 min-w-[160px] rounded-lg border border-white/10 bg-base-800 p-1 shadow-xl">
                      {mergeOptions.map((strategy) => (
                        <button
                          key={strategy}
                          onClick={() => {
                            setShowMergeMenu(false)
                            onMerge(strategy)
                          }}
                          className="w-full rounded px-3 py-2 text-left text-sm text-neutral-200 hover:bg-white/5"
                        >
                          {strategy === 'merge' && 'Merge commit'}
                          {strategy === 'squash' && 'Squash and merge'}
                          {strategy === 'rebase_merge' && 'Rebase merge'}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Pipeline status strip */}
      {mr.pipelineStatus && (
        <div
          className={cn(
            'mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-sm',
            mr.pipelineStatus === 'success' && 'bg-status-success/10 text-status-success',
            mr.pipelineStatus === 'failed' && 'bg-status-failed/10 text-status-failed',
            mr.pipelineStatus === 'running' && 'bg-status-running/10 text-status-running',
            mr.pipelineStatus === 'pending' && 'bg-white/5 text-neutral-400'
          )}
        >
          Pipeline: {mr.pipelineStatus}
          {mr.pipelineWebUrl && (
            <button
              onClick={() => invoke<void>(IPC.APP.OPEN_EXTERNAL, mr.pipelineWebUrl!)}
              className="ml-auto text-xs opacity-70 hover:opacity-100"
            >
              View
            </button>
          )}
        </div>
      )}

      {/* Conflicts warning */}
      {mr.hasConflicts && (
        <div className="mt-3 rounded-lg bg-status-failed/10 px-3 py-2 text-sm text-status-failed">
          This merge request has conflicts that must be resolved before merging.
        </div>
      )}
    </div>
  )
}
