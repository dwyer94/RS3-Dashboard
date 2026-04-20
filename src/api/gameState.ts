import { apiFetch } from './client'
import type { VoSData, VoSHistoryEntry, TMSData, TMSItem, NewsItem } from './types'

const WEIRD_GLOOP = 'https://api.weirdgloop.org'
const HISCORES_BASE = 'https://secure.runescape.com/m=hiscore'

// ── Voice of Seren ───────────────────────────────────────────────────────────

interface RawVoS {
  district_1: string
  district_2: string
  timestamp:  string
}

export async function fetchVoS(): Promise<VoSData> {
  const raw = await apiFetch<RawVoS>(`${WEIRD_GLOOP}/runescape/vos/current`)
  return {
    districts:   [raw.district_1, raw.district_2],
    nextRotation: new Date(raw.timestamp),
  }
}

interface RawVoSHistory {
  data: Array<{ district_1: string; district_2: string; timestamp: string }>
}

export async function fetchVoSHistory(): Promise<VoSHistoryEntry[]> {
  const raw = await apiFetch<RawVoSHistory>(`${WEIRD_GLOOP}/runescape/vos`)
  return raw.data.map(entry => ({
    hour:      entry.timestamp,
    districts: [entry.district_1, entry.district_2],
  }))
}

// ── Travelling Merchant's Shop ────────────────────────────────────────────────

interface RawTMSItem {
  name:   string
  url:    string
  noted?: boolean
}

interface RawTMS {
  today:     RawTMSItem[]
  tomorrow?: RawTMSItem[]
  date:      string
}

const HIGH_VALUE_ITEMS = new Set([
  "Barrel of brine",
  "Deathtouched dart",
  "Dungeoneering wildcard",
  "Harmonic dust",
  "Silverhawk down",
])

function mapTMSItem(raw: RawTMSItem): TMSItem {
  return {
    name:        raw.name,
    wikiUrl:     raw.url,
    isHighValue: HIGH_VALUE_ITEMS.has(raw.name),
  }
}

export async function fetchTMS(): Promise<TMSData> {
  const raw = await apiFetch<RawTMS>(`${WEIRD_GLOOP}/runescape/tms/current`)

  const resetDate = new Date(raw.date)
  resetDate.setUTCDate(resetDate.getUTCDate() + 1)
  resetDate.setUTCHours(0, 0, 0, 0)

  return {
    today:     raw.today.map(mapTMSItem),
    tomorrow:  (raw.tomorrow ?? []).map(mapTMSItem),
    resetTime: resetDate,
  }
}

// ── RS3 News ─────────────────────────────────────────────────────────────────

interface RawNewsItem {
  title:    string
  date:     string
  category: string
  link:     string
}

interface RawNewsResponse {
  data: RawNewsItem[]
}

export async function fetchRS3News(): Promise<NewsItem[]> {
  const raw = await apiFetch<RawNewsResponse>(`${WEIRD_GLOOP}/runescape/social/posts`)
  return raw.data.map(item => ({
    title:    item.title,
    date:     item.date,
    category: item.category,
    url:      item.link,
  }))
}

// ── Hiscores ─────────────────────────────────────────────────────────────────

interface RawHiscoreRow {
  name:  string
  rank:  number
  level: number
  xp:    number
}

export async function fetchHiscores(skill: string): Promise<RawHiscoreRow[]> {
  const url = `${HISCORES_BASE}/ranking?table=${encodeURIComponent(skill)}&category_type=0&size=50`
  return apiFetch<RawHiscoreRow[]>(url)
}
