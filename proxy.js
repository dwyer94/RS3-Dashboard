// Local dev CORS proxy — mirrors Cloudflare Worker behavior
// Usage: npm run proxy  (runs on port 8787 to match VITE_PROXY_URL default)

import express from 'express'

const ALLOWED_DOMAINS = [
  'apps.runescape.com',
  'secure.runescape.com',
  'services.runescape.com',
]

const PORT = 8787

const app = express()

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin',  '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  if (req.method === 'OPTIONS') return res.sendStatus(204)
  next()
})

app.get('/', async (req, res) => {
  const target = req.query.target

  if (!target || typeof target !== 'string') {
    return res.status(400).json({ error: 'Missing ?target= parameter' })
  }

  let url
  try {
    url = new URL(target)
  } catch {
    return res.status(400).json({ error: 'Invalid target URL' })
  }

  if (!ALLOWED_DOMAINS.some(d => url.hostname === d || url.hostname.endsWith(`.${d}`))) {
    return res.status(403).json({ error: `Domain not allowed: ${url.hostname}` })
  }

  try {
    const upstream = await fetch(target)
    const body     = await upstream.text()
    res.status(upstream.status)
    const ct = upstream.headers.get('content-type')
    if (ct) res.setHeader('Content-Type', ct)
    res.send(body)
  } catch (err) {
    console.error('[proxy] Upstream error:', err)
    res.status(502).json({ error: 'Upstream request failed' })
  }
})

app.listen(PORT, () => {
  console.log(`[proxy] Running on http://localhost:${PORT}`)
  console.log('[proxy] Allowed domains:', ALLOWED_DOMAINS.join(', '))
})
