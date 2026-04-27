import { create } from 'zustand'

interface UIState {
  // Command center
  commandCenterOpen: boolean
  openCommandCenter: () => void
  closeCommandCenter: () => void

  // Notification panel (tray-style quick panel)
  notificationPanelOpen: boolean
  openNotificationPanel: () => void
  closeNotificationPanel: () => void

  // Icon rail collapsed state
  iconRailCollapsed: boolean
  toggleIconRail: () => void

  // Detail panel (MR sidebar, job log)
  detailPanelOpen: boolean
  setDetailPanelOpen: (open: boolean) => void
}

export const useUIStore = create<UIState>((set) => ({
  commandCenterOpen: false,
  openCommandCenter: () => set({ commandCenterOpen: true }),
  closeCommandCenter: () => set({ commandCenterOpen: false }),

  notificationPanelOpen: false,
  openNotificationPanel: () => set({ notificationPanelOpen: true }),
  closeNotificationPanel: () => set({ notificationPanelOpen: false }),

  iconRailCollapsed: false,
  toggleIconRail: () => set((s) => ({ iconRailCollapsed: !s.iconRailCollapsed })),

  detailPanelOpen: false,
  setDetailPanelOpen: (open) => set({ detailPanelOpen: open })
}))
