import { useEffect, useMemo, useState } from 'react'
import { Command } from 'cmdk'
import { useUIStore } from '../../store/ui'
import { useTabsStore } from '../../store/tabs'

const COMMANDS = [
  { id: 'my-work', label: 'Go to My Work', route: '/my-work', type: 'home' },
  { id: 'repos', label: 'Go to Repositories', route: '/repos', type: 'repo-list' },
  { id: 'mrs', label: 'Go to Merge Requests', route: '/merge-requests', type: 'mr-list' },
  { id: 'pipelines', label: 'Go to Pipelines', route: '/pipelines', type: 'pipeline-list' },
  { id: 'activity', label: 'Go to Activity', route: '/activity', type: 'activity' },
  { id: 'settings', label: 'Open Settings', route: '/settings', type: 'settings' }
]

export function CommandCenter() {
  const open = useUIStore((s) => s.commandCenterOpen)
  const close = useUIStore((s) => s.closeCommandCenter)
  const openTab = useTabsStore((s) => s.openTab)
  const [query, setQuery] = useState('')

  useEffect(() => {
    function onKeydown(e: KeyboardEvent): void {
      if (e.key === 'Escape') close()
    }
    if (open) {
      window.addEventListener('keydown', onKeydown)
    }
    return () => window.removeEventListener('keydown', onKeydown)
  }, [open, close])

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    if (!q) return COMMANDS
    return COMMANDS.filter((c) => c.label.toLowerCase().includes(q))
  }, [query])

  if (!open) return <></>

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center bg-black/50 pt-[15vh]" onClick={close}>
      <div className="w-full max-w-xl overflow-hidden rounded-xl border border-white/10 bg-base-900 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <Command>
          <Command.Input
            value={query}
            onValueChange={setQuery}
            placeholder="Type a command or search..."
            className="w-full border-b border-white/10 bg-transparent px-4 py-3 text-sm text-neutral-200 outline-none placeholder:text-neutral-600"
          />
          <Command.List className="max-h-[360px] overflow-auto p-1">
            <Command.Empty className="px-3 py-6 text-center text-sm text-neutral-600">No results</Command.Empty>
            {filtered.map((cmd) => (
              <Command.Item
                key={cmd.id}
                onSelect={() => {
                  openTab({ type: cmd.type as never, title: cmd.label.replace('Go to ', ''), route: cmd.route, routeState: {} })
                  close()
                }}
                className="cursor-default rounded-md px-3 py-2 text-sm text-neutral-300 data-[selected=true]:bg-white/10 data-[selected=true]:text-neutral-100"
              >
                {cmd.label}
              </Command.Item>
            ))}
          </Command.List>
        </Command>
      </div>
    </div>
  )
}
