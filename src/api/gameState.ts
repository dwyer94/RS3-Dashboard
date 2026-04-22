import { apiFetch } from './client'
import type { VoSData, VoSHistoryEntry, NewsItem } from './types'

const WEIRD_GLOOP   = 'https://api.weirdgloop.org'
const REDDIT_BASE   = 'https://www.reddit.com'
const HISCORES_BASE = 'https://secure.runescape.com/m=hiscore'

// ── Voice of Seren ───────────────────────────────────────────────────────────

interface RawVoS {
  district1: string
  district2: string
  timestamp: string
  source:    string
}

export async function fetchVoS(): Promise<VoSData> {
  const raw = await apiFetch<RawVoS>(`${WEIRD_GLOOP}/runescape/vos`)
  return {
    districts:    [raw.district1, raw.district2],
    nextRotation: new Date(new Date(raw.timestamp).getTime() + 3_600_000),
  }
}

interface RawVoSHistory {
  data: Array<{ district1: string; district2: string; timestamp: string }>
}

export async function fetchVoSHistory(): Promise<VoSHistoryEntry[]> {
  const raw = await apiFetch<RawVoSHistory>(`${WEIRD_GLOOP}/runescape/vos/history`)
  return raw.data.map(entry => ({
    hour:      entry.timestamp,
    districts: [entry.district1, entry.district2],
  }))
}

// ── RS3 News (r/runescape "News & Announcements" flair) ──────────────────────

interface RedditPost {
  title:           string
  selftext:        string
  permalink:       string
  created_utc:     number
}

interface RedditListing {
  data: { children: Array<{ data: RedditPost }> }
}

const NEWS_URL = `${REDDIT_BASE}/r/runescape/search.json` +
  `?q=flair%3ANews&sort=new&restrict_sr=on&limit=15`

function decodeHtmlEntities(str: string): string {
  const doc = new DOMParser().parseFromString(str, 'text/html')
  return doc.documentElement.textContent ?? str
}

function stripMarkdown(str: string): string {
  return str
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
}

export async function fetchRS3News(): Promise<NewsItem[]> {
  const raw = await apiFetch<RedditListing>(NEWS_URL)
  return raw.data.children.map(({ data: post }) => ({
    title:   decodeHtmlEntities(post.title),
    date:    new Date(post.created_utc * 1000).toISOString(),
    excerpt: stripMarkdown(decodeHtmlEntities(post.selftext.trim().slice(0, 200))),
    url:     `${REDDIT_BASE}${post.permalink}`,
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
