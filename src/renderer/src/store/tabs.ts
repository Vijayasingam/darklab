import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { AppTab, TabType, TabRouteState } from '@shared/types'

interface TabsState {
  tabs: AppTab[]
  activeTabId: string | null
  // Actions
  openTab: (tab: Omit<AppTab, 'id'>, opts?: { newTab?: boolean }) => void
  closeTab: (tabId: string) => void
  setActiveTab: (tabId: string) => void
  reorderTabs: (from: number, to: number) => void
  closeAllTabs: () => void
  updateTab: (tabId: string, patch: Partial<AppTab>) => void
}

function makeId(): string {
  return crypto.randomUUID()
}

function makeHomeTab(): AppTab {
  return {
    id: makeId(),
    type: 'home',
    title: 'My Work',
    icon: 'layout-dashboard',
    route: '/my-work',
    routeState: {}
  }
}

export const useTabsStore = create<TabsState>()(
  persist(
    (set, get) => ({
      tabs: [makeHomeTab()],
      activeTabId: null,

      openTab(tab, opts) {
        const { tabs, activeTabId } = get()
        const isNewTab = opts?.newTab ?? false

        // If not new tab — update the current active tab in place
        if (!isNewTab && activeTabId) {
          set((state) => ({
            tabs: state.tabs.map((t) =>
              t.id === activeTabId
                ? { ...t, ...tab, id: activeTabId }
                : t
            )
          }))
          return
        }

        // Open new tab
        const newTab: AppTab = { ...tab, id: makeId() }
        set((state) => ({
          tabs: [...state.tabs, newTab],
          activeTabId: newTab.id
        }))
      },

      closeTab(tabId) {
        const { tabs, activeTabId } = get()
        const idx = tabs.findIndex((t) => t.id === tabId)
        const remaining = tabs.filter((t) => t.id !== tabId)

        // Ensure at least one tab (home)
        const next = remaining.length > 0 ? remaining : [makeHomeTab()]

        let nextActiveId = activeTabId
        if (activeTabId === tabId) {
          // Pick the tab to the left, or the first
          const newIdx = Math.max(0, idx - 1)
          nextActiveId = next[newIdx]?.id ?? next[0].id
        }

        set({ tabs: next, activeTabId: nextActiveId })
      },

      setActiveTab(tabId) {
        set({ activeTabId: tabId })
      },

      reorderTabs(from, to) {
        set((state) => {
          const tabs = [...state.tabs]
          const [moved] = tabs.splice(from, 1)
          tabs.splice(to, 0, moved)
          return { tabs }
        })
      },

      closeAllTabs() {
        const home = makeHomeTab()
        set({ tabs: [home], activeTabId: home.id })
      },

      updateTab(tabId, patch) {
        set((state) => ({
          tabs: state.tabs.map((t) => (t.id === tabId ? { ...t, ...patch } : t))
        }))
      }
    }),
    {
      name: 'darkgit-tabs',
      storage: createJSONStorage(() => localStorage)
    }
  )
)
