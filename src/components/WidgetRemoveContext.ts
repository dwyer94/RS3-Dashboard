import { createContext, useContext } from 'react'

export const WidgetRemoveContext = createContext<(() => void) | null>(null)

export function useWidgetRemove() {
  return useContext(WidgetRemoveContext)
}
