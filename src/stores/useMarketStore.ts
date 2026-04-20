import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface SkillGoal {
  id:       string
  rsn:      string
  skill:    string
  targetXP: number
  name:     string
}

interface MarketStore {
  watchlist:   number[]
  goals:       SkillGoal[]
  _hasHydrated: boolean

  addItem:     (id: number) => void
  removeItem:  (id: number) => void
  addGoal:     (goal: SkillGoal) => void
  removeGoal:  (id: string) => void
  setHydrated: () => void
}

const useMarketStore = create<MarketStore>()(
  persist(
    (set, get) => ({
      watchlist:    [],
      goals:        [],
      _hasHydrated: false,

      addItem: (id) => {
        if (get().watchlist.includes(id)) return
        set(s => ({ watchlist: [...s.watchlist, id] }))
      },

      removeItem: (id) =>
        set(s => ({ watchlist: s.watchlist.filter(i => i !== id) })),

      addGoal: (goal) =>
        set(s => ({ goals: [...s.goals, goal] })),

      removeGoal: (id) =>
        set(s => ({ goals: s.goals.filter(g => g.id !== id) })),

      setHydrated: () => set({ _hasHydrated: true }),
    }),
    {
      name:    'rs3dash.market',
      version: 1,
      migrate: (state, _version) => state,
      onRehydrateStorage: () => (state) => {
        state?.setHydrated()
      },
    },
  ),
)

export default useMarketStore
