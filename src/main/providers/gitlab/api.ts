import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios'
import { retrieveToken, retrieveRefreshToken } from '../../services/store'

// Map of accountId → axios instance
const instances = new Map<string, AxiosInstance>()

export function createApiClient(accountId: string, baseUrl: string): AxiosInstance {
  const client = axios.create({
    baseURL: `${baseUrl.replace(/\/$/, '')}/api/v4`,
    timeout: 30_000,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    }
  })

  // Request interceptor — inject current access token
  client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = retrieveToken(accountId)
    if (token) {
      config.headers['PRIVATE-TOKEN'] = token
    }
    return config
  })

  // Response interceptor — handle 401 by refreshing OAuth token
  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true

        try {
          const refreshed = await refreshAccessToken(accountId, baseUrl)
          if (refreshed) {
            // Retry original request with new token
            const newToken = retrieveToken(accountId)
            if (newToken && originalRequest.headers) {
              originalRequest.headers['PRIVATE-TOKEN'] = newToken
            }
            return client(originalRequest)
          }
        } catch {
          // Refresh failed — signal re-auth required
          const { BrowserWindow } = await import('electron')
          BrowserWindow.getAllWindows()[0]?.webContents.send('auth:reauth-required', { accountId })
        }
      }

      return Promise.reject(error)
    }
  )

  instances.set(accountId, client)
  return client
}

export function getApiClient(accountId: string): AxiosInstance {
  const client = instances.get(accountId)
  if (!client) throw new Error(`No API client for account: ${accountId}`)
  return client
}

export function removeApiClient(accountId: string): void {
  instances.delete(accountId)
}

async function refreshAccessToken(accountId: string, baseUrl: string): Promise<boolean> {
  const { getStore } = await import('../../services/store')
  const store = getStore()

  const refreshToken = retrieveRefreshToken(accountId)
  if (!refreshToken) return false

  // Read OAuth client config from store
  const clientId = store.get(`oauthClientId.${accountId}` as never) as string | undefined
  if (!clientId) return false

  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId
  })

  const response = await axios.post(
    `${baseUrl.replace(/\/$/, '')}/oauth/token`,
    params.toString(),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  )

  const { access_token, refresh_token: newRefreshToken } = response.data

  const { storeToken: store_, storeRefreshToken } = await import('../../services/store')
  store_(accountId, access_token)
  if (newRefreshToken) {
    storeRefreshToken(accountId, newRefreshToken)
  }

  return true
}
