// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import RS3News from '../../src/widgets/RS3News'
import type { NewsItem } from '../../src/api/types'

vi.mock('../../src/hooks/useRS3News')
vi.mock('../../src/queryClient', () => ({
  default: { invalidateQueries: vi.fn() },
}))

import { useRS3News } from '../../src/hooks/useRS3News'

const MOCK_NEWS: NewsItem[] = [
  { title: 'Necromancy: The Lost Grove Expansion',   date: '2026-04-18', category: 'Game Update',   url: 'https://runescape.com/news/necromancy' },
  { title: "April's Premier Club Rewards Revealed",  date: '2026-04-15', category: 'Announcements', url: 'https://runescape.com/news/april-club'  },
  { title: 'Patch Notes - 15 April 2026',            date: '2026-04-15', category: 'Patch Notes',   url: 'https://runescape.com/news/patch-notes' },
]

function mockSuccess(items: NewsItem[] = MOCK_NEWS) {
  vi.mocked(useRS3News).mockReturnValue({
    data:          items,
    isLoading:    false,
    isError:      false,
    error:        null,
    dataUpdatedAt: Date.now(),
  } as any)
}

describe('RS3News', () => {
  beforeEach(() => mockSuccess())

  it('renders all news item titles', () => {
    render(<RS3News />)
    for (const item of MOCK_NEWS) {
      expect(screen.getByText(item.title)).toBeInTheDocument()
    }
  })

  it('links each item to its URL', () => {
    render(<RS3News />)
    const link = screen.getByText('Patch Notes - 15 April 2026').closest('a')
    expect(link).toHaveAttribute('href', 'https://runescape.com/news/patch-notes')
  })

  it('renders all news links with correct hrefs', () => {
    render(<RS3News />)
    for (const item of MOCK_NEWS) {
      const link = screen.getByText(item.title).closest('a')
      expect(link).toHaveAttribute('href', item.url)
    }
  })

  it('does not crash for an item with an unknown category', () => {
    mockSuccess([{ title: 'Mystery post', date: '2026-04-20', category: 'Wilderness Update', url: 'https://runescape.com/news/mystery' }])
    expect(() => render(<RS3News />)).not.toThrow()
    expect(screen.getByText('Mystery post')).toBeInTheDocument()
  })

  it('renders each category label', () => {
    render(<RS3News />)
    expect(screen.getByText('Game Update')).toBeInTheDocument()
    expect(screen.getByText('Announcements')).toBeInTheDocument()
    expect(screen.getByText('Patch Notes')).toBeInTheDocument()
  })
})
