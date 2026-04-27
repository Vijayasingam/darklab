import { Notification, BrowserWindow } from 'electron'
import { AppNotification } from '../../shared/types'

export function dispatchNativeNotification(notification: AppNotification): void {
  if (!Notification.isSupported()) return

  const n = new Notification({
    title: notification.title,
    body: notification.body,
    silent: false
  })

  n.on('click', () => {
    const win = BrowserWindow.getAllWindows()[0]
    if (!win) return

    if (win.isMinimized()) win.restore()
    win.show()
    win.focus()

    // Navigate to the relevant entity
    win.webContents.send('app:navigate', {
      type: notification.entityType === 'mr' ? 'mr-review' : 'pipeline-detail',
      accountId: notification.accountId,
      repoId: notification.repoId,
      ...(notification.entityType === 'mr'
        ? { mrIid: notification.entityId }
        : { pipelineId: notification.entityId })
    })
  })

  n.show()
}

export function dispatchInAppNotification(
  notification: AppNotification,
  win?: BrowserWindow
): void {
  const target = win ?? BrowserWindow.getAllWindows()[0]
  if (!target) return
  target.webContents.send('notification:new', notification)
}
