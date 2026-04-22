import { describe, it, expect, beforeEach } from 'vitest'
import { act } from '@testing-library/react'

const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem:    (key: string) => store[key] ?? null,
    setItem:    (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear:      () => { store = {} },
  }
})()

Object.defineProperty(global, 'localStorage', { value: localStorageMock })

const { default: useMarketStore } = await import('../../src/stores/useMarketStore')

function resetStore() {
  localStorageMock.clear()
  useMarketStore.setState({ watchlist: [], goals: [], _hasHydrated: false })
}

describe('useMarketStore — watchlist', () => {
  beforeEach(resetStore)

  it('adds an item id to the watchlist', () => {
    act(() => useMarketStore.getState().addItem(561))
    expect(useMarketStore.getState().watchlist).toContain(561)
  })

  it('does not add duplicate item ids', () => {
    act(() => {
      useMarketStore.getState().addItem(561)
      useMarketStore.getState().addItem(561)
    })
    expect(useMarketStore.getState().watchlist).toHaveLength(1)
  })

  it('removes an item from the watchlist', () => {
    act(() => {
      useMarketStore.getState().addItem(561)
      useMarketStore.getState().removeItem(561)
    })
    expect(useMarketStore.getState().watchlist).not.toContain(561)
  })

  it('removeItem is a no-op for ids not in the watchlist', () => {
    act(() => useMarketStore.getState().removeItem(9999))
    expect(useMarketStore.getState().watchlist).toHaveLength(0)
  })

  it('preserves other items when removing one', () => {
    act(() => {
      useMarketStore.getState().addItem(561)
      useMarketStore.getState().addItem(560)
      useMarketStore.getState().removeItem(561)
    })
    expect(useMarketStore.getState().watchlist).toEqual([560])
  })
})

describe('useMarketStore — goals', () => {
  beforeEach(resetStore)

  const goal = { id: 'g1', rsn: 'Zezima', skill: 'Slayer', targetXP: 200_000_000, name: '200M Slayer' }

  it('adds a skill goal', () => {
    act(() => useMarketStore.getState().addGoal(goal))
    expect(useMarketStore.getState().goals).toHaveLength(1)
    expect(useMarketStore.getState().goals[0]).toMatchObject(goal)
  })

  it('removes a goal by id', () => {
    act(() => {
      useMarketStore.getState().addGoal(goal)
      useMarketStore.getState().removeGoal('g1')
    })
    expect(useMarketStore.getState().goals).toHaveLength(0)
  })

  it('removeGoal leaves unrelated goals intact', () => {
    const goal2 = { id: 'g2', rsn: 'Zezima', skill: 'Mining', targetXP: 100_000_000, name: '100M Mining' }
    act(() => {
      useMarketStore.getState().addGoal(goal)
      useMarketStore.getState().addGoal(goal2)
      useMarketStore.getState().removeGoal('g1')
    })
    expect(useMarketStore.getState().goals).toHaveLength(1)
    expect(useMarketStore.getState().goals[0].id).toBe('g2')
  })

  it('supports multiple goals for the same RSN', () => {
    const goal2 = { id: 'g2', rsn: 'Zezima', skill: 'Mining', targetXP: 100_000_000, name: '100M Mining' }
    act(() => {
      useMarketStore.getState().addGoal(goal)
      useMarketStore.getState().addGoal(goal2)
    })
    expect(useMarketStore.getState().goals).toHaveLength(2)
  })
})
