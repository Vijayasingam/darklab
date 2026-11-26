import { useTabsStore } from '../../store/tabs'
import { useUIStore } from '../../store/ui'
import { cn } from '../../lib/utils'
import { Button } from '../ui/button'
import {
  SquaresFour, GitPullRequest, GitBranch, Bell,
  Gear, MagnifyingGlass, Stack, Pulse
} from '@phosphor-icons/react'

interface NavItem {
  icon: React.ReactNode
  label: string
  route: string
  type: string
}

const NAV_ITEMS: NavItem[] = [
  { icon: <SquaresFour size={18} />, label: 'My Work', route: '/my-work', type: 'home' },
  { icon: <GitPullRequest size={18} />, label: 'Merge Requests', route: '/merge-requests', type: 'mr-list' },
  { icon: <GitBranch size={18} />, label: 'Pipelines', route: '/pipelines', type: 'pipeline-list' },
  { icon: <Pulse size={18} />, label: 'Activity', route: '/activity', type: 'activity' },
  { icon: <Stack size={18} />, label: 'Repositories', route: '/repos', type: 'repo-list' }
]

export function IconRail() {
  const openTab = useTabsStore((s) => s.openTab)
  const tabs = useTabsStore((s) => s.tabs)
  const activeTabId = useTabsStore((s) => s.activeTabId)
  const openNotificationPanel = useUIStore((s) => s.openNotificationPanel)
  const openCommandCenter = useUIStore((s) => s.openCommandCenter)

  const activeTab = tabs.find((t) => t.id === activeTabId)

  function navigate(item: NavItem, e: React.MouseEvent): void {
    const isNewTab = e.metaKey || e.ctrlKey
    openTab({ type: item.type as never, title: item.label, icon: '', route: item.route, routeState: {} }, { newTab: isNewTab })
  }

  return (
    <aside className="no-select flex w-[52px] flex-col items-center border-r border-border/50 bg-card py-2">
      {/* macOS traffic light spacer */}
      <div className="h-8 w-full" />

      {/* Search / Command center */}
      <Button
        onClick={openCommandCenter}
        variant="ghost"
        size="icon"
        className="no-drag mb-3 h-9 w-9 text-muted-foreground/70 hover:text-foreground"
        title="Command Center (⌘K)"
      >
        <MagnifyingGlass size={16} />
      </Button>

      <div className="mx-auto mb-2 h-px w-7 bg-muted" />

      {/* Nav items */}
      <nav className="flex flex-col items-center gap-1 no-drag">
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab?.route === item.route
          return (
            <Button
              key={item.route}
              onClick={(e) => navigate(item, e)}
              title={item.label}
              variant="ghost"
              size="icon"
              className={cn(
                'h-9 w-9',
                isActive
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground/70 hover:text-foreground'
              )}
            >
              {item.icon}
            </Button>
          )
        })}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Notifications */}
      <Button
        onClick={openNotificationPanel}
        title="Notifications"
        variant="ghost"
        size="icon"
        className="no-drag mb-1 h-9 w-9 text-muted-foreground/70 hover:text-foreground"
      >
        <Bell size={16} />
      </Button>

      {/* Settings */}
      <Button
        onClick={() => openTab({ type: 'settings' as never, title: 'Settings', icon: '', route: '/settings', routeState: {} })}
        title="Settings"
        variant="ghost"
        size="icon"
        className="no-drag mb-2 h-9 w-9 text-muted-foreground/70 hover:text-foreground"
      >
        <Gear size={16} />
      </Button>
    </aside>
  )
}
