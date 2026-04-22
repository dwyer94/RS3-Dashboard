// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import XPHeatmap from '../../src/widgets/XPHeatmap'

vi.mock('../../src/queryClient', () => ({ default: { invalidateQueries: vi.fn() } }))
vi.mock('../../src/stores/usePlayerStore')
// XPHeatmap uses useQueries directly for per-skill monthly data
vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>()
  return { ...actual, useQueries: vi.fn() }
})

import usePlayerStore from '../../src/stores/usePlayerStore'
import { useQueries } from '@tanstack/react-query'

// XPHeatmap has 29 skills (ids 0–28). useQueries returns one result per skill in that order.
const SKILL_COUNT = 29

function mockStore(rsn = 'Zezima') {
  vi.mocked(usePlayerStore).mockImplementation((sel: any) =>
    sel({ primaryRSN: rsn, trackedRSNs: rsn ? [rsn] : [] })
  )
}

// Build a 29-element useQueries result array. `skillData` maps skill id → MonthlyXP[].
function mockXP(skillData: Record<number, { year: number; month: number; xpGained: number }[]> = {}) {
  vi.mocked(useQueries).mockReturnValue(
    Array.from({ length: SKILL_COUNT }, (_, i) => {
      const months = skillData[i]
      return {
        data:        months ? [{ skill: i, months }] : [],
        isLoading:   false,
        isError:     false,
        error:       null,
        dataUpdatedAt: Date.now(),
      }
    })
  )
}

describe('XPHeatmap', () => {
  beforeEach(() => {
    mockStore()
    mockXP()
  })

  it('shows empty state when no RSN is set', () => {
    mockStore('')
    render(<XPHeatmap />)
    expect(screen.getByText('Set a player in Settings to view XP history.')).toBeInTheDocument()
  })

  it('shows no-data message when all skills have empty XP arrays', () => {
    render(<XPHeatmap />)
    expect(screen.getByText('No XP data available.')).toBeInTheDocument()
  })

  it('renders month header labels when data is present', () => {
    mockXP({
      28: [
        { year: 2025, month: 4,  xpGained: 820_000 },
        { year: 2026, month: 1,  xpGained: 2_400_000 },
      ],
    })
    render(<XPHeatmap />)
    expect(screen.getByText("Apr")).toBeInTheDocument()
    expect(screen.getByText("Jan")).toBeInTheDocument()
  })

  it('renders skill names as row labels', () => {
    mockXP({ 0: [{ year: 2025, month: 6, xpGained: 500_000 }] })
    render(<XPHeatmap />)
    expect(screen.getByText('Attack')).toBeInTheDocument()
    expect(screen.getByText('Necromancy')).toBeInTheDocument()
  })

  it('shows data for multiple skills in the same month column', () => {
    mockXP({
      0:  [{ year: 2025, month: 6, xpGained: 500_000 }],
      28: [{ year: 2025, month: 6, xpGained: 750_000 }],
    })
    render(<XPHeatmap />)
    // Both skills share the same Jun column — exactly one Jun header should appear
    const junLabels = screen.getAllByText('Jun')
    expect(junLabels).toHaveLength(1)
  })

  it('only shows the last 12 months when more data is available', () => {
    // 14 months: Jan 2025 → Feb 2026. After slice(-12): Mar 2025 → Feb 2026.
    // So Jan '25 and Feb '25 column headers must not appear.
    const months = Array.from({ length: 14 }, (_, i) => ({
      year:     2025 + Math.floor(i / 12),
      month:    (i % 12) + 1,
      xpGained: 100_000,
    }))
    mockXP({ 28: months })
    render(<XPHeatmap />)
    // The year spans render as "'25" / "'26" etc — get all of them to count columns
    const yearSpans = screen.getAllByText(/^'2[0-9]$/)
    expect(yearSpans.length).toBeLessThanOrEqual(12)
  })
})
