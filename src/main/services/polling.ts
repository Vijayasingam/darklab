import { DEFAULT_POLLING_INTERVALS, PollingEntity } from '../../shared/types'
import { getDb } from './db'
import { getStore } from './store'
import { getRegistry } from '../providers/registry'
import { BrowserWindow } from 'electron'

const timers = new Map<string, NodeJS.Timeout>()

const ENTITIES: PollingEntity[] = [
  'myWork',
  'mergeRequests',
  'pipelines',
  'jobs',
  'activity'
]

export function startPolling(): void {
  scheduleAll()
}

export function stopPolling(): void {
  for (const timer of timers.values()) {
    clearInterval(timer)
  }
  timers.clear()
}

export function restartPollingForAccount(accountId: string): void {
  // Clear existing timers for this account
  for (const [key, timer] of timers.entries()) {
    if (key.startsWith(`${accountId}:`)) {
      clearInterval(timer)
      timers.delete(key)
    }
  }
  scheduleForAccount(accountId)
}

function scheduleAll(): void {
  const store = getStore()
  const activeAccountId = store.get('activeAccountId')
  if (!activeAccountId) return
  scheduleForAccount(activeAccountId)
}

function scheduleForAccount(accountId: string): void {
  const db = getDb()

  for (const entity of ENTITIES) {
    const row = db
      .prepare('SELECT interval_seconds, enabled FROM polling_config WHERE account_id = ? AND entity = ?')
      .get(accountId, entity) as { interval_seconds: number; enabled: number } | undefined

    const intervalSeconds = row?.interval_seconds ?? DEFAULT_POLLING_INTERVALS[entity]
    const enabled = row?.enabled !== 0

    if (!enabled) continue

    const key = `${accountId}:${entity}`
    if (timers.has(key)) continue

    const timer = setInterval(
      () => pollEntity(accountId, entity),
      intervalSeconds * 1000
    )

    timers.set(key, timer)
  }
}

async function pollEntity(accountId: string, entity: PollingEntity): Promise<void> {
  try {
    const registry = getRegistry()
    const provider = registry.get(accountId)
    if (!provider) return

    // Each entity type fetches fresh data and diffs against DB cache
    // The provider + DB diff logic will be implemented per entity
    // For now emit a poll tick so the renderer can trigger React Query refetch
    const win = BrowserWindow.getAllWindows()[0]
    if (win) {
      win.webContents.send(`polling:tick:${entity}`, { accountId })
    }
  } catch (err) {
    console.error(`Polling error [${accountId}:${entity}]:`, err)
  }
}
