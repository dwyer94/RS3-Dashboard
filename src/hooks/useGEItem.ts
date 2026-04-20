import { useGEDump } from './useGEDump'

export function useGEItem(itemId: number) {
  const { data: dump, ...rest } = useGEDump()
  const item = dump?.find(i => i.id === itemId)
  return { data: item, ...rest }
}
