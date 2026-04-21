import type { VoSData, VoSHistoryEntry, NewsItem } from '../types'

function msUntilNextHour(): number {
  const now = new Date()
  const msIntoHour = (now.getUTCMinutes() * 60 + now.getUTCSeconds()) * 1000 + now.getUTCMilliseconds()
  return 3_600_000 - msIntoHour
}

export const mockVoS: VoSData = {
  districts:    ['Cadarn', 'Ithell'],
  nextRotation: new Date(Date.now() + msUntilNextHour()),
}

export const mockVoSHistory: VoSHistoryEntry[] = [
  { hour: new Date(Date.now() - 1 * 3600_000).toISOString(), districts: ['Cadarn',   'Ithell']   },
  { hour: new Date(Date.now() - 2 * 3600_000).toISOString(), districts: ['Amlodd',   'Crwys']    },
  { hour: new Date(Date.now() - 3 * 3600_000).toISOString(), districts: ['Hefin',    'Meilyr']   },
  { hour: new Date(Date.now() - 4 * 3600_000).toISOString(), districts: ['Trahaearn','Iorwerth']  },
  { hour: new Date(Date.now() - 5 * 3600_000).toISOString(), districts: ['Cadarn',   'Crwys']    },
]

export const mockNews: NewsItem[] = [
  { title: 'Necromancy: The Lost Grove Expansion',   date: '2026-04-18T10:00:00.000Z', excerpt: '',                                                          url: 'https://www.reddit.com/r/runescape/comments/mock1/' },
  { title: "April's Premier Club Rewards Revealed",  date: '2026-04-15T10:00:00.000Z', excerpt: 'Find out what exclusive rewards are coming this month.',    url: 'https://www.reddit.com/r/runescape/comments/mock2/' },
  { title: 'Patch Notes - 15 April 2026',            date: '2026-04-15T08:00:00.000Z', excerpt: '',                                                          url: 'https://www.reddit.com/r/runescape/comments/mock3/' },
  { title: 'Double XP LIVE Returns Next Weekend',    date: '2026-04-12T10:00:00.000Z', excerpt: 'Double XP LIVE is back — prepare your stockpiles now.',     url: 'https://www.reddit.com/r/runescape/comments/mock4/' },
  { title: 'Ironman Mode Gets New Restrictions QoL', date: '2026-04-10T10:00:00.000Z', excerpt: '',                                                          url: 'https://www.reddit.com/r/runescape/comments/mock5/' },
]
