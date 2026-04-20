import type { VoSData, VoSHistoryEntry, TMSData, NewsItem } from '../types'

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

export const mockTMS: TMSData = {
  today: [
    { name: 'Barrel of brine',          wikiUrl: 'https://runescape.wiki/w/Barrel_of_brine',          isHighValue: true  },
    { name: 'Magic stone',              wikiUrl: 'https://runescape.wiki/w/Magic_stone',              isHighValue: false },
    { name: 'Uncharted island map',     wikiUrl: 'https://runescape.wiki/w/Uncharted_island_map',     isHighValue: false },
    { name: 'Livid plant',             wikiUrl: 'https://runescape.wiki/w/Livid_plant',             isHighValue: false },
    { name: 'Stardust',                wikiUrl: 'https://runescape.wiki/w/Stardust',                isHighValue: false },
  ],
  tomorrow: [
    { name: 'Silverhawk down',          wikiUrl: 'https://runescape.wiki/w/Silverhawk_down',          isHighValue: true  },
    { name: 'Slayer VIP coupon',        wikiUrl: 'https://runescape.wiki/w/Slayer_VIP_coupon',        isHighValue: false },
    { name: 'Portable skiller',        wikiUrl: 'https://runescape.wiki/w/Portable_skiller',        isHighValue: false },
    { name: 'Harmonic dust',           wikiUrl: 'https://runescape.wiki/w/Harmonic_dust',           isHighValue: true  },
    { name: 'Taijitu',                 wikiUrl: 'https://runescape.wiki/w/Taijitu',                 isHighValue: false },
  ],
  resetTime: (() => {
    const d = new Date()
    d.setUTCDate(d.getUTCDate() + 1)
    d.setUTCHours(0, 0, 0, 0)
    return d
  })(),
}

export const mockNews: NewsItem[] = [
  { title: 'Necromancy: The Lost Grove Expansion',  date: '2026-04-18', category: 'Game Update',   url: 'https://runescape.com/news' },
  { title: 'April\'s Premier Club Rewards Revealed', date: '2026-04-15', category: 'Announcements', url: 'https://runescape.com/news' },
  { title: 'Patch Notes - 15 April 2026',            date: '2026-04-15', category: 'Patch Notes',   url: 'https://runescape.com/news' },
  { title: 'Double XP LIVE Returns Next Weekend',    date: '2026-04-12', category: 'Promotions',    url: 'https://runescape.com/news' },
  { title: 'Ironman Mode Gets New Restrictions QoL', date: '2026-04-10', category: 'Game Update',   url: 'https://runescape.com/news' },
]
