import { TypographyH1, TypographyP, TypographySpan } from '../ui/typography'
import { Button } from '../ui/button'
import { MergeRequest, MergeStrategy } from '@shared/types'
import { cn, formatRelativeTime } from '../../lib/utils'
import { invoke } from '../../lib/ipc'
import { IPC } from '@shared/ipc-channels'
import { useQuery } from '@tanstack/react-query'
import { useAccountStore } from '../../store/account'
import { ArrowSquareOut, CheckCircle, GitMerge, CircleNotch } from '@phosphor-icons/react'
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
    <div className="flex-shrink-0 border-b border-border/50 bg-card px-6 py-4">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <TypographySpan
              className={cn(
                'px-2 py-0.5 text-xs font-medium',
                mr.state === 'opened' && 'bg-emerald-500/15 text-emerald-500',
                mr.state === 'merged' && 'bg-primary/15 text-primary',
                mr.state === 'closed' && 'bg-destructive/15 text-destructive'
              )}
            >
              {mr.state}
            </TypographySpan>
            {mr.isDraft && (
              <TypographySpan className="bg-muted px-2 py-0.5 text-xs text-muted-foreground/70">Draft</TypographySpan>
            )}
          </div>
          <TypographyH1 className="mt-1.5 text-lg font-semibold leading-snug text-foreground line-clamp-2">
            {mr.title}
          </TypographyH1>
          <TypographyP className="mt-1 text-xs text-muted-foreground/70">
            !{mr.iid} · opened by {mr.author.name} · {formatRelativeTime(mr.createdAt)}
            {mr.threadCount > 0 && ` · ${mr.unresolvedThreadCount}/${mr.threadCount} threads`}
          </TypographyP>
        </div>

        {/* Actions */}
        <div className="flex flex-shrink-0 items-center gap-2">
          <Button
            onClick={openInBrowser}
            variant="secondary"
            size="sm"
            title="Open in GitLab"
          >
            <ArrowSquareOut size={13} />
          </Button>

          {mr.state === 'opened' && (
            <>
              <Button
                onClick={onApprove}
                disabled={approving}
                variant="outline"
                size="sm"
                className="border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10"
              >
                {approving ? <CircleNotch size={13} className="animate-spin" /> : <CheckCircle size={13} />}
                Approve
              </Button>

              {canMerge && (
                <div className="relative">
                  <Button
                    onClick={() => {
                      if (mergeOptions.length === 1) {
                        onMerge(mergeOptions[0])
                      } else {
                        setShowMergeMenu((v) => !v)
                      }
                    }}
                    disabled={merging}
                    size="sm"
                    className="px-3 py-1.5 text-sm font-medium"
                  >
                    {merging ? <CircleNotch size={13} className="animate-spin" /> : <GitMerge size={13} />}
                    Merge
                  </Button>

                  {showMergeMenu && (
                    <div className="absolute right-0 top-full z-50 mt-1 min-w-[160px] border border-border bg-popover p-1 shadow-xl">
                      {mergeOptions.map((strategy) => (
                        <Button
                          key={strategy}
                          onClick={() => {
                            setShowMergeMenu(false)
                            onMerge(strategy)
                          }}
                          variant="ghost"
                          className="h-auto w-full px-3 py-2 text-left text-sm text-foreground hover:bg-muted/50"
                        >
                          {strategy === 'merge' && 'Merge commit'}
                          {strategy === 'squash' && 'Squash and merge'}
                          {strategy === 'rebase_merge' && 'Rebase merge'}
                        </Button>
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
            'mt-3 flex items-center gap-2 px-3 py-2 text-sm',
            mr.pipelineStatus === 'success' && 'bg-emerald-500/10 text-emerald-500',
            mr.pipelineStatus === 'failed' && 'bg-destructive/10 text-destructive',
            mr.pipelineStatus === 'running' && 'bg-primary/10 text-primary',
            mr.pipelineStatus === 'pending' && 'bg-muted text-muted-foreground'
          )}
        >
          Pipeline: {mr.pipelineStatus}
          {mr.pipelineWebUrl && (
            <Button
              onClick={() => invoke<void>(IPC.APP.OPEN_EXTERNAL, mr.pipelineWebUrl!)}
              variant="link"
              className="ml-auto h-auto text-xs opacity-70 hover:opacity-100"
            >
              View
            </Button>
          )}
        </div>
      )}

      {/* Conflicts warning */}
      {mr.hasConflicts && (
        <div className="mt-3 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          This merge request has conflicts that must be resolved before merging.
        </div>
      )}
    </div>
  )
}
