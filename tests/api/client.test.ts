import { describe, it, expect, vi, beforeEach } from 'vitest'
import { proxyUrl } from '../../src/api/client'

// Mock config so proxyUrl uses a known value
vi.mock('../../src/config', () => ({
  default: {
    proxyUrl:    'http://localhost:8787',
    useMockData: false,
    appVersion:  '0.1.0',
  },
}))

describe('proxyUrl', () => {
  it('proxies apps.runescape.com URLs', () => {
    const url = 'https://apps.runescape.com/runemetrics/profile/profile?user=Test'
    expect(proxyUrl(url)).toBe(
      `http://localhost:8787?target=${encodeURIComponent(url)}`,
    )
  })

  it('proxies secure.runescape.com URLs', () => {
    const url = 'https://secure.runescape.com/m=hiscore/ranking?table=Slayer'
    expect(proxyUrl(url)).toBe(
      `http://localhost:8787?target=${encodeURIComponent(url)}`,
    )
  })

  it('proxies services.runescape.com URLs', () => {
    const url = 'https://services.runescape.com/m=itemdb_rs/api/graph/561.json'
    expect(proxyUrl(url)).toBe(
      `http://localhost:8787?target=${encodeURIComponent(url)}`,
    )
  })

  it('passes Weird Gloop URLs through without proxy', () => {
    const url = 'https://api.weirdgloop.org/runescape/vos/current'
    expect(proxyUrl(url)).toBe(url)
  })

  it('passes chisel.weirdgloop.org through without proxy', () => {
    const url = 'https://chisel.weirdgloop.org/gazproj/gazbot/rs_dump.json'
    expect(proxyUrl(url)).toBe(url)
  })

  it('passes RS Wiki URLs through without proxy', () => {
    const url = 'https://runescape.wiki/api.php?action=query'
    expect(proxyUrl(url)).toBe(url)
  })
})
