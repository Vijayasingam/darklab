import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'

// ---------------------------------------------------------------------------
// Typed IPC bridge exposed on window.api
// ---------------------------------------------------------------------------

const api = {
  /**
   * Invoke a main-process handler and get back the result.
   * Returns IPCResult<T> — handlers never throw, always return { ok, data/error }.
   */
  invoke<T>(channel: string, ...args: unknown[]): Promise<T> {
    return ipcRenderer.invoke(channel, ...args)
  },

  /**
   * Subscribe to a push event from the main process.
   * Returns an unsubscribe function.
   */
  on(channel: string, callback: (payload: unknown) => void): () => void {
    const handler = (_event: IpcRendererEvent, payload: unknown) => callback(payload)
    ipcRenderer.on(channel, handler)
    return () => ipcRenderer.off(channel, handler)
  },

  /**
   * Subscribe to a push event, fire only once.
   */
  once(channel: string, callback: (payload: unknown) => void): void {
    ipcRenderer.once(channel, (_event, payload) => callback(payload))
  }
}

contextBridge.exposeInMainWorld('api', api)

// Expose type for TypeScript in renderer
export type ElectronAPI = typeof api
