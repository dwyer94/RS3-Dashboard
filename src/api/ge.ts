import { apiFetch } from './client'
import type { GEItem, PricePoint } from './types'

const DUMP_URL = 'https://chisel.weirdgloop.org/gazproj/gazbot/rs_dump.json'
const GE_GRAPH_BASE = 'https://services.runescape.com/m=itemdb_rs/api/graph'

interface RawDumpEntry {
  id:     number
  name:   string
  limit:  number
  price:  number
  last:   number
  volume: number
}

type RawDump = Record<string, RawDumpEntry>

export async function fetchGEDump(): Promise<GEItem[]> {
  const raw = await apiFetch<RawDump>(DUMP_URL)

  return Object.values(raw).map(entry => ({
    id:       entry.id,
    name:     entry.name,
    buyLimit: entry.limit,
    price:    entry.price,
    last:     entry.last,
    volume:   entry.volume,
  }))
}

interface RawGraphResponse {
  daily:   Record<string, number>
  average: Record<string, number>
}

export async function fetchGEHistory(itemId: number): Promise<PricePoint[]> {
  const url = `${GE_GRAPH_BASE}/${itemId}.json`
  const raw = await apiFetch<RawGraphResponse>(url)

  return Object.entries(raw.daily)
    .map(([timestamp, price]) => ({ date: Number(timestamp), price }))
    .sort((a, b) => a.date - b.date)
}
