import type { PricePoint, GESignals } from '../api/types'

function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length
}

function stdDev(values: number[], avg: number): number {
  const variance = values.reduce((sum, v) => sum + (v - avg) ** 2, 0) / values.length
  return Math.sqrt(variance)
}

export function computeGESignals(history: PricePoint[], volume: number): GESignals {
  if (history.length < 2) {
    return { zScore: 0, percentile: 50, streak: 0, volumeTier: classifyVolume(volume) }
  }

  const last30 = history.slice(-30)
  const prices = last30.map(p => p.price)
  const currentPrice = history[history.length - 1].price

  const avg = mean(prices)
  const sd  = stdDev(prices, avg)

  const zScore = sd === 0 ? 0 : (currentPrice - avg) / sd

  const minPrice = Math.min(...prices)
  const maxPrice = Math.max(...prices)
  const percentile = maxPrice === minPrice
    ? 50
    : Math.round(((currentPrice - minPrice) / (maxPrice - minPrice)) * 100)

  const streak = computeStreak(history)
  const volumeTier = classifyVolume(volume)

  return { zScore: Math.round(zScore * 100) / 100, percentile, streak, volumeTier }
}

function computeStreak(history: PricePoint[]): number {
  if (history.length < 2) return 0

  const prices = history.map(p => p.price)
  const lastPrice = prices[prices.length - 1]
  const prevPrice = prices[prices.length - 2]

  const direction = lastPrice >= prevPrice ? 1 : -1
  let streak = direction

  for (let i = prices.length - 2; i > 0; i--) {
    const dayDir = prices[i] >= prices[i - 1] ? 1 : -1
    if (dayDir !== direction) break
    streak += direction
  }

  return streak
}

function classifyVolume(volume: number): GESignals['volumeTier'] {
  if (volume >= 10_000) return 'high'
  if (volume >= 1_000)  return 'medium'
  return 'low'
}
