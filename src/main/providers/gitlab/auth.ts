import { shell } from 'electron'
import * as http from 'http'
import * as crypto from 'crypto'
import { URL } from 'url'
import axios from 'axios'
import { storeToken, storeRefreshToken, getStore } from '../../services/store'

// ---------------------------------------------------------------------------
// PAT Auth
// ---------------------------------------------------------------------------

export async function validatePAT(
  accountId: string,
  baseUrl: string,
  pat: string
): Promise<{ valid: boolean; username: string; name: string; avatarUrl: string }> {
  const response = await axios.get(`${baseUrl.replace(/\/$/, '')}/api/v4/user`, {
    headers: { 'PRIVATE-TOKEN': pat },
    timeout: 10_000
  })

  storeToken(accountId, pat)

  return {
    valid: true,
    username: response.data.username,
    name: response.data.name,
    avatarUrl: response.data.avatar_url
  }
}

// ---------------------------------------------------------------------------
// OAuth 2.0 PKCE
// ---------------------------------------------------------------------------

// In-flight PKCE state, keyed by `state` param to prevent CSRF
const pendingOAuth = new Map<string, {
  codeVerifier: string
  resolve: (result: { accessToken: string; refreshToken?: string }) => void
  reject: (err: Error) => void
  server: http.Server
}>()

export async function startOAuthFlow(
  accountId: string,
  baseUrl: string,
  clientId: string
): Promise<{ accessToken: string; refreshToken?: string }> {
  const { codeVerifier, codeChallenge } = generatePKCE()
  const state = crypto.randomBytes(16).toString('hex')
  const redirectUri = 'http://127.0.0.1:9788/oauth/callback'

  // Persist client_id for token refresh later
  const store = getStore()
  store.set(`oauthClientId.${accountId}` as never, clientId)

  const authUrl = new URL(`${baseUrl.replace(/\/$/, '')}/oauth/authorize`)
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('scope', 'api read_user')
  authUrl.searchParams.set('state', state)
  authUrl.searchParams.set('code_challenge', codeChallenge)
  authUrl.searchParams.set('code_challenge_method', 'S256')

  return new Promise((resolve, reject) => {
    // Start loopback redirect server
    const server = http.createServer(async (req, res) => {
      try {
        if (!req.url?.startsWith('/oauth/callback')) {
          res.writeHead(404)
          res.end()
          return
        }

        const url = new URL(`http://127.0.0.1${req.url}`)
        const code = url.searchParams.get('code')
        const returnedState = url.searchParams.get('state')
        const error = url.searchParams.get('error')

        res.writeHead(200, { 'Content-Type': 'text/html' })
        res.end(`
          <html><body style="font-family:system-ui;background:#0a0a0a;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
            <div style="text-align:center">
              <h2 style="color:#f59e0b">Authorization complete</h2>
              <p>You can close this tab and return to dark-git.</p>
            </div>
          </body></html>
        `)

        server.close()

        if (error || !code) {
          reject(new Error(error ?? 'No authorization code received'))
          return
        }

        if (returnedState !== state) {
          reject(new Error('OAuth state mismatch — possible CSRF attack'))
          return
        }

        // Exchange code for tokens
        const pending = pendingOAuth.get(state)
        if (!pending) return

        const tokenResponse = await axios.post(
          `${baseUrl.replace(/\/$/, '')}/oauth/token`,
          new URLSearchParams({
            client_id: clientId,
            code,
            grant_type: 'authorization_code',
            redirect_uri: redirectUri,
            code_verifier: pending.codeVerifier
          }).toString(),
          { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        )

        const { access_token, refresh_token } = tokenResponse.data

        storeToken(accountId, access_token)
        if (refresh_token) {
          storeRefreshToken(accountId, refresh_token)
        }

        pending.resolve({ accessToken: access_token, refreshToken: refresh_token })
        pendingOAuth.delete(state)
      } catch (err) {
        server.close()
        reject(err instanceof Error ? err : new Error(String(err)))
        pendingOAuth.delete(state)
      }
    })

    server.listen(9788, '127.0.0.1', () => {
      pendingOAuth.set(state, { codeVerifier, resolve, reject, server })
      shell.openExternal(authUrl.toString())
    })

    server.on('error', (err) => {
      reject(err)
      pendingOAuth.delete(state)
    })

    // Timeout after 5 minutes
    setTimeout(() => {
      if (pendingOAuth.has(state)) {
        server.close()
        pendingOAuth.delete(state)
        reject(new Error('OAuth flow timed out'))
      }
    }, 5 * 60 * 1000)
  })
}

// ---------------------------------------------------------------------------
// PKCE helpers
// ---------------------------------------------------------------------------

function generatePKCE(): { codeVerifier: string; codeChallenge: string } {
  const codeVerifier = crypto.randomBytes(32).toString('base64url')
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url')
  return { codeVerifier, codeChallenge }
}
