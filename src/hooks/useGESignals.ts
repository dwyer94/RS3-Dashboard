import { useGEItem } from './useGEItem'
import { useGEHistory } from './useGEHistory'
import { computeGESignals } from '../utils/geSignals'
import type { GESignals } from '../api/types'

export function useGESignals(itemId: number): {
  data:       GESignals | undefined
  isLoading:  boolean
  isError:    boolean
} {
  const { data: item,    isLoading: loadItem,    isError: errItem    } = useGEItem(itemId)
  const { data: history, isLoading: loadHistory, isError: errHistory } = useGEHistory(itemId)

  const signals = item && history
    ? computeGESignals(history, item.volume)
    : undefined

  return {
    data:      signals,
    isLoading: loadItem || loadHistory,
    isError:   errItem  || errHistory,
  }
}
