import { ipcMain } from 'electron'
import { IPC } from '../../shared/ipc-channels'
import { IPCResult, NotificationPreferences } from '../../shared/types'
import { getDb } from '../services/db'
import { getStore } from '../services/store'

function ok<T>(data: T): IPCResult<T> { return { ok: true, data } }
function fail(error: unknown): IPCResult<never> {
  return { ok: false, error: { code: 'DB_ERROR', message: error instanceof Error ? error.message : String(error) } }
}

export function registerNotificationHandlers(): void {
  // List recent notifications from DB log
  ipcMain.handle(
    IPC.NOTIFICATION.LIST,
    (_, payload?: { accountId?: string; limit?: number; unreadOnly?: boolean }): IPCResult<unknown[]> => {
      try {
        const db = getDb()
        const accountId = payload?.accountId ?? getStore().get('activeAccountId')
        const limit = payload?.limit ?? 100

        let query = 'SELECT * FROM notification_log WHERE account_id = ?'
        const params: unknown[] = [accountId]
        if (payload?.unreadOnly) {
          query += ' AND read = 0'
        }
        query += ' ORDER BY created_at DESC LIMIT ?'
        params.push(limit)

        const rows = db.prepare(query).all(...params)
        return ok(rows)
      } catch (err) { return fail(err) }
    }
  )

  // Mark single notification as read
  ipcMain.handle(
    IPC.NOTIFICATION.MARK_READ,
    (_, notificationId: string): IPCResult<void> => {
      try {
        const db = getDb()
        db.prepare('UPDATE notification_log SET read = 1 WHERE id = ?')
          .run(notificationId)
        return ok(undefined)
      } catch (err) { return fail(err) }
    }
  )

  // Mark all as read for account
  ipcMain.handle(
    IPC.NOTIFICATION.MARK_ALL_READ,
    (_, accountId: string): IPCResult<void> => {
      try {
        const db = getDb()
        db.prepare('UPDATE notification_log SET read = 1 WHERE account_id = ? AND read = 0')
          .run(accountId)
        return ok(undefined)
      } catch (err) { return fail(err) }
    }
  )

  // Get notification preferences for account
  ipcMain.handle(
    IPC.NOTIFICATION.GET_PREFERENCES,
    (_, accountId: string): IPCResult<unknown> => {
      try {
        const db = getDb()
        const row = db.prepare('SELECT * FROM notification_preferences WHERE account_id = ?').get(accountId)
        return ok(row ?? null)
      } catch (err) { return fail(err) }
    }
  )

  // Save notification preferences
  ipcMain.handle(
    IPC.NOTIFICATION.SAVE_PREFERENCES,
    (_, payload: { accountId: string; preferences: Partial<NotificationPreferences> }): IPCResult<void> => {
      try {
        const db = getDb()
        const { accountId, preferences } = payload
        db.prepare(`
          INSERT INTO notification_preferences (
            account_id,
            enabled_events_json,
            quiet_hours_start,
            quiet_hours_end,
            sound_enabled,
            native_enabled,
            in_app_enabled
          )
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(account_id) DO UPDATE SET
            enabled_events_json = excluded.enabled_events_json,
            quiet_hours_start = excluded.quiet_hours_start,
            quiet_hours_end = excluded.quiet_hours_end,
            sound_enabled = excluded.sound_enabled,
            native_enabled = excluded.native_enabled,
            in_app_enabled = excluded.in_app_enabled
        `).run(
          accountId,
          JSON.stringify(preferences.enabledEvents ?? []),
          preferences.quietHoursStart ?? null,
          preferences.quietHoursEnd ?? null,
          preferences.soundEnabled === false ? 0 : 1,
          preferences.nativeEnabled === false ? 0 : 1,
          preferences.inAppEnabled === false ? 0 : 1
        )
        return ok(undefined)
      } catch (err) { return fail(err) }
    }
  )

  // Snooze an MR
  ipcMain.handle(
    IPC.NOTIFICATION.SNOOZE_MR,
    (_, payload: { accountId: string; repoId: number; mrIid: number; until: string }): IPCResult<void> => {
      try {
        const db = getDb()
        db.prepare(`
          INSERT OR REPLACE INTO snoozed_mrs (account_id, repo_id, mr_iid, snoozed_until)
          VALUES (?, ?, ?, ?)
        `).run(payload.accountId, payload.repoId, payload.mrIid, payload.until)
        return ok(undefined)
      } catch (err) { return fail(err) }
    }
  )

  // Unsnooze an MR
  ipcMain.handle(
    IPC.NOTIFICATION.UNSNOOZE_MR,
    (_, payload: { accountId: string; repoId: number; mrIid: number }): IPCResult<void> => {
      try {
        const db = getDb()
        db.prepare('DELETE FROM snoozed_mrs WHERE account_id = ? AND repo_id = ? AND mr_iid = ?')
          .run(payload.accountId, payload.repoId, payload.mrIid)
        return ok(undefined)
      } catch (err) { return fail(err) }
    }
  )

  // Mute a repo
  ipcMain.handle(
    IPC.NOTIFICATION.MUTE_REPO,
    (_, payload: { accountId: string; repoId: number }): IPCResult<void> => {
      try {
        const db = getDb()
        db.prepare(`
          INSERT OR IGNORE INTO muted_repos (account_id, repo_id)
          VALUES (?, ?)
        `).run(payload.accountId, payload.repoId)
        return ok(undefined)
      } catch (err) { return fail(err) }
    }
  )

  // Unmute a repo
  ipcMain.handle(
    IPC.NOTIFICATION.UNMUTE_REPO,
    (_, payload: { accountId: string; repoId: number }): IPCResult<void> => {
      try {
        const db = getDb()
        db.prepare('DELETE FROM muted_repos WHERE account_id = ? AND repo_id = ?')
          .run(payload.accountId, payload.repoId)
        return ok(undefined)
      } catch (err) { return fail(err) }
    }
  )

  // List snoozed MRs
  ipcMain.handle(
    IPC.NOTIFICATION.LIST_SNOOZED,
    (_, accountId: string): IPCResult<unknown[]> => {
      try {
        const db = getDb()
        const rows = db.prepare('SELECT * FROM snoozed_mrs WHERE account_id = ?').all(accountId)
        return ok(rows)
      } catch (err) { return fail(err) }
    }
  )

  // List muted repos
  ipcMain.handle(
    IPC.NOTIFICATION.LIST_MUTED,
    (_, accountId: string): IPCResult<unknown[]> => {
      try {
        const db = getDb()
        const rows = db.prepare('SELECT * FROM muted_repos WHERE account_id = ?').all(accountId)
        return ok(rows)
      } catch (err) { return fail(err) }
    }
  )

  // Activity feed
  ipcMain.handle(
    IPC.ACTIVITY.LIST,
    async (_, payload: { repoId?: number; accountId?: string; page?: number; perPage?: number }): Promise<IPCResult<unknown[]>> => {
      try {
        const { getRegistry } = await import('../providers/registry')
        const accountId = payload.accountId ?? getStore().get('activeAccountId') ?? ''
        const provider = getRegistry().getOrThrow(accountId)
        const events = await provider.listActivity({ repoId: payload.repoId, page: payload.page, perPage: payload.perPage })
        return ok(events)
      } catch (err) { return fail(err) }
    }
  )
}
