import type { FC } from 'react'
import VoiceOfSeren        from './VoiceOfSeren'
import RS3News             from './RS3News'
import PlayerSkillSnapshot from './PlayerSkillSnapshot'
import ActivityFeed        from './ActivityFeed'
import SkillGoalTracker    from './SkillGoalTracker'
import XPHeatmap           from './XPHeatmap'
import FriendComparison    from './FriendComparison'
import ClanLeaderboard     from './ClanLeaderboard'
import MarketWatchlist     from './MarketWatchlist'
import MarketMovers        from './MarketMovers'
import DxpIntelligence     from './DxpIntelligence'
import WorldClock          from './WorldClock'
import ProfileLookup       from './ProfileLookup'

export interface WidgetDefinition {
  id:          string
  name:        string
  description: string
  component:   FC
  defaultSize: { w: number; h: number }
  minSize:     { w: number; h: number }
  phase:       number
}

// Phase 6 widget components — placeholder until built
const Placeholder: FC = () => null

export const widgetRegistry: WidgetDefinition[] = [
  // ── Phase 2: Live Game ──────────────────────────────────────────────────────
  {
    id:          'voice-of-seren',
    name:        'Voice of Seren',
    description: 'Current active VoS districts with hourly countdown.',
    component:   VoiceOfSeren,
    defaultSize: { w: 3, h: 3 },
    minSize:     { w: 1, h: 1 },
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
    id:          'profile-lookup',
    name:        'Profile Lookup',
    description: 'Look up any RS3 player — skills, quests, and recent activities.',
    component:   ProfileLookup,
    defaultSize: { w: 7, h: 7 },
    minSize:     { w: 4, h: 4 },
    phase:       3,
  },
  {
    id:          'player-skill-snapshot',
    name:        'Skill Snapshot',
    description: 'All skill levels and XP for a tracked player.',
    component:   PlayerSkillSnapshot,
    defaultSize: { w: 6, h: 4 },
    minSize:     { w: 4, h: 3 },
    phase:       3,
  },
  {
    id:          'activity-feed',
    name:        'Activity Feed',
    description: 'Recent in-game activities for a tracked player.',
    component:   ActivityFeed,
    defaultSize: { w: 4, h: 4 },
    minSize:     { w: 2, h: 3 },
    phase:       3,
  },
  {
    id:          'skill-goal-tracker',
    name:        'Skill Goal Tracker',
    description: 'Track XP progress toward a target level.',
    component:   SkillGoalTracker,
    defaultSize: { w: 4, h: 3 },
    minSize:     { w: 2, h: 2 },
    phase:       3,
  },

  // ── Phase 4: Social ─────────────────────────────────────────────────────────
  {
    id:          'xp-heatmap',
    name:        'XP Heatmap',
    description: '12-month XP gain calendar heatmap.',
    component:   XPHeatmap,
    defaultSize: { w: 8, h: 8 },
    minSize:     { w: 2, h: 5 },
    phase:       4,
  },
  {
    id:          'friend-comparison',
    name:        'Friend Comparison',
    description: 'Side-by-side skill comparison across tracked players.',
    component:   FriendComparison,
    defaultSize: { w: 6, h: 4 },
    minSize:     { w: 2, h: 3 },
    phase:       4,
  },
  {
    id:          'clan-leaderboard',
    name:        'Player Leaderboard',
    description: 'Skill-based leaderboard for all tracked players.',
    component:   ClanLeaderboard,
    defaultSize: { w: 6, h: 5 },
    minSize:     { w: 4, h: 4 },
    phase:       4,
  },

  // ── Phase 5: Market ─────────────────────────────────────────────────────────
  {
    id:          'market-watchlist',
    name:        'Market Watchlist',
    description: 'Price and signal data for your GE watchlist.',
    component:   MarketWatchlist,
    defaultSize: { w: 12, h: 5 },
    minSize:     { w: 6, h: 4 },
    phase:       5,
  },
  {
    id:          'market-movers',
    name:        'Market Movers',
    description: 'Top GE items by price movement and trade volume.',
    component:   MarketMovers,
    defaultSize: { w: 8, h: 5 },
    minSize:     { w: 5, h: 4 },
    phase:       5,
  },

  // ── Utility ──────────────────────────────────────────────────────────────────
  {
    id:          'world-clock',
    name:        'World Clock',
    description: 'Live local and UTC clocks with offset and daily reset countdown.',
    component:   WorldClock,
    defaultSize: { w: 3, h: 2 },
    minSize:     { w: 1, h: 2 },
    phase:       2,
  },

  // ── Phase 6: DXP ────────────────────────────────────────────────────────────
  {
    id:          'dxp-intelligence',
    name:        'DXP Intelligence',
    description: 'Countdown to next Double XP Weekend with pre/during/post price movers.',
    component:   DxpIntelligence,
    defaultSize: { w: 6, h: 6 },
    minSize:     { w: 4, h: 5 },
    phase:       6,
  },
]

export function getWidgetById(id: string): WidgetDefinition | undefined {
  return widgetRegistry.find(w => w.id === id)
}
