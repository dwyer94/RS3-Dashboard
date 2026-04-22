import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../src/config', () => ({
  default: {
    proxyUrl:    'http://localhost:8787',
    useMockData: false,
    appVersion:  '0.1.0',
  },
}))

// ── fetchGEDump ───────────────────────────────────────────────────────────────

describe('fetchGEDump', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('normalizes dump entries into GEItem shape', async () => {
    const rawDump = {
      '561': { id: 561, name: 'Nature rune', limit: 25000, price: 182, last: 180, volume: 4_800_000 },
      '560': { id: 560, name: 'Death rune',  limit: 25000, price: 234, last: 230, volume: 3_200_000 },
    }

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok:   true,
      json: async () => rawDump,
      text: async () => JSON.stringify(rawDump),
    }))

    const { fetchGEDump } = await import('../../src/api/ge')
    const items = await fetchGEDump()

    expect(items).toHaveLength(2)
    const nature = items.find(i => i.id === 561)
    expect(nature).toMatchObject({
      id:       561,
      name:     'Nature rune',
      buyLimit: 25000,
      price:    182,
      last:     180,
      volume:   4_800_000,
    })
  })

  it('maps dump "limit" field to GEItem "buyLimit"', async () => {
    const rawDump = {
      '4151': { id: 4151, name: 'Abyssal whip', limit: 10, price: 145000, last: 143000, volume: 4200 },
    }

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok:   true,
      json: async () => rawDump,
      text: async () => JSON.stringify(rawDump),
    }))

    const { fetchGEDump } = await import('../../src/api/ge')
    const items = await fetchGEDump()

    expect(items[0].buyLimit).toBe(10)
    // 'limit' should NOT be exposed on the normalized shape
    expect((items[0] as any).limit).toBeUndefined()
  })

  it('returns an empty array when the dump is empty', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok:   true,
      json: async () => ({}),
      text: async () => '{}',
    }))

    const { fetchGEDump } = await import('../../src/api/ge')
    const items = await fetchGEDump()

    expect(items).toEqual([])
  })
})

// ── fetchGEHistory ────────────────────────────────────────────────────────────

describe('fetchGEHistory', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('requests the correct item graph URL via proxy', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok:   true,
      json: async () => ({ daily: { '1700000000000': 182 }, average: {} }),
      text: async () => '',
    })
    vi.stubGlobal('fetch', mockFetch)

    const { fetchGEHistory } = await import('../../src/api/ge')
    await fetchGEHistory(561)

    const calledUrl: string = mockFetch.mock.calls[0][0]
    expect(calledUrl).toContain('services.runescape.com')
    expect(calledUrl).toContain('561.json')
    // Routed through proxy
    expect(calledUrl).toContain('http://localhost:8787')
  })

  it('parses daily prices into sorted PricePoint array', async () => {
    const daily = {
      '1700000000000': 200,
      '1699913600000': 195,
      '1699827200000': 190,
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok:   true,
      json: async () => ({ daily, average: {} }),
      text: async () => '',
    }))

    const { fetchGEHistory } = await import('../../src/api/ge')
    const points = await fetchGEHistory(561)

    expect(points).toHaveLength(3)
    // Should be sorted ascending by date
    expect(points[0].date).toBeLessThan(points[1].date)
    expect(points[1].date).toBeLessThan(points[2].date)
    expect(points[2].price).toBe(200)
  })

  it('returns numeric timestamps (not strings)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok:   true,
      json: async () => ({ daily: { '1700000000000': 100 }, average: {} }),
      text: async () => '',
    }))

    const { fetchGEHistory } = await import('../../src/api/ge')
    const points = await fetchGEHistory(561)

    expect(typeof points[0].date).toBe('number')
    expect(typeof points[0].price).toBe('number')
  })
})
