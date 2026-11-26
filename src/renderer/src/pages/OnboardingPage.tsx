import { TypographyH1, TypographyP } from '../components/ui/typography'
import { Button } from '../components/ui/button'
import { useMutation } from '@tanstack/react-query'
import { IPC } from '@shared/ipc-channels'
import { invoke } from '../lib/ipc'
import { useTabsStore } from '../store/tabs'

export function OnboardingPage() {
  const openTab = useTabsStore((s) => s.openTab)

  const completeMutation = useMutation({
    mutationFn: () => invoke<void>(IPC.SETTINGS.COMPLETE_ONBOARDING),
    onSuccess: () => {
      openTab({ type: 'home' as never, title: 'My Work', route: '/my-work', routeState: {} })
    }
  })

  return (
    <div className="flex h-full items-center justify-center px-6">
      <div className="max-w-xl border border-border bg-muted p-8 text-center">
        <TypographyP className="mb-2 text-xs uppercase tracking-widest text-primary">Darklab</TypographyP>
        <TypographyH1 className="mb-3 text-2xl font-semibold text-foreground">Review merge requests without browser chaos</TypographyH1>
        <TypographyP className="mb-6 text-sm text-muted-foreground">
          Connect a GitLab account, browse repos, review diffs with inline discussion, and track pipelines in one native desktop app.
        </TypographyP>
        <Button
          onClick={() =>
            openTab({
              type: 'settings' as never,
              title: 'Settings',
              route: '/settings',
              routeState: { section: 'accounts' }
            })
          }
          variant="secondary"
          className="mr-2 px-4 py-2 text-sm font-medium"
        >
          Add account
        </Button>
        <Button
          onClick={() => completeMutation.mutate()}
          className="px-4 py-2 text-sm font-medium"
        >
          Continue
        </Button>
      </div>
    </div>
  )
}
