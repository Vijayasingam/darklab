import { app, BrowserWindow, globalShortcut, nativeImage, shell } from 'electron'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { existsSync } from 'fs'
import { join } from 'path'
import { createWindow, getMainWindow } from './window'
import { registerProtocol } from './protocol'
import { initDb } from './services/db'
import { initStore } from './services/store'
import { initUpdater } from './services/updater'
import { startPolling, stopPolling } from './services/polling'
import { registerAuthHandlers } from './ipc/auth'
import { registerRepoHandlers } from './ipc/repos'
import { registerMRHandlers } from './ipc/mergeRequests'
import { registerPipelineHandlers } from './ipc/pipelines'
import { registerJobHandlers } from './ipc/jobs'
import { registerNotificationHandlers } from './ipc/notifications'
import { registerSettingsHandlers } from './ipc/settings'
import { registerTabHandlers } from './ipc/tabs'
import { registerAppHandlers } from './ipc/app'

// Handle protocol before app ready
registerProtocol()

app.name = 'Darklab'

/**
 * Dev only: packaged builds get their dock icon from build/icon.icns via the
 * app bundle (macOS applies its own squircle mask there). In dev there is no
 * bundle, so the dock would fall back to Electron's default icon — set our
 * icon manually instead. Icons set this way receive NO squircle mask, so the
 * PNG must be full-bleed opaque (baked transparent corners show a white
 * backing plate behind the rounded corners).
 */
function applyDevDockIcon(): void {
  if (!is.dev || process.platform !== 'darwin') return

  const candidates = [
    join(process.cwd(), 'resources', 'icon.png'),
    join(app.getAppPath(), 'resources', 'icon.png')
  ]
  const iconPath = candidates.find((p) => existsSync(p))
  if (!iconPath) return

  // 512px PNG loaded at 2x so the logical size (256pt) matches the dock slot
  const raw = nativeImage.createFromPath(iconPath)
  const icon = nativeImage.createFromBuffer(raw.toPNG(), { scaleFactor: 2.0 })
  app.dock?.setIcon(icon)
}

app.whenReady().then(async () => {
  // Set app user model id for Windows
  electronApp.setAppUserModelId('com.go-dark.darklab')

  applyDevDockIcon()

  // Dev: watch shortcuts; prod: prevent default
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Initialise services
  initStore()
  await initDb()

  // Register all IPC handlers before creating the window
  registerAuthHandlers()
  registerRepoHandlers()
  registerMRHandlers()
  registerPipelineHandlers()
  registerJobHandlers()
  registerNotificationHandlers()
  registerSettingsHandlers()
  registerTabHandlers()
  registerAppHandlers()

  // Create main window
  const mainWindow = createWindow()

  // Auto-updater (production only)
  if (!is.dev) {
    initUpdater(mainWindow)
  }

  // Global shortcut: Cmd+K / Ctrl+K → open command center
  globalShortcut.register('CommandOrControl+K', () => {
    const win = getMainWindow()
    if (win) {
      win.webContents.send('app:open-command-center')
    }
  })

  // Open external links in system browser, not a new Electron window
  app.on('web-contents-created', (_, contents) => {
    contents.setWindowOpenHandler(({ url }) => {
      if (url.startsWith('https://') || url.startsWith('http://')) {
        shell.openExternal(url)
      }
      return { action: 'deny' }
    })
  })

  app.on('activate', () => {
    // macOS: re-create window when dock icon is clicked and no windows exist
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    } else {
      getMainWindow()?.show()
    }
  })

  // Start background polling
  startPolling()
})

app.on('window-all-closed', () => {
  // On macOS stay alive until Cmd+Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
  stopPolling()
})

// Security: prevent navigation to external URLs
app.on('web-contents-created', (_, contents) => {
  contents.on('will-navigate', (event, url) => {
    const parsedUrl = new URL(url)
    // Allow local vite dev server and file protocol only
    if (
      !parsedUrl.protocol.startsWith('file') &&
      !parsedUrl.hostname.startsWith('localhost') &&
      !parsedUrl.hostname.startsWith('127.0.0.1')
    ) {
      event.preventDefault()
    }
  })
})
