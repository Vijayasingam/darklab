import { BrowserWindow, shell } from 'electron'
import { existsSync } from 'fs'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'

let mainWindow: BrowserWindow | null = null

function resolveWindowIconPath(): string | undefined {
  const candidates = [
    join(process.resourcesPath, 'resources', 'icon.png'),
    join(__dirname, '../../resources/icon.png'),
    join(process.cwd(), 'build', 'icon.png')
  ]

  return candidates.find((p) => existsSync(p))
}

export function createWindow(): BrowserWindow {
  const iconPath = resolveWindowIconPath()

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    // Frameless for custom titlebar + macOS traffic lights
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    // Vibrancy (macOS)
    vibrancy: process.platform === 'darwin' ? 'under-window' : undefined,
    visualEffectState: 'active',
    backgroundColor: process.platform === 'darwin' ? '#00000000' : '#0a0a0a',
    frame: process.platform !== 'darwin',
    autoHideMenuBar: true,
    icon: iconPath,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      // Security: disable node integration in renderer
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  // Show window gracefully once ready
  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  // Open anchor links with target="_blank" in system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // Load the renderer
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  return mainWindow
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindow
}
