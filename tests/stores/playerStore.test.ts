import { describe, it, expect, beforeEach } from 'vitest'
import { act } from '@testing-library/react'

// Zustand stores need localStorage — use node with a simple mock
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem:   (key: string) => store[key] ?? null,
    setItem:   (key: string, value: string) => { store[key] = value },
    removeItem:(key: string) => { delete store[key] },
    clear:     () => { store = {} },
  }
})()

Object.defineProperty(global, 'localStorage', { value: localStorageMock })

// Import after setting up localStorage mock
const { default: usePlayerStore } = await import('../../src/stores/usePlayerStore')

describe('usePlayerStore', () => {
  beforeEach(() => {
    localStorageMock.clear()
    usePlayerStore.setState({
      primaryRSN:    '',
      trackedRSNs:   [],
      profileStatus: {},
      _hasHydrated:  false,
    })
  })

  describe('addRSN', () => {
    it('adds a new RSN', () => {
      act(() => usePlayerStore.getState().addRSN('Zezima'))
      expect(usePlayerStore.getState().trackedRSNs).toContain('Zezima')
    })

    it('sets primaryRSN to first added RSN when empty', () => {
      act(() => usePlayerStore.getState().addRSN('Zezima'))
      expect(usePlayerStore.getState().primaryRSN).toBe('Zezima')
    })

    it('does not duplicate RSNs', () => {
      act(() => {
        usePlayerStore.getState().addRSN('Zezima')
        usePlayerStore.getState().addRSN('Zezima')
      })
      expect(usePlayerStore.getState().trackedRSNs).toHaveLength(1)
    })

    it('enforces 10 RSN cap', () => {
      act(() => {
        for (let i = 0; i < 12; i++) {
          usePlayerStore.getState().addRSN(`Player${i}`)
        }
      })
      expect(usePlayerStore.getState().trackedRSNs).toHaveLength(10)
    })
  })

  describe('removeRSN', () => {
    it('removes an RSN', () => {
      act(() => {
        usePlayerStore.getState().addRSN('Zezima')
        usePlayerStore.getState().removeRSN('Zezima')
      })
      expect(usePlayerStore.getState().trackedRSNs).not.toContain('Zezima')
    })

    it('promotes next RSN when primary is removed', () => {
      act(() => {
        usePlayerStore.getState().addRSN('Zezima')
        usePlayerStore.getState().addRSN('Lynx Titan')
        usePlayerStore.getState().removeRSN('Zezima')
      })
      expect(usePlayerStore.getState().primaryRSN).toBe('Lynx Titan')
    })

    it('clears primaryRSN when last RSN is removed', () => {
      act(() => {
        usePlayerStore.getState().addRSN('Zezima')
        usePlayerStore.getState().removeRSN('Zezima')
      })
      expect(usePlayerStore.getState().primaryRSN).toBe('')
    })

    it('clears profileStatus for removed RSN', () => {
      act(() => {
        usePlayerStore.getState().addRSN('Zezima')
        usePlayerStore.getState().setStatus('Zezima', 'ok')
        usePlayerStore.getState().removeRSN('Zezima')
      })
      expect(usePlayerStore.getState().profileStatus['Zezima']).toBeUndefined()
    })
  })

  describe('setPrimary', () => {
    it('updates primaryRSN', () => {
      act(() => {
        usePlayerStore.getState().addRSN('Zezima')
        usePlayerStore.getState().addRSN('Lynx Titan')
        usePlayerStore.getState().setPrimary('Lynx Titan')
      })
      expect(usePlayerStore.getState().primaryRSN).toBe('Lynx Titan')
    })
  })

  describe('setStatus', () => {
    it('stores profile status per RSN', () => {
      act(() => {
        usePlayerStore.getState().addRSN('Zezima')
        usePlayerStore.getState().setStatus('Zezima', 'private')
      })
      expect(usePlayerStore.getState().profileStatus['Zezima']).toBe('private')
    })
  })
})
