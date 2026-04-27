import { IPCResult } from '@shared/types'

declare global {
  interface Window {
    api: {
      invoke<T>(channel: string, ...args: unknown[]): Promise<T>
      on(channel: string, callback: (payload: unknown) => void): () => void
      once(channel: string, callback: (payload: unknown) => void): void
    }
  }
}

// ---------------------------------------------------------------------------
// invoke — unwraps IPCResult, throws on error
// ---------------------------------------------------------------------------
export async function invoke<T>(channel: string, ...args: unknown[]): Promise<T> {
  const result = await window.api.invoke<IPCResult<T>>(channel, ...args)
  if (!result.ok) {
    throw new Error(result.error?.message ?? 'Unknown IPC error')
  }
  return result.data as T
}

// ---------------------------------------------------------------------------
// on — subscribes to a push channel, returns cleanup fn
// ---------------------------------------------------------------------------
export function on(channel: string, callback: (payload: unknown) => void): () => void {
  return window.api.on(channel, callback)
}

// ---------------------------------------------------------------------------
// once — subscribes once
// ---------------------------------------------------------------------------
export function once(channel: string, callback: (payload: unknown) => void): void {
  return window.api.once(channel, callback)
}
