import { useEffect, lazy, Suspense } from 'react'
import { IPC } from '@shared/ipc-channels'
import { on, invoke } from './lib/ipc'
import { useUIStore } from './store/ui'
import { useAccountStore } from './store/account'
import { useTabsStore } from './store/tabs'
import { Shell } from './components/layout/Shell'
import { CommandCenter } from './components/command-center/CommandCenter'
import { NotificationPanel } from './components/notifications/NotificationPanel'

export function App(): JSX.Element {
  const openCommandCenter = useUIStore((s) => s.openCommandCenter)
  const setActiveAccountId = useAccountStore((s) => s.setActiveAccountId)
  const closeAllTabs = useTabsStore((s) => s.closeAllTabs)

  // Bootstrap: load active account ID
  useEffect(() => {
    invoke<string>(IPC.AUTH.GET_ACTIVE_ACCOUNT)
      .then((id) => { if (id) setActiveAccountId(id) })
      .catch(console.error)
  }, [])

  // Listen for push events from main process
  useEffect(() => {
    const unsubs = [
      // Command center shortcut (Cmd+K in main process)
      on(IPC.APP.OPEN_COMMAND_CENTER, () => openCommandCenter()),

      // Account switch from settings: close all tabs, update active
      on(IPC.AUTH.SWITCH_ACCOUNT, (payload) => {
        const { accountId } = payload as { accountId: string }
        setActiveAccountId(accountId)
        closeAllTabs()
      }),

      // Re-auth required (OAuth token expired unrecoverably)
      on('auth:reauth-required', (payload) => {
        const { accountId } = payload as { accountId: string }
        console.warn('Re-auth required for account:', accountId)
        // Renderer will show a banner — handled by NotificationPanel
      })
    ]

    return () => unsubs.forEach((fn) => fn())
  }, [openCommandCenter, setActiveAccountId, closeAllTabs])

  return (
    <div className="flex h-full w-full overflow-hidden bg-base-950 text-neutral-200">
      <Shell />
      <CommandCenter />
      <NotificationPanel />
    </div>
  )
}
