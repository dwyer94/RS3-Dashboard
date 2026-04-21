// Cloudflare Worker — production CORS proxy
// Deploy with: wrangler deploy

const ALLOWED_DOMAINS = [
  'apps.runescape.com',
  'secure.runescape.com',
  'services.runescape.com',
  'www.reddit.com',
]

function corsHeaders(): HeadersInit {
  return {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  }
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() })
    }

    const url    = new URL(request.url)
    const target = url.searchParams.get('target')

    if (!target) {
      return new Response(JSON.stringify({ error: 'Missing ?target= parameter' }), {
        status:  400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders() },
      })
    }

    let targetUrl: URL
    try {
      targetUrl = new URL(target)
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid target URL' }), {
        status:  400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders() },
      })
    }

    const allowed = ALLOWED_DOMAINS.some(
      d => targetUrl.hostname === d || targetUrl.hostname.endsWith(`.${d}`),
    )

    if (!allowed) {
      return new Response(JSON.stringify({ error: `Domain not allowed: ${targetUrl.hostname}` }), {
        status:  403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders() },
      })
    }

    try {
      const upstream = await fetch(target, { headers: { 'User-Agent': 'RS3Dashboard/1.0' } })
      const body     = await upstream.arrayBuffer()

      const responseHeaders = new Headers(corsHeaders())
      const ct = upstream.headers.get('content-type')
      if (ct) responseHeaders.set('Content-Type', ct)

      return new Response(body, {
        status:  upstream.status,
        headers: responseHeaders,
      })
    } catch (err) {
      return new Response(JSON.stringify({ error: 'Upstream request failed' }), {
        status:  502,
        headers: { 'Content-Type': 'application/json', ...corsHeaders() },
      })
    }
  },
}
