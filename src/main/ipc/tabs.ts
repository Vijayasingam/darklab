import { ipcMain } from 'electron'
import { IPC } from '../../shared/ipc-channels'
import { IPCResult, AppTab } from '../../shared/types'
import { getStore } from '../services/store'

function ok<T>(data: T): IPCResult<T> { return { ok: true, data } }
function fail(error: unknown): IPCResult<never> {
  return { ok: false, error: { code: 'TABS_ERROR', message: error instanceof Error ? error.message : String(error) } }
}

export function registerTabHandlers(): void {
  ipcMain.handle(IPC.TABS.GET_ALL, (): IPCResult<AppTab[]> => {
    try {
      return ok((getStore().get('tabs') ?? []) as AppTab[])
    } catch (err) { return fail(err) }
  })

  ipcMain.handle(
    IPC.TABS.SAVE_ALL,
    (_, tabs: AppTab[]): IPCResult<void> => {
      try {
        getStore().set('tabs', tabs)
        return ok(undefined)
      } catch (err) { return fail(err) }
    }
  )
}
