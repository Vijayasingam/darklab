import { autoUpdater } from 'electron-updater'
import { BrowserWindow, dialog } from 'electron'

export function initUpdater(mainWindow: BrowserWindow): void {
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = false

  autoUpdater.on('update-available', (info) => {
    mainWindow.webContents.send('app:update-available', info)
  })

  autoUpdater.on('update-downloaded', (info) => {
    mainWindow.webContents.send('app:update-downloaded', info)

    dialog
      .showMessageBox(mainWindow, {
        type: 'info',
        title: 'Update ready',
        message: `Darklab ${info.version} has been downloaded.`,
        detail: 'Restart the app to apply the update.',
        buttons: ['Restart Now', 'Later'],
        defaultId: 0,
        cancelId: 1
      })
      .then(({ response }) => {
        if (response === 0) {
          autoUpdater.quitAndInstall()
        }
      })
  })

  autoUpdater.on('error', (err) => {
    console.error('Auto-updater error:', err)
  })

  // Check for updates on launch
  autoUpdater.checkForUpdates().catch(console.error)
}
