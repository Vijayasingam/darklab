import { ipcMain, shell, app } from 'electron'
import { IPC } from '../../shared/ipc-channels'
import { IPCResult } from '../../shared/types'

function ok<T>(data: T): IPCResult<T> { return { ok: true, data } }
function fail(error: unknown): IPCResult<never> {
  return { ok: false, error: { code: 'APP_ERROR', message: error instanceof Error ? error.message : String(error) } }
}

export function registerAppHandlers(): void {
  // Open URL in default browser — only allow http(s) to prevent protocol abuse
  ipcMain.handle(
    IPC.APP.OPEN_EXTERNAL,
    (_, url: string): IPCResult<void> => {
      try {
        const parsed = new URL(url)
        if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
          throw new Error(`Blocked non-http URL: ${url}`)
        }
        shell.openExternal(url)
        return ok(undefined)
      } catch (err) { return fail(err) }
    }
  )

  // Get app version
  ipcMain.handle(IPC.APP.GET_VERSION, (): IPCResult<string> => {
    return ok(app.getVersion())
  })

  // Quit and install pending update
  ipcMain.handle(IPC.APP.QUIT_AND_INSTALL, (): IPCResult<void> => {
    try {
      const { autoUpdater } = require('electron-updater')
      autoUpdater.quitAndInstall()
      return ok(undefined)
    } catch (err) { return fail(err) }
  })
}
