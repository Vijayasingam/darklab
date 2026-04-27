import { useMutation } from '@tanstack/react-query'
import { IPC } from '@shared/ipc-channels'
import { invoke } from '../lib/ipc'
import { useTabsStore } from '../store/tabs'

export function OnboardingPage(): JSX.Element {
  const openTab = useTabsStore((s) => s.openTab)

  const completeMutation = useMutation({
    mutationFn: () => invoke<void>(IPC.SETTINGS.COMPLETE_ONBOARDING),
    onSuccess: () => {
      openTab({ type: 'home' as never, title: 'My Work', route: '/my-work', routeState: {} })
    }
  })

  return (
    <div className="flex h-full items-center justify-center px-6">
      <div className="max-w-xl rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
        <p className="mb-2 text-xs uppercase tracking-widest text-accent-400">dark-git</p>
        <h1 className="mb-3 text-2xl font-semibold text-neutral-100">Review merge requests without browser chaos</h1>
        <p className="mb-6 text-sm text-neutral-400">
          Connect a GitLab account, browse repos, review diffs with inline discussion, and track pipelines in one native desktop app.
        </p>
        <button
          onClick={() =>
            openTab({
              type: 'settings' as never,
              title: 'Settings',
              route: '/settings',
              routeState: { section: 'accounts' }
            })
          }
          className="mr-2 rounded-lg border border-white/15 px-4 py-2 text-sm text-neutral-200 hover:bg-white/5"
        >
          Add account
        </button>
        <button
          onClick={() => completeMutation.mutate()}
          className="rounded-lg bg-accent-500 px-4 py-2 text-sm font-medium text-black"
        >
          Continue
        </button>
      </div>
    </div>
  )
}
