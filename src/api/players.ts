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

interface RawXPResponse {
  month:  Array<{ date: string; skill: number; xp: number }>
  error?: string
}

export async function fetchXPMonthly(rsn: string, skill?: number): Promise<XPMonthlyData[]> {
  const params = new URLSearchParams({ user: rsn, type: 'monthly' })
  if (skill !== undefined) params.set('skill', String(skill))

  const url = `${BASE}/xp?${params}`
  const raw = await apiFetch<RawXPResponse>(url)

  if (raw.error) throw new ApiError('XP data unavailable', 400)

  const bySkill = new Map<number, Array<{ year: number; month: number; xpGained: number }>>()

  for (const entry of raw.month) {
    const d = new Date(entry.date)
    const list = bySkill.get(entry.skill) ?? []
    list.push({ year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, xpGained: entry.xp })
    bySkill.set(entry.skill, list)
  }

  return Array.from(bySkill.entries()).map(([skillId, months]) => ({
    skill: skillId,
    months,
  }))
}
