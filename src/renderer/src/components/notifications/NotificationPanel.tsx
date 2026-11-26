import { TypographyP } from '../ui/typography'
import { Button } from '../ui/button'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { IPC } from '@shared/ipc-channels'
import { AppNotification } from '@shared/types'
import { invoke, on } from '../../lib/ipc'
import { useUIStore } from '../../store/ui'
import { useAccountStore } from '../../store/account'
import { useTabsStore } from '../../store/tabs'
import { formatRelativeTime } from '../../lib/utils'
import { useEffect } from 'react'

export function NotificationPanel() {
  const open = useUIStore((s) => s.notificationPanelOpen)
  const close = useUIStore((s) => s.closeNotificationPanel)
  const accountId = useAccountStore((s) => s.activeAccountId)
  const openTab = useTabsStore((s) => s.openTab)
  const qc = useQueryClient()

  const { data = [] } = useQuery<AppNotification[]>({
    queryKey: ['notifications', accountId],
    queryFn: () => invoke<AppNotification[]>(IPC.NOTIFICATION.LIST, { accountId, limit: 20 }),
    enabled: !!accountId && open
  })

  const markAllMutation = useMutation({
    mutationFn: () => invoke<void>(IPC.NOTIFICATION.MARK_ALL_READ, accountId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications', accountId] })
  })

  useEffect(() => {
    const unsub = on(IPC.NOTIFICATION.NEW, () => {
      qc.invalidateQueries({ queryKey: ['notifications', accountId] })
    })
    return () => unsub()
  }, [accountId, qc])

  if (!open) return <></>

  return (
    <div className="fixed inset-0 z-[180]" onClick={close}>
      <aside className="absolute right-3 top-12 h-[70vh] w-[360px] overflow-hidden border border-border bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
          <TypographyP className="text-sm font-medium text-foreground">Notifications</TypographyP>
          <Button onClick={() => markAllMutation.mutate()} variant="link" className="h-auto text-xs text-muted-foreground/70 hover:text-foreground">Mark all read</Button>
        </div>
        <div className="h-[calc(70vh-44px)] overflow-auto p-1">
          {data.map((n) => (
            <Button
              key={n.id}
              onClick={(e) => {
                if (n.entityType === 'mr') {
                  openTab(
                    {
                      type: 'mr' as never,
                      title: n.title,
                      route: `/mr/${n.repoId}/${n.entityId}`,
                      routeState: { repoId: n.repoId, mrIid: n.entityId }
                    },
                    { newTab: e.metaKey || e.ctrlKey }
                  )
                }
                invoke<void>(IPC.NOTIFICATION.MARK_READ, n.id).finally(() => {
                  qc.invalidateQueries({ queryKey: ['notifications', accountId] })
                })
              }}
              variant="ghost"
              className={`h-auto w-full px-3 py-2.5 text-left hover:bg-muted/50 ${n.read ? 'opacity-60' : ''}`}
            >
              <TypographyP className="text-sm text-foreground">{n.title}</TypographyP>
              <TypographyP className="mt-0.5 line-clamp-2 text-xs text-muted-foreground/70">{n.body}</TypographyP>
              <TypographyP className="mt-1 text-[11px] text-muted-foreground">{formatRelativeTime(n.createdAt)}</TypographyP>
            </Button>
          ))}
          {data.length === 0 && <TypographyP className="py-10 text-center text-sm text-muted-foreground">No notifications</TypographyP>}
        </div>
      </aside>
    </div>
  )
}
