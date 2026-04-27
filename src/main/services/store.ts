import ElectronStore from 'electron-store'
import { safeStorage } from 'electron'

// ---------------------------------------------------------------------------
// Types stored in electron-store
// ---------------------------------------------------------------------------

interface StoreSchema {
  activeAccountId: string | null
  onboardingComplete: boolean
  theme: 'dark' | 'light' | 'system'
  // Encrypted token blobs keyed by accountId
  tokens: Record<string, string>
  // Tab state persistence
  tabs: unknown
  // Starred repos: Set<`${accountId}:${repoId}`>
  starredRepos: string[]
  // Repo collections
  collections: unknown[]
  // Webhook config
  webhook: {
    enabled: boolean
    port: number
    secret: string
  }
  // Recent command center items
  recentItems: unknown[]
}

const defaults: StoreSchema = {
  activeAccountId: null,
  onboardingComplete: false,
  theme: 'dark',
  tokens: {},
  tabs: null,
  starredRepos: [],
  collections: [],
  webhook: {
    enabled: false,
    port: 9876,
    secret: ''
  },
  recentItems: []
}

let store: ElectronStore<StoreSchema>

export function initStore(): void {
  const StoreCtor = ((ElectronStore as unknown as { default?: typeof ElectronStore }).default ??
    ElectronStore) as typeof ElectronStore

  store = new StoreCtor<StoreSchema>({
    name: 'dark-git-settings',
    defaults,
    clearInvalidConfig: true
  })
}

export function getStore(): ElectronStore<StoreSchema> {
  if (!store) throw new Error('Store not initialised. Call initStore() first.')
  return store
}

// ---------------------------------------------------------------------------
// Token helpers (encrypted via safeStorage)
// ---------------------------------------------------------------------------

export function storeToken(accountId: string, token: string): void {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('Encryption not available on this system')
  }
  const encrypted = safeStorage.encryptString(token)
  const tokens = store.get('tokens', {})
  tokens[accountId] = encrypted.toString('base64')
  store.set('tokens', tokens)
}

export function retrieveToken(accountId: string): string | null {
  if (!safeStorage.isEncryptionAvailable()) return null
  const tokens = store.get('tokens', {})
  const encrypted = tokens[accountId]
  if (!encrypted) return null
  try {
    return safeStorage.decryptString(Buffer.from(encrypted, 'base64'))
  } catch {
    return null
  }
}

export function deleteToken(accountId: string): void {
  const tokens = store.get('tokens', {})
  delete tokens[accountId]
  store.set('tokens', tokens)
}

export function storeRefreshToken(accountId: string, refreshToken: string): void {
  storeToken(`${accountId}:refresh`, refreshToken)
}

export function retrieveRefreshToken(accountId: string): string | null {
  return retrieveToken(`${accountId}:refresh`)
}

export function deleteAllTokens(accountId: string): void {
  deleteToken(accountId)
  deleteToken(`${accountId}:refresh`)
}
