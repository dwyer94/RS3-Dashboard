// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import VoiceOfSeren from '../../src/widgets/VoiceOfSeren'

vi.mock('../../src/hooks/useVoS')
vi.mock('../../src/queryClient', () => ({
  default: { invalidateQueries: vi.fn() },
}))

import { useVoS } from '../../src/hooks/useVoS'

function mockSuccess(districts: [string, string] = ['Cadarn', 'Ithell'], minutesUntilRotation = 30) {
  vi.mocked(useVoS).mockReturnValue({
    data: {
      districts,
      nextRotation: new Date(Date.now() + minutesUntilRotation * 60 * 1000),
    },
    isLoading:    false,
    isError:      false,
    error:        null,
    dataUpdatedAt: Date.now(),
  } as any)
}

describe('VoiceOfSeren', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockSuccess()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders both district names', () => {
    render(<VoiceOfSeren />)
    expect(screen.getByText('Cadarn')).toBeInTheDocument()
    expect(screen.getByText('Ithell')).toBeInTheDocument()
  })

  it('renders skill subtitle for a known district', () => {
    render(<VoiceOfSeren />)
    expect(screen.getByText('Magic · Ranged')).toBeInTheDocument()
    expect(screen.getByText('Construction · Crafting')).toBeInTheDocument()
  })

  it('renders the "Next rotation" label', () => {
    render(<VoiceOfSeren />)
    expect(screen.getByText('Next rotation')).toBeInTheDocument()
  })

  it('does not crash for an unknown district and renders the name', () => {
    mockSuccess(['UnknownClan', 'Cadarn'])
    render(<VoiceOfSeren />)
    expect(screen.getByText('UnknownClan')).toBeInTheDocument()
    // Known district still shows its skills
    expect(screen.getByText('Magic · Ranged')).toBeInTheDocument()
  })

  it('cleans up the countdown interval on unmount', () => {
    const clearSpy = vi.spyOn(global, 'clearInterval')
    const { unmount } = render(<VoiceOfSeren />)
    unmount()
    expect(clearSpy).toHaveBeenCalled()
  })
})
