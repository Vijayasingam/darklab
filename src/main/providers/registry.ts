import { IGitProvider } from './IGitProvider'

// ---------------------------------------------------------------------------
// ProviderRegistry
// Maps accountId → IGitProvider instance.
// The registry is the single point through which all IPC handlers access providers.
// ---------------------------------------------------------------------------

class ProviderRegistry {
  private providers = new Map<string, IGitProvider>()

  register(accountId: string, provider: IGitProvider): void {
    this.providers.set(accountId, provider)
  }

  unregister(accountId: string): void {
    this.providers.delete(accountId)
  }

  get(accountId: string): IGitProvider | undefined {
    return this.providers.get(accountId)
  }

  getOrThrow(accountId: string): IGitProvider {
    const provider = this.providers.get(accountId)
    if (!provider) {
      throw new Error(`No provider registered for account: ${accountId}`)
    }
    return provider
  }

  has(accountId: string): boolean {
    return this.providers.has(accountId)
  }

  all(): IGitProvider[] {
    return Array.from(this.providers.values())
  }

  clear(): void {
    this.providers.clear()
  }
}

// Singleton
const registry = new ProviderRegistry()

export function getRegistry(): ProviderRegistry {
  return registry
}
