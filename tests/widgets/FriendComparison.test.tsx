// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import FriendComparison from '../../src/widgets/FriendComparison'

vi.mock('../../src/queryClient', () => ({ default: { invalidateQueries: vi.fn() } }))
vi.mock('../../src/stores/usePlayerStore')
vi.mock('../../src/hooks/useAllTrackedProfiles')

import usePlayerStore from '../../src/stores/usePlayerStore'
import { useAllTrackedProfiles } from '../../src/hooks/useAllTrackedProfiles'

const PROFILE_A = {
  rsn: 'Zezima', totalLevel: 2898, combatLevel: 138, totalXP: 4_200_000_000, activities: [],
  skills: [
    { id: 0, name: 'Attack',   level: 99, xp: 13_034_534, rank: 12_400 },
    { id: 2, name: 'Strength', level: 99, xp: 13_034_534, rank: 11_000 },
  ],
}

const PROFILE_B = {
  rsn: 'Mod Ash', totalLevel: 2000, combatLevel: 120, totalXP: 2_000_000_000, activities: [],
  skills: [
    { id: 0, name: 'Attack',   level: 85, xp: 3_258_594,  rank: 50_000 },
    { id: 2, name: 'Strength', level: 99, xp: 13_034_534, rank: 11_000 }, // tied
  ],
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

describe('FriendComparison', () => {
  beforeEach(() => {
    mockStore(['Zezima', 'Mod Ash'])
    mockProfiles([PROFILE_A, PROFILE_B])
  })

  it('shows prompt when fewer than 2 players are tracked', () => {
    mockStore(['Zezima'])
    mockProfiles([PROFILE_A])
    render(<FriendComparison />)
    expect(screen.getByText('Add at least 2 players in Settings to compare.')).toBeInTheDocument()
  })

  it('shows prompt when no players are tracked', () => {
    mockStore([])
    mockProfiles([])
    render(<FriendComparison />)
    expect(screen.getByText('Add at least 2 players in Settings to compare.')).toBeInTheDocument()
  })

  it('renders "vs" between player selectors', () => {
    render(<FriendComparison />)
    expect(screen.getByText('vs')).toBeInTheDocument()
  })

  it('renders summary section labels', () => {
    render(<FriendComparison />)
    expect(screen.getByText('Total Level')).toBeInTheDocument()
    expect(screen.getByText('Combat')).toBeInTheDocument()
    expect(screen.getByText('Total XP')).toBeInTheDocument()
  })

  it('renders total level values for both players', () => {
    render(<FriendComparison />)
    expect(screen.getByText('2,898')).toBeInTheDocument()
    expect(screen.getByText('2,000')).toBeInTheDocument()
  })

  it('renders skill names from player A', () => {
    render(<FriendComparison />)
    expect(screen.getByText('Attack')).toBeInTheDocument()
    expect(screen.getByText('Strength')).toBeInTheDocument()
  })

  it('renders level values for both players per skill', () => {
    render(<FriendComparison />)
    // Attack: A=99, B=85
    expect(screen.getByText('85')).toBeInTheDocument()
    // 99 appears multiple times (Attack + Strength for A, Strength for B)
    expect(screen.getAllByText('99').length).toBeGreaterThan(0)
  })

  it('shows an em-dash when player B has no data for a skill', () => {
    mockProfiles([PROFILE_A, { ...PROFILE_B, skills: [] }])
    render(<FriendComparison />)
    expect(screen.getAllByText('—').length).toBeGreaterThan(0)
  })

  it('both player names appear as select options', () => {
    render(<FriendComparison />)
    expect(screen.getAllByRole('option', { name: 'Zezima' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('option', { name: 'Mod Ash' }).length).toBeGreaterThan(0)
  })
})
