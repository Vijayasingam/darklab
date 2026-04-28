import { TypographyH1, TypographyH2, TypographyP, TypographySpan } from '../components/ui/typography'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { IPC } from '@shared/ipc-channels'
import { Account } from '@shared/types'
import { invoke } from '../lib/ipc'
import { useAccountStore } from '../store/account'

interface AppSettings {
  theme?: 'dark' | 'light' | 'system'
}

interface SettingsPageProps {
  section?: string
}

const SECTIONS = ['accounts', 'notifications', 'appearance', 'updates', 'advanced'] as const

export function SettingsPage({ section }: SettingsPageProps) {
  const [active, setActive] = useState(section && SECTIONS.includes(section as never) ? section : 'accounts')
  const accountId = useAccountStore((s) => s.activeAccountId)
  const setActiveAccountId = useAccountStore((s) => s.setActiveAccountId)
  const qc = useQueryClient()

  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ['accounts'],
    queryFn: () => invoke<Account[]>(IPC.AUTH.LIST_ACCOUNTS)
  })

  const { data: settings } = useQuery<AppSettings>({
    queryKey: ['settings-all'],
    queryFn: () => invoke<AppSettings>(IPC.SETTINGS.GET_ALL)
  })

  const addPatMutation = useMutation({
    mutationFn: (payload: { baseUrl: string; pat: string }) => invoke<Account>(IPC.AUTH.ADD_ACCOUNT_PAT, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts'] })
  })

  const switchAccountMutation = useMutation({
    mutationFn: (id: string) => invoke<void>(IPC.AUTH.SWITCH_ACCOUNT, id),
    onSuccess: (_, id) => setActiveAccountId(id)
  })

  const removeAccountMutation = useMutation({
    mutationFn: (id: string) => invoke<void>(IPC.AUTH.REMOVE_ACCOUNT, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts'] })
  })

  const setThemeMutation = useMutation({
    mutationFn: (theme: 'dark' | 'light' | 'system') => invoke<void>(IPC.SETTINGS.SET_THEME, theme),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings-all'] })
  })

  return (
    <div className="flex h-full overflow-hidden">
      <aside className="w-[220px] flex-shrink-0 border-r border-white/5 bg-base-900 p-3">
        <TypographyH1 className="mb-3 px-2 text-sm font-semibold text-neutral-200">Settings</TypographyH1>
        <nav className="space-y-1">
          {SECTIONS.map((s) => (
            <Button
              key={s}
              onClick={() => setActive(s)}
              variant="ghost"
              className={`w-full rounded px-2 py-1.5 text-left text-sm ${active === s ? 'bg-white/10 text-neutral-100' : 'text-neutral-500 hover:text-neutral-300 hover:bg-white/5'}`}
            >
              {s[0].toUpperCase() + s.slice(1)}
            </Button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 overflow-auto px-6 py-6">
        {active === 'accounts' && (
          <AccountsSection
            accounts={accounts}
            activeAccountId={accountId}
            onSwitch={(id) => switchAccountMutation.mutate(id)}
            onRemove={(id) => removeAccountMutation.mutate(id)}
            onAddPat={(p) => addPatMutation.mutate(p)}
          />
        )}

        {active === 'appearance' && (
          <section className="max-w-lg">
            <TypographyH2 className="mb-3 text-lg font-semibold text-neutral-100">Appearance</TypographyH2>
            <TypographyP className="mb-3 text-sm text-neutral-500">Choose app theme.</TypographyP>
            <div className="flex gap-2">
              {(['dark', 'light', 'system'] as const).map((t) => (
                <Button
                  key={t}
                  onClick={() => setThemeMutation.mutate(t)}
                  variant={settings?.theme === t ? 'outline' : 'ghost'}
                  className={`h-auto rounded-lg border px-3 py-1.5 text-sm ${settings?.theme === t ? 'border-accent-500 text-accent-400' : 'border-white/10 text-neutral-300 hover:bg-white/5'}`}
                >
                  {t}
                </Button>
              ))}
            </div>
          </section>
        )}

        {active !== 'accounts' && active !== 'appearance' && (
          <section>
            <TypographyH2 className="mb-2 text-lg font-semibold text-neutral-100">{active[0].toUpperCase() + active.slice(1)}</TypographyH2>
            <TypographyP className="text-sm text-neutral-500">This section is scaffolded and ready for feature wiring.</TypographyP>
          </section>
        )}
      </main>
    </div>
  )
}

function AccountsSection({
  accounts,
  activeAccountId,
  onSwitch,
  onRemove,
  onAddPat
}: {
  accounts: Account[]
  activeAccountId: string
  onSwitch: (id: string) => void
  onRemove: (id: string) => void
  onAddPat: (payload: { baseUrl: string; pat: string }) => void
}) {
  const [baseUrl, setBaseUrl] = useState('https://gitlab.com')
  const [pat, setPat] = useState('')

  return (
    <section className="max-w-xl">
      <TypographyH2 className="mb-3 text-lg font-semibold text-neutral-100">Accounts</TypographyH2>
      <TypographyP className="mb-4 text-sm text-neutral-500">Add a GitLab account using a personal access token.</TypographyP>

      <div className="mb-6 rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="space-y-2">
          <Input
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            className="w-full text-sm"
            placeholder="https://gitlab.com"
          />
          <Input
            value={pat}
            onChange={(e) => setPat(e.target.value)}
            className="w-full text-sm"
            placeholder="Personal access token"
          />
          <Button
            onClick={() => onAddPat({ baseUrl, pat })}
            disabled={!pat.trim()}
            className="px-3 py-1.5 text-sm font-medium"
          >
            Add account
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {accounts.map((a) => (
          <div key={a.id} className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2">
            <div className="min-w-0 flex-1">
              <TypographyP className="truncate text-sm text-neutral-200">{a.displayName} ({a.username})</TypographyP>
              <TypographyP className="text-xs text-neutral-600">{a.baseUrl}</TypographyP>
            </div>
            {activeAccountId === a.id ? (
              <TypographySpan className="rounded bg-accent-500/20 px-2 py-0.5 text-xs text-accent-400">Active</TypographySpan>
            ) : (
              <Button onClick={() => onSwitch(a.id)} variant="link" className="h-auto text-xs text-neutral-400 hover:text-neutral-200">Switch</Button>
            )}
            <Button onClick={() => onRemove(a.id)} variant="link" className="h-auto text-xs text-status-failed hover:text-status-failed/80">Remove</Button>
          </div>
        ))}
        {accounts.length === 0 && <TypographyP className="text-sm text-neutral-600">No accounts yet</TypographyP>}
      </div>
    </section>
  )
}
