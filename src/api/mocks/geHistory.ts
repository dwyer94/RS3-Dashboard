import type { PricePoint } from '../types'

// 180 days of Nature rune price history
function genHistory(basePrice: number, volatility: number): PricePoint[] {
  const points: PricePoint[] = []
  const now = Date.now()
  let price = basePrice
  for (let i = 180; i >= 0; i--) {
    const date = now - i * 86_400_000
    price = Math.max(1, Math.round(price + (Math.random() - 0.5) * volatility))
    points.push({ date, price })
  }
  return points
}

export const mockGEHistory: PricePoint[] = genHistory(182, 20)
