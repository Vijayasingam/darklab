import { app } from 'electron'
import { getMainWindow } from './window'

const PROTOCOL = 'darkgit'

export function registerProtocol(): void {
  // Register as default handler for darkgit:// URIs
  if (process.defaultApp) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [process.argv[1]])
    }
  } else {
    app.setAsDefaultProtocolClient(PROTOCOL)
  }

  // macOS: open-url event fires when the OS hands us a deeplink
  app.on('open-url', (event, url) => {
    event.preventDefault()
    handleDeepLink(url)
  })

  // Windows/Linux: second-instance fires when app is already running
  app.on('second-instance', (_event, argv) => {
    const url = argv.find((arg) => arg.startsWith(`${PROTOCOL}://`))
    if (url) {
      handleDeepLink(url)
    }
    // Focus existing window
    const win = getMainWindow()
    if (win) {
      if (win.isMinimized()) win.restore()
      win.focus()
    }
  })
}

function handleDeepLink(url: string): void {
  try {
    const parsed = new URL(url)

    // OAuth callback: darkgit://oauth/callback?code=xxx&state=xxx
    if (parsed.pathname.startsWith('/oauth/callback') || parsed.host === 'oauth') {
      const code = parsed.searchParams.get('code')
      const state = parsed.searchParams.get('state')
      const error = parsed.searchParams.get('error')

      const win = getMainWindow()
      if (win) {
        win.webContents.send('auth:oauth-callback', { code, state, error })
      }

      // Also emit to main process listeners (auth service handles exchange)
      app.emit('oauth-callback', { code, state, error })
    }
  } catch {
    // Malformed URL — ignore
  }
}
