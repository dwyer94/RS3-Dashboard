const proxyUrl = import.meta.env.VITE_PROXY_URL
const useMockData = import.meta.env.VITE_USE_MOCK_DATA === 'true'
const appVersion = import.meta.env.VITE_APP_VERSION ?? '0.0.0'
const dxpScoresUrl = import.meta.env.VITE_DXP_SCORES_URL ?? ''

if (!proxyUrl) {
  console.warn('[config] VITE_PROXY_URL is not set — proxied endpoints will fail')
}
if (!dxpScoresUrl) {
  console.warn('[config] VITE_DXP_SCORES_URL is not set — DXP widget will be unavailable')
}

const config = {
  proxyUrl: proxyUrl as string,
  useMockData,
  appVersion,
  dxpScoresUrl,
} as const

export default config
