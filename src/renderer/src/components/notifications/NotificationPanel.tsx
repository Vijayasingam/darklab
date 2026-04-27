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
  }, [accountId])

  if (!open) return <></>

  return (
    <div className="fixed inset-0 z-[180]" onClick={close}>
      <aside className="absolute right-3 top-12 h-[70vh] w-[360px] overflow-hidden rounded-xl border border-white/10 bg-base-900 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-white/10 px-3 py-2.5">
          <p className="text-sm font-medium text-neutral-200">Notifications</p>
          <button onClick={() => markAllMutation.mutate()} className="text-xs text-neutral-500 hover:text-neutral-300">Mark all read</button>
        </div>
        <div className="h-[calc(70vh-44px)] overflow-auto p-1">
          {data.map((n) => (
            <button
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
              className={`w-full rounded-lg px-3 py-2.5 text-left hover:bg-white/5 ${n.read ? 'opacity-60' : ''}`}
            >
              <p className="text-sm text-neutral-200">{n.title}</p>
              <p className="mt-0.5 line-clamp-2 text-xs text-neutral-500">{n.body}</p>
              <p className="mt-1 text-[11px] text-neutral-600">{formatRelativeTime(n.createdAt)}</p>
            </button>
          ))}
          {data.length === 0 && <p className="py-10 text-center text-sm text-neutral-600">No notifications</p>}
        </div>
      </aside>
    </div>
  )
}
