import { ipcMain } from 'electron'
import { IPC } from '../../shared/ipc-channels'
import { IPCResult, Repo } from '../../shared/types'
import { getRegistry } from '../providers/registry'
import { getStore } from '../services/store'

function ok<T>(data: T): IPCResult<T> { return { ok: true, data } }
function fail(error: unknown): IPCResult<never> {
  return { ok: false, error: { code: 'PROVIDER_ERROR', message: error instanceof Error ? error.message : String(error) } }
}

function activeAccountId(): string {
  return getStore().get('activeAccountId') ?? ''
}

export function registerRepoHandlers(): void {
  ipcMain.handle(
    IPC.REPOS.LIST,
    async (_, options?: { page?: number; perPage?: number; search?: string; accountId?: string }): Promise<IPCResult<Repo[]>> => {
      try {
        const accountId = options?.accountId ?? activeAccountId()
        const provider = getRegistry().getOrThrow(accountId)
        const repos = await provider.listRepos(options)
        return ok(repos)
      } catch (err) {
        return fail(err)
      }
    }
  )

  ipcMain.handle(
    IPC.REPOS.GET,
    async (_, repoId: number, accountId?: string): Promise<IPCResult<Repo>> => {
      try {
        const provider = getRegistry().getOrThrow(accountId ?? activeAccountId())
        const repo = await provider.getRepo(repoId)
        return ok(repo)
      } catch (err) {
        return fail(err)
      }
    }
  )

  ipcMain.handle(
    IPC.REPOS.LIST_BRANCHES,
    async (
      _,
      payload: { repoId: number; search?: string; accountId?: string }
    ): Promise<IPCResult<{ name: string; isDefault: boolean }[]>> => {
      try {
        const provider = getRegistry().getOrThrow(payload.accountId ?? activeAccountId())
        const branches = await provider.listBranches(payload.repoId, payload.search)
        return ok(branches)
      } catch (err) {
        return fail(err)
      }
    }
  )

  // Starred repos — managed in electron-store
  ipcMain.handle(IPC.REPOS.LIST_STARRED, (): IPCResult<string[]> => {
    try {
      const store = getStore()
      return ok(store.get('starredRepos') ?? [])
    } catch (err) {
      return fail(err)
    }
  })

  ipcMain.handle(
    IPC.REPOS.STAR,
    (_, repoId: number, accountId?: string): IPCResult<void> => {
      try {
        const store = getStore()
        const key = `${accountId ?? activeAccountId()}:${repoId}`
        const starred = (store.get('starredRepos') ?? []) as string[]
        if (!starred.includes(key)) {
          store.set('starredRepos', [...starred, key])
        }
        return ok(undefined)
      } catch (err) {
        return fail(err)
      }
    }
  )

  ipcMain.handle(
    IPC.REPOS.UNSTAR,
    (_, repoId: number, accountId?: string): IPCResult<void> => {
      try {
        const store = getStore()
        const key = `${accountId ?? activeAccountId()}:${repoId}`
        const starred = (store.get('starredRepos') ?? []) as string[]
        store.set('starredRepos', starred.filter((id: string) => id !== key))
        return ok(undefined)
      } catch (err) {
        return fail(err)
      }
    }
  )

  // Collections
  ipcMain.handle(IPC.REPOS.LIST_COLLECTIONS, (): IPCResult<unknown[]> => {
    try {
      const store = getStore()
      return ok(store.get('collections') ?? [])
    } catch (err) {
      return fail(err)
    }
  })

  ipcMain.handle(
    IPC.REPOS.SAVE_COLLECTION,
    (_, collection: unknown): IPCResult<void> => {
      try {
        const store = getStore()
        const collections = (store.get('collections') ?? []) as unknown[]
        const col = collection as { id: string }
        const existing = collections.findIndex((c) => (c as { id: string }).id === col.id)
        if (existing >= 0) {
          collections[existing] = col
        } else {
          collections.push(col)
        }
        store.set('collections', collections)
        return ok(undefined)
      } catch (err) {
        return fail(err)
      }
    }
  )

  ipcMain.handle(
    IPC.REPOS.DELETE_COLLECTION,
    (_, collectionId: string): IPCResult<void> => {
      try {
        const store = getStore()
        const collections = (store.get('collections') ?? []) as { id: string }[]
        store.set('collections', collections.filter((c) => c.id !== collectionId))
        return ok(undefined)
      } catch (err) {
        return fail(err)
      }
    }
  )
}
