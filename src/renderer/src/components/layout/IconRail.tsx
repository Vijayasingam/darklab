import { useTabsStore } from '../../store/tabs'
import { useUIStore } from '../../store/ui'
import { cn } from '../../lib/utils'
import { Button } from '../ui/button'
import {
  LayoutDashboard, GitPullRequest, GitBranch, Bell,
  Settings, Search, Layers, Activity
} from 'lucide-react'

interface NavItem {
  icon: React.ReactNode
  label: string
  route: string
  type: string
}

const NAV_ITEMS: NavItem[] = [
  { icon: <LayoutDashboard size={18} />, label: 'My Work', route: '/my-work', type: 'home' },
  { icon: <GitPullRequest size={18} />, label: 'Merge Requests', route: '/merge-requests', type: 'mr-list' },
  { icon: <GitBranch size={18} />, label: 'Pipelines', route: '/pipelines', type: 'pipeline-list' },
  { icon: <Activity size={18} />, label: 'Activity', route: '/activity', type: 'activity' },
  { icon: <Layers size={18} />, label: 'Repositories', route: '/repos', type: 'repo-list' }
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
    <aside className="no-select flex w-[52px] flex-col items-center border-r border-white/5 bg-base-900 py-2">
      {/* macOS traffic light spacer */}
      <div className="h-8 w-full" />

      {/* Search / Command center */}
      <Button
        onClick={openCommandCenter}
        variant="ghost"
        size="icon"
        className="no-drag mb-3 h-9 w-9 text-neutral-500 hover:text-neutral-200"
        title="Command Center (⌘K)"
      >
        <Search size={16} />
      </Button>

      <div className="mx-auto mb-2 h-px w-7 bg-white/10" />

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
                'h-9 w-9 rounded-lg',
                isActive
                  ? 'bg-accent-500/15 text-accent-400'
                  : 'text-neutral-500 hover:text-neutral-200'
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
        className="no-drag mb-1 h-9 w-9 text-neutral-500 hover:text-neutral-200"
      >
        <Bell size={16} />
      </Button>

      {/* Settings */}
      <Button
        onClick={() => openTab({ type: 'settings' as never, title: 'Settings', icon: '', route: '/settings', routeState: {} })}
        title="Settings"
        variant="ghost"
        size="icon"
        className="no-drag mb-2 h-9 w-9 text-neutral-500 hover:text-neutral-200"
      >
        <Settings size={16} />
      </Button>
    </aside>
  )
}
