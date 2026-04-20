import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface WidgetLayout {
  id:      string
  x:       number
  y:       number
  w:       number
  h:       number
  visible: boolean
}

interface LayoutStore {
  widgets:      WidgetLayout[]
  theme:        'light' | 'dark'
  _hasHydrated: boolean

  updateLayout: (layouts: WidgetLayout[]) => void
  toggleWidget: (id: string) => void
  addWidget:    (layout: WidgetLayout) => void
  removeWidget: (id: string) => void
  resetLayout:  () => void
  setTheme:     (theme: 'light' | 'dark') => void
  setHydrated:  () => void
}

const useLayoutStore = create<LayoutStore>()(
  persist(
    (set) => ({
      widgets:      [],
      theme:        'dark',
      _hasHydrated: false,

      updateLayout: (layouts) => set({ widgets: layouts }),

      toggleWidget: (id) =>
        set(s => ({
          widgets: s.widgets.map(w => w.id === id ? { ...w, visible: !w.visible } : w),
        })),

      addWidget: (layout) =>
        set(s => ({ widgets: [...s.widgets, layout] })),

      removeWidget: (id) =>
        set(s => ({ widgets: s.widgets.filter(w => w.id !== id) })),

      resetLayout: () => set({ widgets: [] }),

      setTheme: (theme) => {
        document.documentElement.classList.toggle('dark', theme === 'dark')
        set({ theme })
      },

      setHydrated: () => set({ _hasHydrated: true }),
    }),
    {
      name:    'rs3dash.layout',
      version: 1,
      migrate: (state, _version) => state,
      onRehydrateStorage: () => (state) => {
        state?.setHydrated()
        // Reapply theme class on page load
        if (state?.theme === 'dark') {
          document.documentElement.classList.add('dark')
        }
      },
    },
  ),
)

export default useLayoutStore
