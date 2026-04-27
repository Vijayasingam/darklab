import { app, BrowserWindow, globalShortcut, shell } from 'electron'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { createWindow, getMainWindow } from './window'
import { createTray } from './tray'
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

app.whenReady().then(async () => {
  // Set app user model id for Windows
  electronApp.setAppUserModelId('com.tidingsia.dark-git')

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

  // System tray
  createTray(mainWindow)

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
