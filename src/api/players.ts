import { apiFetch } from './client'
import { ApiError } from './types'
import type { PlayerProfile, XPMonthlyData } from './types'

const BASE = 'https://apps.runescape.com/runemetrics'

// RuneMetrics skillvalues does not include a name field — look up by id.
const SKILL_NAMES: Record<number, string> = {
   0: 'Attack',        1: 'Defence',      2: 'Strength',
   3: 'Constitution',  4: 'Ranged',       5: 'Prayer',
   6: 'Magic',         7: 'Cooking',      8: 'Woodcutting',
   9: 'Fletching',    10: 'Fishing',     11: 'Firemaking',
  12: 'Crafting',     13: 'Smithing',    14: 'Mining',
  15: 'Herblore',     16: 'Agility',     17: 'Thieving',
  18: 'Slayer',       19: 'Farming',     20: 'Runecrafting',
  21: 'Hunter',       22: 'Construction',23: 'Summoning',
  24: 'Dungeoneering',25: 'Divination',  26: 'Invention',
  27: 'Archaeology',  28: 'Necromancy',
}

interface RawSkill {
  id:    number
  level: number
  xp:    number
  rank:  number
}

interface RawActivity {
  text:    string
  details: string
  date:    string
}

interface RawProfileResponse {
  name:         string
  totalxp:      number
  totalskill:   number
  combatlevel:  number
  skillvalues:  RawSkill[]
  activities:   RawActivity[]
  error?:       string
}

export async function fetchPlayerProfile(rsn: string): Promise<PlayerProfile> {
  const url = `${BASE}/profile/profile?user=${encodeURIComponent(rsn)}&activities=5`
  const raw = await apiFetch<RawProfileResponse>(url)

  if (raw.error) {
    if (raw.error.toLowerCase().includes('private')) {
      throw new ApiError('Profile is private', 403, 'private')
    }
    throw new ApiError('Player not found', 404, 'notfound')
  }

  return {
    rsn:         raw.name,
    totalXP:     raw.totalxp,
    totalLevel:  raw.totalskill,
    combatLevel: raw.combatlevel,
    skills: raw.skillvalues.map(s => ({
      id:    s.id,
      name:  SKILL_NAMES[s.id] ?? `Skill ${s.id}`,
      level: s.level,
      xp:    Math.floor(s.xp / 10),  // RuneMetrics returns xp * 10
      rank:  s.rank,
    })),
    activities: (raw.activities ?? []).map(a => ({
      text:    a.text,
      details: a.details,
      date:    a.date,
    })),
  }
}

interface RawXPMonthlyEntry {
  skillId:       number
  totalXp:       number
  averageXpGain: number
  totalGain:     number
  monthData:     Array<{ xpGain: number; timestamp: number; rank: number }>
}

interface RawXPMonthlyResponse {
  monthlyXpGain: RawXPMonthlyEntry[]
}

export async function fetchXPMonthly(rsn: string, skill?: number): Promise<XPMonthlyData[]> {
  const params = new URLSearchParams({ searchName: rsn })
  if (skill !== undefined) params.set('skillid', String(skill))

  const url = `${BASE}/xp-monthly?${params}`
  const raw = await apiFetch<RawXPMonthlyResponse>(url)

  if (!raw.monthlyXpGain?.length) throw new ApiError('XP data unavailable', 400)

  return raw.monthlyXpGain.map(entry => ({
    skill:  entry.skillId,
    months: entry.monthData.map(m => {
      const d = new Date(m.timestamp)
      return {
        year:     d.getUTCFullYear(),
        month:    d.getUTCMonth() + 1,
        xpGained: m.xpGain,
      }
    }),
  }))
}
