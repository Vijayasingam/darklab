import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { IPC } from '@shared/ipc-channels'
import { on, invoke } from './lib/ipc'
import { useUIStore } from './store/ui'
import { useAccountStore } from './store/account'
import { useTabsStore } from './store/tabs'
import { Shell } from './components/layout/Shell'
import { CommandCenter } from './components/command-center/CommandCenter'
import { NotificationPanel } from './components/notifications/NotificationPanel'

export function App() {
  const openCommandCenter = useUIStore((s) => s.openCommandCenter)
  const setActiveAccountId = useAccountStore((s) => s.setActiveAccountId)
  const closeAllTabs = useTabsStore((s) => s.closeAllTabs)

  const { data: settings } = useQuery<{ theme?: 'dark' | 'light' | 'system' }>({
    queryKey: ['settings-all'],
    queryFn: () => invoke<{ theme?: 'dark' | 'light' | 'system' }>(IPC.SETTINGS.GET_ALL)
  })

  // Bootstrap: load active account ID
  useEffect(() => {
    invoke<string>(IPC.AUTH.GET_ACTIVE_ACCOUNT)
      .then((id) => { if (id) setActiveAccountId(id) })
      .catch(console.error)
  }, [setActiveAccountId])

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')

    const applyTheme = (): void => {
      const selectedTheme = settings?.theme ?? 'dark'
      const resolvedTheme = selectedTheme === 'system'
        ? (media.matches ? 'dark' : 'light')
        : selectedTheme

      document.documentElement.classList.toggle('dark', resolvedTheme === 'dark')
      document.documentElement.classList.toggle('theme-light', resolvedTheme === 'light')
      document.documentElement.dataset.theme = resolvedTheme
      document.documentElement.style.colorScheme = resolvedTheme
    }

    applyTheme()
    media.addEventListener('change', applyTheme)

    return () => media.removeEventListener('change', applyTheme)
  }, [settings?.theme])

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
      on(IPC.AUTH.REAUTH_REQUIRED, (payload) => {
        const { accountId } = payload as { accountId: string }
        console.warn('Re-auth required for account:', accountId)
        // Renderer will show a banner — handled by NotificationPanel
      })
    ]

    return () => unsubs.forEach((fn) => fn())
  }, [openCommandCenter, setActiveAccountId, closeAllTabs])

  return (
    <div className="flex h-full w-full overflow-hidden bg-background text-foreground">
      <Shell />
      <CommandCenter />
      <NotificationPanel />
    </div>
  )
}
