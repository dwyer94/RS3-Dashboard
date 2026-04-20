// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import TravellingMerchant from '../../src/widgets/TravellingMerchant'
import type { TMSData } from '../../src/api/types'

vi.mock('../../src/hooks/useTMS')
vi.mock('../../src/queryClient', () => ({
  default: { invalidateQueries: vi.fn() },
}))

import { useTMS } from '../../src/hooks/useTMS'

const TODAY_ITEMS: TMSData['today'] = [
  { name: 'Barrel of brine',      wikiUrl: 'https://runescape.wiki/w/Barrel_of_brine',      isHighValue: true  },
  { name: 'Magic stone',          wikiUrl: 'https://runescape.wiki/w/Magic_stone',          isHighValue: false },
  { name: 'Uncharted island map', wikiUrl: 'https://runescape.wiki/w/Uncharted_island_map', isHighValue: false },
  { name: 'Livid plant',          wikiUrl: 'https://runescape.wiki/w/Livid_plant',          isHighValue: false },
  { name: 'Stardust',             wikiUrl: 'https://runescape.wiki/w/Stardust',             isHighValue: false },
]

const TOMORROW_ITEMS: TMSData['tomorrow'] = [
  { name: 'Silverhawk down',  wikiUrl: 'https://runescape.wiki/w/Silverhawk_down',  isHighValue: true  },
  { name: 'Slayer VIP coupon', wikiUrl: 'https://runescape.wiki/w/Slayer_VIP_coupon', isHighValue: false },
]

function mockSuccess(tomorrow: TMSData['tomorrow'] = TOMORROW_ITEMS) {
  vi.mocked(useTMS).mockReturnValue({
    data: {
      today:     TODAY_ITEMS,
      tomorrow,
      resetTime: new Date(Date.now() + 86_400_000),
    },
    isLoading:    false,
    isError:      false,
    error:        null,
    dataUpdatedAt: Date.now(),
  } as any)
}

describe('TravellingMerchant', () => {
  beforeEach(() => mockSuccess())

  it('renders all today items', () => {
    render(<TravellingMerchant />)
    for (const item of TODAY_ITEMS) {
      expect(screen.getByText(item.name)).toBeInTheDocument()
    }
  })

  it('shows the Tomorrow section when tomorrow data is present', () => {
    render(<TravellingMerchant />)
    expect(screen.getByText(/tomorrow/i)).toBeInTheDocument()
    expect(screen.getByText('Silverhawk down')).toBeInTheDocument()
  })

  it('hides the Tomorrow section when tomorrow is empty', () => {
    mockSuccess([])
    render(<TravellingMerchant />)
    expect(screen.queryByText(/tomorrow/i)).not.toBeInTheDocument()
  })

  it('links each today item to its wiki URL', () => {
    render(<TravellingMerchant />)
    const link = screen.getByText('Magic stone').closest('a')
    expect(link).toHaveAttribute('href', 'https://runescape.wiki/w/Magic_stone')
  })

  it('links each tomorrow item to its wiki URL', () => {
    render(<TravellingMerchant />)
    const link = screen.getByText('Silverhawk down').closest('a')
    expect(link).toHaveAttribute('href', 'https://runescape.wiki/w/Silverhawk_down')
  })
})
