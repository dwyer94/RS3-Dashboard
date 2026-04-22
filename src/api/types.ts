// ── Player ──────────────────────────────────────────────────────────────────

export interface SkillData {
  id:    number
  name:  string
  level: number
  xp:    number
  rank:  number
}

export interface ActivityEntry {
  text:    string
  details: string
  date:    string
}

export interface PlayerProfile {
  rsn:          string
  totalXP:      number
  totalLevel:   number
  combatLevel:  number
  skills:       SkillData[]
  activities:   ActivityEntry[]
}

export interface MonthlyXP {
  year:     number
  month:    number
  xpGained: number
}

export interface XPMonthlyData {
  skill:  number
  months: MonthlyXP[]
}

// ── Grand Exchange ───────────────────────────────────────────────────────────

export interface GEItem {
  id:       number
  name:     string
  buyLimit: number
  price:    number
  last:     number
  volume:   number
  // icon is not in the rs_dump — Phase 5 must source from RS Wiki by item name
}

export interface GESignals {
  zScore:     number
  percentile: number
  streak:     number
  volumeTier: 'high' | 'medium' | 'low'
}

export interface PricePoint {
  date:  number
  price: number
}

// ── Game State ───────────────────────────────────────────────────────────────

export interface VoSData {
  districts:   [string, string]
  nextRotation: Date
}

export interface VoSHistoryEntry {
  hour:      string   // ISO datetime of rotation
  districts: [string, string]
}


export interface NewsItem {
  title:   string
  date:    string
  excerpt: string
  url:     string
}

// ── API Errors ───────────────────────────────────────────────────────────────

export type ProfileStatus = 'ok' | 'private' | 'notfound'

export class ApiError extends Error {
  status:        number
  profileStatus: ProfileStatus | undefined

  constructor(message: string, status: number, profileStatus?: ProfileStatus) {
    super(message)
    this.name          = 'ApiError'
    this.status        = status
    this.profileStatus = profileStatus
  }
}
