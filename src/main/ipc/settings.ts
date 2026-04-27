import { ipcMain, nativeTheme } from 'electron'
import { IPC } from '../../shared/ipc-channels'
import { IPCResult } from '../../shared/types'
import { getStore } from '../services/store'
import { getDb } from '../services/db'

function ok<T>(data: T): IPCResult<T> { return { ok: true, data } }
function fail(error: unknown): IPCResult<never> {
  return { ok: false, error: { code: 'SETTINGS_ERROR', message: error instanceof Error ? error.message : String(error) } }
}

export function registerSettingsHandlers(): void {
  // Get all settings as flat object
  ipcMain.handle(IPC.SETTINGS.GET_ALL, (): IPCResult<unknown> => {
    try {
      const store = getStore()
      return ok({
        theme: store.get('theme') ?? 'dark',
        onboardingComplete: store.get('onboardingComplete') ?? false,
        webhook: store.get('webhook') ?? { enabled: false, port: 9987, secret: '' }
      })
    } catch (err) { return fail(err) }
  })

  // Set theme
  ipcMain.handle(
    IPC.SETTINGS.SET_THEME,
    (_, theme: 'dark' | 'light' | 'system'): IPCResult<void> => {
      try {
        const store = getStore()
        store.set('theme', theme)
        nativeTheme.themeSource = theme === 'system' ? 'system' : theme
        return ok(undefined)
      } catch (err) { return fail(err) }
    }
  )

  // Complete onboarding
  ipcMain.handle(IPC.SETTINGS.COMPLETE_ONBOARDING, (): IPCResult<void> => {
    try {
      getStore().set('onboardingComplete', true)
      return ok(undefined)
    } catch (err) { return fail(err) }
  })

  // Get polling config for account
  ipcMain.handle(
    IPC.POLLING.GET_CONFIG,
    (_, accountId: string): IPCResult<unknown[]> => {
      try {
        const db = getDb()
        const rows = db.prepare('SELECT * FROM polling_config WHERE account_id = ?').all(accountId)
        return ok(rows)
      } catch (err) { return fail(err) }
    }
  )

  // Save polling interval for entity
  ipcMain.handle(
    IPC.POLLING.SAVE_CONFIG,
    (_, payload: { accountId: string; entity: string; intervalMs: number }): IPCResult<void> => {
      try {
        const db = getDb()
        db.prepare(`
          INSERT INTO polling_config (account_id, entity, interval_seconds, enabled)
          VALUES (?, ?, ?, 1)
          ON CONFLICT(account_id, entity) DO UPDATE SET
            interval_seconds = excluded.interval_seconds,
            enabled = excluded.enabled
        `).run(payload.accountId, payload.entity, payload.intervalMs)
        return ok(undefined)
      } catch (err) { return fail(err) }
    }
  )

  // Webhook settings
  ipcMain.handle(
    IPC.SETTINGS.GET_WEBHOOK,
    (): IPCResult<unknown> => {
      try {
        const store = getStore()
        const webhook = store.get('webhook') ?? { enabled: false, port: 9987, secret: '' }
        // Never expose raw secret — return masked version
        return ok({ ...webhook, secret: webhook.secret ? '***' : '' })
      } catch (err) { return fail(err) }
    }
  )

  ipcMain.handle(
    IPC.SETTINGS.SAVE_WEBHOOK,
    (_, payload: { enabled: boolean; port: number; secret: string }): IPCResult<void> => {
      try {
        const store = getStore()
        const existing = store.get('webhook') ?? { enabled: false, port: 9987, secret: '' }
        // Only update secret if a real value was provided (not the masked placeholder)
        const secret = payload.secret === '***' ? existing.secret : payload.secret
        store.set('webhook', { enabled: payload.enabled, port: payload.port, secret })
        return ok(undefined)
      } catch (err) { return fail(err) }
    }
  )

  // Recent items (command center history)
  ipcMain.handle(
    IPC.SETTINGS.GET_RECENT_ITEMS,
    (): IPCResult<unknown[]> => {
      try {
        return ok(getStore().get('recentItems') ?? [])
      } catch (err) { return fail(err) }
    }
  )

  ipcMain.handle(
    IPC.SETTINGS.ADD_RECENT_ITEM,
    (_, item: unknown): IPCResult<void> => {
      try {
        const store = getStore()
        const recent = store.get('recentItems') ?? []
        const it = item as { id: string }
        const filtered = recent.filter((r: unknown) => (r as { id: string }).id !== it.id)
        store.set('recentItems', [it, ...filtered].slice(0, 20))
        return ok(undefined)
      } catch (err) { return fail(err) }
    }
  )
}
