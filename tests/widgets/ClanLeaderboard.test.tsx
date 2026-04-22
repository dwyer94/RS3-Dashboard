// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import ClanLeaderboard from '../../src/widgets/ClanLeaderboard'

vi.mock('../../src/queryClient', () => ({ default: { invalidateQueries: vi.fn() } }))
vi.mock('../../src/stores/usePlayerStore')
vi.mock('../../src/hooks/useAllTrackedProfiles')

import usePlayerStore from '../../src/stores/usePlayerStore'
import { useAllTrackedProfiles } from '../../src/hooks/useAllTrackedProfiles'

const PROFILE_A = {
  rsn: 'Zezima', totalLevel: 2898, combatLevel: 138, totalXP: 4_200_000_000, activities: [],
  skills: [{ id: 0, name: 'Attack', level: 99, xp: 13_034_534, rank: 1 }],
}
const PROFILE_B = {
  rsn: 'Mod Ash', totalLevel: 2000, combatLevel: 120, totalXP: 2_000_000_000, activities: [],
  skills: [{ id: 0, name: 'Attack', level: 85, xp: 3_258_594, rank: 2 }],
}

function mockStore(rsns: string[]) {
  vi.mocked(usePlayerStore).mockImplementation((sel: any) =>
    sel({ primaryRSN: rsns[0] ?? '', trackedRSNs: rsns })
  )
}

function mockProfiles(profiles: any[]) {
  vi.mocked(useAllTrackedProfiles).mockReturnValue(
    profiles.map(p => ({
      data: p, isLoading: false, isError: false, error: null, dataUpdatedAt: Date.now(),
    })) as any
  )
}

describe('ClanLeaderboard', () => {
  beforeEach(() => {
    mockStore(['Zezima', 'Mod Ash'])
    mockProfiles([PROFILE_A, PROFILE_B])
  })

  it('shows empty state when no players are tracked', () => {
    mockStore([])
    mockProfiles([])
    render(<ClanLeaderboard />)
    expect(screen.getByText('Add players in Settings to build a leaderboard.')).toBeInTheDocument()
  })

  it('renders the Rank by selector', () => {
    render(<ClanLeaderboard />)
    expect(screen.getByText('Rank by')).toBeInTheDocument()
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  it('sort selector contains Total Level, Total XP, and skill options', () => {
    render(<ClanLeaderboard />)
    expect(screen.getByRole('option', { name: 'Total Level' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Total XP' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Attack' })).toBeInTheDocument()
  })

  it('renders rank indicators for each player', () => {
    render(<ClanLeaderboard />)
    expect(screen.getByText('#1')).toBeInTheDocument()
    expect(screen.getByText('#2')).toBeInTheDocument()
  })

  it('renders all tracked player names', () => {
    render(<ClanLeaderboard />)
    expect(screen.getByText('Zezima')).toBeInTheDocument()
    expect(screen.getByText('Mod Ash')).toBeInTheDocument()
  })

  it('ranks by total level descending by default — highest total level is #1', () => {
    render(<ClanLeaderboard />)
    // Zezima has higher total level (2898 vs 2000), so should be ranked #1
    const firstRank = screen.getByText('#1')
    expect(firstRank.parentElement).toHaveTextContent('Zezima')
  })

  it('shows total level values as the ranking value', () => {
    render(<ClanLeaderboard />)
    expect(screen.getByText('2,898')).toBeInTheDocument()
    expect(screen.getByText('2,000')).toBeInTheDocument()
  })

  it('works with a single tracked player', () => {
    mockStore(['Zezima'])
    mockProfiles([PROFILE_A])
    render(<ClanLeaderboard />)
    expect(screen.getByText('#1')).toBeInTheDocument()
    expect(screen.getByText('Zezima')).toBeInTheDocument()
  })
})
