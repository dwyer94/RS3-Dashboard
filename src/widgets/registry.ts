import type { FC } from 'react'
import VoiceOfSeren      from './VoiceOfSeren'
import TravellingMerchant from './TravellingMerchant'
import RS3News            from './RS3News'

export interface WidgetDefinition {
  id:          string
  name:        string
  description: string
  component:   FC
  defaultSize: { w: number; h: number }
  minSize:     { w: number; h: number }
  phase:       number
}

// Phase 3–6 widget components — placeholder until each phase is built
const Placeholder: FC = () => null

export const widgetRegistry: WidgetDefinition[] = [
  // ── Phase 2: Live Game ──────────────────────────────────────────────────────
  {
    id:          'voice-of-seren',
    name:        'Voice of Seren',
    description: 'Current active VoS districts with hourly countdown.',
    component:   VoiceOfSeren,
    defaultSize: { w: 3, h: 3 },
    minSize:     { w: 2, h: 2 },
    phase:       2,
  },
  {
    id:          'travelling-merchant',
    name:        "Travelling Merchant",
    description: "Today's and tomorrow's Travelling Merchant stock.",
    component:   TravellingMerchant,
    defaultSize: { w: 3, h: 4 },
    minSize:     { w: 2, h: 3 },
    phase:       2,
  },
  {
    id:          'rs3-news',
    name:        'RS3 News',
    description: 'Latest RS3 patch notes and news updates.',
    component:   RS3News,
    defaultSize: { w: 6, h: 4 },
    minSize:     { w: 4, h: 3 },
    phase:       2,
  },

  // ── Phase 3: Player ─────────────────────────────────────────────────────────
  {
    id:          'player-skill-snapshot',
    name:        'Skill Snapshot',
    description: 'All skill levels and XP for a tracked player.',
    component:   Placeholder,
    defaultSize: { w: 6, h: 4 },
    minSize:     { w: 4, h: 3 },
    phase:       3,
  },
  {
    id:          'activity-feed',
    name:        'Activity Feed',
    description: 'Recent in-game activities for a tracked player.',
    component:   Placeholder,
    defaultSize: { w: 4, h: 4 },
    minSize:     { w: 3, h: 3 },
    phase:       3,
  },
  {
    id:          'skill-goal-tracker',
    name:        'Skill Goal Tracker',
    description: 'Track XP progress toward a target level.',
    component:   Placeholder,
    defaultSize: { w: 4, h: 3 },
    minSize:     { w: 3, h: 2 },
    phase:       3,
  },

  // ── Phase 4: Social ─────────────────────────────────────────────────────────
  {
    id:          'xp-heatmap',
    name:        'XP Heatmap',
    description: '12-month XP gain calendar heatmap.',
    component:   Placeholder,
    defaultSize: { w: 6, h: 5 },
    minSize:     { w: 4, h: 4 },
    phase:       4,
  },
  {
    id:          'friend-comparison',
    name:        'Friend Comparison',
    description: 'Side-by-side skill comparison across tracked players.',
    component:   Placeholder,
    defaultSize: { w: 6, h: 4 },
    minSize:     { w: 4, h: 3 },
    phase:       4,
  },
  {
    id:          'clan-leaderboard',
    name:        'Clan Leaderboard',
    description: 'Skill-based leaderboard for all tracked players.',
    component:   Placeholder,
    defaultSize: { w: 6, h: 5 },
    minSize:     { w: 4, h: 4 },
    phase:       4,
  },

  // ── Phase 5: Market ─────────────────────────────────────────────────────────
  {
    id:          'market-watchlist',
    name:        'Market Watchlist',
    description: 'Price and signal data for your GE watchlist.',
    component:   Placeholder,
    defaultSize: { w: 12, h: 5 },
    minSize:     { w: 6, h: 4 },
    phase:       5,
  },
  {
    id:          'market-movers',
    name:        'Market Movers',
    description: 'Top GE items by Z-score momentum and volume.',
    component:   Placeholder,
    defaultSize: { w: 12, h: 5 },
    minSize:     { w: 6, h: 4 },
    phase:       5,
  },

  // ── Phase 6: Fun ────────────────────────────────────────────────────────────
  {
    id:          'boss-drop-simulator',
    name:        'Boss Drop Simulator',
    description: 'Simulate boss drop rolls to estimate rates.',
    component:   Placeholder,
    defaultSize: { w: 6, h: 5 },
    minSize:     { w: 4, h: 4 },
    phase:       6,
  },
]

export function getWidgetById(id: string): WidgetDefinition | undefined {
  return widgetRegistry.find(w => w.id === id)
}
