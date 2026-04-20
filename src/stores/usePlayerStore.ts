import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ProfileStatus } from '../api/types'

interface PlayerStore {
  primaryRSN:    string
  trackedRSNs:   string[]
  profileStatus: Record<string, ProfileStatus>
  _hasHydrated:  boolean

  setPrimary:  (rsn: string) => void
  addRSN:      (rsn: string) => void
  removeRSN:   (rsn: string) => void
  setStatus:   (rsn: string, status: ProfileStatus) => void
  setHydrated: () => void
}

const usePlayerStore = create<PlayerStore>()(
  persist(
    (set, get) => ({
      primaryRSN:    '',
      trackedRSNs:   [],
      profileStatus: {},
      _hasHydrated:  false,

      setPrimary: (rsn) => set({ primaryRSN: rsn }),

      addRSN: (rsn) => {
        const { trackedRSNs } = get()
        if (trackedRSNs.length >= 10) return
        if (trackedRSNs.includes(rsn)) return
        const next = [...trackedRSNs, rsn]
        set({ trackedRSNs: next, primaryRSN: get().primaryRSN || rsn })
      },

      removeRSN: (rsn) => {
        const { trackedRSNs, primaryRSN, profileStatus } = get()
        const next = trackedRSNs.filter(r => r !== rsn)
        const nextStatus = { ...profileStatus }
        delete nextStatus[rsn]
        const nextPrimary = primaryRSN === rsn ? (next[0] ?? '') : primaryRSN
        set({ trackedRSNs: next, primaryRSN: nextPrimary, profileStatus: nextStatus })
      },

      setStatus: (rsn, status) =>
        set(s => ({ profileStatus: { ...s.profileStatus, [rsn]: status } })),

      setHydrated: () => set({ _hasHydrated: true }),
    }),
    {
      name:    'rs3dash.players',
      version: 1,
      migrate: (state, _version) => state,
      onRehydrateStorage: () => (state) => {
        state?.setHydrated()
      },
    },
  ),
)

export default usePlayerStore
