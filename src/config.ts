const proxyUrl = import.meta.env.VITE_PROXY_URL
const useMockData = import.meta.env.VITE_USE_MOCK_DATA === 'true'
const appVersion = import.meta.env.VITE_APP_VERSION ?? '0.0.0'

if (!proxyUrl) {
  console.warn('[config] VITE_PROXY_URL is not set — proxied endpoints will fail')
}

const config = {
  proxyUrl: proxyUrl as string,
  useMockData,
  appVersion,
} as const

export default config
