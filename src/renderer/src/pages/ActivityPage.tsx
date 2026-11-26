import { TypographyH1, TypographyP } from '../components/ui/typography'
import { Button } from '../components/ui/button'
import { useQuery } from '@tanstack/react-query'
import { IPC } from '@shared/ipc-channels'
import { ActivityEvent } from '@shared/types'
import { invoke } from '../lib/ipc'
import { useAccountStore } from '../store/account'
import { useTabsStore } from '../store/tabs'
import { formatRelativeTime } from '../lib/utils'
import { CircleNotch, Pulse } from '@phosphor-icons/react'

interface ActivityPageProps {
  repoId?: number
}

export function ActivityPage({ repoId }: ActivityPageProps) {
  const accountId = useAccountStore((s) => s.activeAccountId)
  const openTab = useTabsStore((s) => s.openTab)

  const { data, isLoading } = useQuery<ActivityEvent[]>({
    queryKey: ['activity', accountId, repoId],
    queryFn: () => invoke<ActivityEvent[]>(IPC.ACTIVITY.LIST, { repoId }),
    enabled: !!accountId,
    refetchInterval: 120_000
  })

  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto max-w-3xl px-6 py-6">
        <TypographyH1 className="mb-4 text-xl font-semibold text-foreground">Pulse</TypographyH1>
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <CircleNotch size={20} className="animate-spin" />
          </div>
        ) : (
          <div className="space-y-1">
            {(data ?? []).map((event) => (
              <Button
                key={event.id}
                onClick={(e) => {
                  if (event.entityType === 'mr') {
                    openTab(
                      {
                        type: 'mr' as never,
                        title: event.title,
                        route: `/mr/${event.repoId}/${event.entityId}`,
                        routeState: { repoId: event.repoId, mrIid: event.entityId }
                      },
                      { newTab: e.metaKey || e.ctrlKey }
                    )
                  }
                }}
                variant="ghost"
                className="h-auto w-full px-3 py-2.5 text-left hover:bg-muted/50"
              >
                <TypographyP className="text-sm text-foreground">{event.title}</TypographyP>
                <TypographyP className="mt-0.5 text-xs text-muted-foreground/70">
                  {event.repoFullPath || `repo:${event.repoId}`} · {formatRelativeTime(event.createdAt)}
                </TypographyP>
              </Button>
            ))}
            {(data ?? []).length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Pulse size={22} className="mb-2 opacity-40" />
                <TypographyP className="text-sm">No recent activity</TypographyP>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
