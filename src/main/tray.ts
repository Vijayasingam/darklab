import { Tray, Menu, nativeImage, BrowserWindow, app } from 'electron'
import { join } from 'path'

let tray: Tray | null = null

export function createTray(mainWindow: BrowserWindow): void {
  const iconPath = join(__dirname, '../../resources/tray-icon.png')
  const icon = nativeImage.createFromPath(iconPath)

  // macOS: use template image (auto adapts to dark/light menu bar)
  if (process.platform === 'darwin') {
    icon.setTemplateImage(true)
  }

  tray = new Tray(icon.resize({ width: 16, height: 16 }))
  tray.setToolTip('dark-git')

  buildContextMenu(mainWindow, 0)

  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.focus()
    } else {
      mainWindow.show()
    }
  })
}

export function updateTrayBadge(unreadCount: number): void {
  if (!tray) return

  // macOS dock badge
  if (process.platform === 'darwin') {
    app.dock.setBadge(unreadCount > 0 ? String(unreadCount) : '')
  }

  // Rebuild context menu with updated count
  const mainWindow = BrowserWindow.getAllWindows()[0]
  if (mainWindow) {
    buildContextMenu(mainWindow, unreadCount)
  }
}

function buildContextMenu(mainWindow: BrowserWindow, unreadCount: number): void {
  if (!tray) return

  const notifLabel =
    unreadCount > 0
      ? `Notifications (${unreadCount} unread)`
      : 'Notifications'

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show dark-git',
      click: () => {
        mainWindow.show()
        mainWindow.focus()
      }
    },
    {
      label: notifLabel,
      click: () => {
        mainWindow.show()
        mainWindow.focus()
        mainWindow.webContents.send('app:navigate', { type: 'notifications' })
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Alt+F4',
      click: () => app.quit()
    }
  ])

  tray.setContextMenu(contextMenu)
}
