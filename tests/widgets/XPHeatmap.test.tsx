// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import XPHeatmap from '../../src/widgets/XPHeatmap'

vi.mock('../../src/queryClient', () => ({ default: { invalidateQueries: vi.fn() } }))
vi.mock('../../src/stores/usePlayerStore')
vi.mock('../../src/hooks/usePlayerProfile')
vi.mock('../../src/hooks/useXPMonthly')

import usePlayerStore from '../../src/stores/usePlayerStore'
import { usePlayerProfile } from '../../src/hooks/usePlayerProfile'
import { useXPMonthly } from '../../src/hooks/useXPMonthly'

const SKILLS = [
  { id: 0,  name: 'Attack',    level: 99,  xp: 13_034_534,   rank: 12_400 },
  { id: 28, name: 'Necromancy', level: 120, xp: 104_273_167, rank: 1_500 },
]

function mockStore(rsn = 'Zezima') {
  vi.mocked(usePlayerStore).mockImplementation((sel: any) =>
    sel({ primaryRSN: rsn, trackedRSNs: rsn ? [rsn] : [] })
  )
}

function mockProfile(skills = SKILLS) {
  vi.mocked(usePlayerProfile).mockReturnValue({
    data: { rsn: 'Zezima', totalLevel: 2898, combatLevel: 138, totalXP: 4_200_000_000, skills, activities: [] },
    isLoading: false, isError: false, error: null, dataUpdatedAt: Date.now(),
  } as any)
}

function mockXP(data: any[] = []) {
  vi.mocked(useXPMonthly).mockReturnValue({
    data, isLoading: false, isError: false, error: null, dataUpdatedAt: Date.now(),
  } as any)
}

describe('XPHeatmap', () => {
  beforeEach(() => {
    mockStore()
    mockProfile()
    mockXP()
  })

  it('shows empty state when no RSN is set', () => {
    mockStore('')
    render(<XPHeatmap />)
    expect(screen.getByText('Set a player in Settings to view XP history.')).toBeInTheDocument()
  })

  it('shows no-data message when XP array is empty', () => {
    render(<XPHeatmap />)
    expect(screen.getByText('No XP data available.')).toBeInTheDocument()
  })

  it('renders month cells with correct labels', () => {
    mockXP([{
      skill: 28,
      months: [
        { year: 2025, month: 4, xpGained: 820_000 },
        { year: 2026, month: 1, xpGained: 2_400_000 },
      ],
    }])
    render(<XPHeatmap />)
    expect(screen.getByText("Apr '25")).toBeInTheDocument()
    expect(screen.getByText("Jan '26")).toBeInTheDocument()
  })

  it('renders the skill selector with an All Skills option', () => {
    render(<XPHeatmap />)
    expect(screen.getByRole('combobox')).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'All Skills' })).toBeInTheDocument()
  })

  it('populates the skill selector with skills from the player profile', () => {
    render(<XPHeatmap />)
    expect(screen.getByRole('option', { name: 'Attack' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Necromancy' })).toBeInTheDocument()
  })

  it('aggregates XP across multiple skills for the same month', () => {
    mockXP([
      { skill:  0, months: [{ year: 2025, month: 6, xpGained: 500_000 }] },
      { skill: 28, months: [{ year: 2025, month: 6, xpGained: 500_000 }] },
    ])
    render(<XPHeatmap />)
    expect(screen.getByText('1.0M')).toBeInTheDocument()
  })

  it('only shows the last 12 months when more data is available', () => {
    const months = Array.from({ length: 14 }, (_, i) => ({
      year: 2025 + Math.floor(i / 12),
      month: (i % 12) + 1,
      xpGained: 100_000,
    }))
    mockXP([{ skill: 28, months }])
    render(<XPHeatmap />)
    // Should render exactly 12 cells, not 14
    const cells = screen.getAllByText('100.0K')
    expect(cells).toHaveLength(12)
  })
})
