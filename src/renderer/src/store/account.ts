import { create } from 'zustand'

interface AccountState {
  activeAccountId: string
  setActiveAccountId: (id: string) => void
}

export const useAccountStore = create<AccountState>((set) => ({
  activeAccountId: '',
  setActiveAccountId: (id) => set({ activeAccountId: id })
}))
