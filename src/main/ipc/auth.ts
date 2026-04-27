import { ipcMain } from 'electron'
import { randomUUID } from 'crypto'
import { IPC } from '../../shared/ipc-channels'
import { IPCResult } from '../../shared/types'
import { getRegistry } from '../providers/registry'
import { GitLabProvider } from '../providers/gitlab/index'
import { validatePAT, startOAuthFlow } from '../providers/gitlab/auth'
import { getStore, deleteAllTokens } from '../services/store'
import { getDb } from '../services/db'

// ---------------------------------------------------------------------------
// Helper — wrap handler in try/catch, always return IPCResult<T>
// ---------------------------------------------------------------------------
function ok<T>(data: T): IPCResult<T> {
  return { ok: true, data }
}

function fail(error: unknown): IPCResult<never> {
  const message = error instanceof Error ? error.message : String(error)
  return { ok: false, error: { code: 'PROVIDER_ERROR', message } }
}

// ---------------------------------------------------------------------------
// Register all auth IPC handlers
// ---------------------------------------------------------------------------
export function registerAuthHandlers(): void {
  // List accounts stored in SQLite
  ipcMain.handle(IPC.AUTH.LIST_ACCOUNTS, (): IPCResult<unknown[]> => {
    try {
      const db = getDb()
      const accounts = db.prepare('SELECT * FROM accounts ORDER BY created_at ASC').all()
      return ok(accounts)
    } catch (err) {
      return fail(err)
    }
  })

  // Add account via PAT
  ipcMain.handle(
    IPC.AUTH.ADD_ACCOUNT_PAT,
    async (_, payload: { baseUrl: string; pat: string }): Promise<IPCResult<unknown>> => {
      try {
        const { baseUrl, pat } = payload
        const accountId = randomUUID()

        const { username, name, avatarUrl } = await validatePAT(accountId, baseUrl, pat)

        const db = getDb()
        db.prepare(`
          INSERT OR REPLACE INTO accounts (id, provider, auth_method, base_url, display_name, username, avatar_url, created_at)
          VALUES (?, 'gitlab', 'pat', ?, ?, ?, ?, datetime('now'))
        `).run(accountId, baseUrl, name, username, avatarUrl)

        const provider = new GitLabProvider(accountId, baseUrl)
        getRegistry().register(accountId, provider)

        const store = getStore()
        store.set('activeAccountId', accountId)

        return ok({ accountId, username, name, avatarUrl, baseUrl, provider: 'gitlab' })
      } catch (err) {
        return fail(err)
      }
    }
  )

  // Start OAuth PKCE flow
  ipcMain.handle(
    IPC.AUTH.START_OAUTH,
    async (
      _,
      payload: { baseUrl: string; clientId: string }
    ): Promise<IPCResult<{ accountId: string }>> => {
      try {
        const accountId = randomUUID()
        const { accessToken } = await startOAuthFlow(accountId, payload.baseUrl, payload.clientId)

        // Validate token to get user info
        const { data } = await (await import('axios')).default.get(
          `${payload.baseUrl.replace(/\/$/, '')}/api/v4/user`,
          { headers: { 'PRIVATE-TOKEN': accessToken } }
        )

        const db = getDb()
        db.prepare(`
          INSERT OR REPLACE INTO accounts (id, provider, auth_method, base_url, display_name, username, avatar_url, created_at)
          VALUES (?, 'gitlab', 'oauth', ?, ?, ?, ?, datetime('now'))
        `).run(accountId, payload.baseUrl, data.name, data.username, data.avatar_url)

        const provider = new GitLabProvider(accountId, payload.baseUrl)
        getRegistry().register(accountId, provider)

        const store = getStore()
        store.set('activeAccountId', accountId)

        return ok({ accountId })
      } catch (err) {
        return fail(err)
      }
    }
  )

  // Remove account
  ipcMain.handle(
    IPC.AUTH.REMOVE_ACCOUNT,
    (_, accountId: string): IPCResult<void> => {
      try {
        getRegistry().unregister(accountId)
        deleteAllTokens(accountId)

        const db = getDb()
        db.prepare('DELETE FROM accounts WHERE id = ?').run(accountId)

        const store = getStore()
        const activeId = store.get('activeAccountId')
        if (activeId === accountId) {
          const remaining = db.prepare('SELECT id FROM accounts LIMIT 1').get() as { id: string } | undefined
          store.set('activeAccountId', remaining?.id ?? '')
        }

        return ok(undefined)
      } catch (err) {
        return fail(err)
      }
    }
  )

  // Switch active account
  ipcMain.handle(
    IPC.AUTH.SWITCH_ACCOUNT,
    (_, accountId: string): IPCResult<void> => {
      try {
        const store = getStore()
        store.set('activeAccountId', accountId)
        // Close all tabs handled by renderer on receiving this response
        return ok(undefined)
      } catch (err) {
        return fail(err)
      }
    }
  )

  // Get current user info
  ipcMain.handle(
    IPC.AUTH.GET_CURRENT_USER,
    async (_, accountId: string): Promise<IPCResult<unknown>> => {
      try {
        const provider = getRegistry().getOrThrow(accountId)
        const user = await provider.getCurrentUser()
        return ok(user)
      } catch (err) {
        return fail(err)
      }
    }
  )

  // Get active account ID
  ipcMain.handle(IPC.AUTH.GET_ACTIVE_ACCOUNT, (): IPCResult<string> => {
    try {
      const store = getStore()
      return ok(store.get('activeAccountId') ?? '')
    } catch (err) {
      return fail(err)
    }
  })
}
