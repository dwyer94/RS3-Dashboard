import { describe, it, expect, beforeEach } from 'vitest'
import { act } from '@testing-library/react'

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

// document.documentElement.classList is needed by setTheme
const classListMock = { add: () => {}, remove: () => {}, toggle: () => false }
Object.defineProperty(global, 'document', {
  value: { documentElement: { classList: classListMock } },
  writable: true,
})

const { default: useLayoutStore } = await import('../../src/stores/useLayoutStore')
import { WidgetLayout } from '../../src/stores/useLayoutStore'

const sampleWidget: WidgetLayout = { id: 'voice-of-seren', x: 0, y: 0, w: 3, h: 3, visible: true }

describe('useLayoutStore', () => {
  beforeEach(() => {
    localStorageMock.clear()
    useLayoutStore.setState({ widgets: [], theme: 'dark', _hasHydrated: false })
  })

  describe('addWidget / removeWidget', () => {
    it('adds a widget', () => {
      act(() => useLayoutStore.getState().addWidget(sampleWidget))
      expect(useLayoutStore.getState().widgets).toHaveLength(1)
      expect(useLayoutStore.getState().widgets[0].id).toBe('voice-of-seren')
    })

    it('removes a widget', () => {
      act(() => {
        useLayoutStore.getState().addWidget(sampleWidget)
        useLayoutStore.getState().removeWidget('voice-of-seren')
      })
      expect(useLayoutStore.getState().widgets).toHaveLength(0)
    })
  })

  describe('toggleWidget', () => {
    it('toggles visibility', () => {
      act(() => {
        useLayoutStore.getState().addWidget(sampleWidget)
        useLayoutStore.getState().toggleWidget('voice-of-seren')
      })
      expect(useLayoutStore.getState().widgets[0].visible).toBe(false)
    })
  })

  describe('updateLayout', () => {
    it('replaces widget list', () => {
      const updated: WidgetLayout = { ...sampleWidget, x: 5, y: 2 }
      act(() => {
        useLayoutStore.getState().addWidget(sampleWidget)
        useLayoutStore.getState().updateLayout([updated])
      })
      expect(useLayoutStore.getState().widgets[0].x).toBe(5)
    })
  })

  describe('resetLayout', () => {
    it('clears all widgets', () => {
      act(() => {
        useLayoutStore.getState().addWidget(sampleWidget)
        useLayoutStore.getState().resetLayout()
      })
      expect(useLayoutStore.getState().widgets).toHaveLength(0)
    })
  })

  describe('setTheme', () => {
    it('updates theme to light', () => {
      act(() => useLayoutStore.getState().setTheme('light'))
      expect(useLayoutStore.getState().theme).toBe('light')
    })

    it('updates theme to dark', () => {
      act(() => useLayoutStore.getState().setTheme('dark'))
      expect(useLayoutStore.getState().theme).toBe('dark')
    })
  })
})
