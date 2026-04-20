import { describe, it, expect } from 'vitest'
import { computeGESignals } from '../../src/utils/geSignals'
import { PricePoint } from '../../src/api/types'

function makeHistory(prices: number[]): PricePoint[] {
  return prices.map((price, i) => ({ date: i * 86_400_000, price }))
}

describe('computeGESignals', () => {
  describe('with flat price history', () => {
    const flat = makeHistory(Array(30).fill(100))

    it('returns zScore of 0 for flat prices', () => {
      const { zScore } = computeGESignals(flat, 5000)
      expect(zScore).toBe(0)
    })

    it('returns percentile of 50 for flat prices', () => {
      const { percentile } = computeGESignals(flat, 5000)
      expect(percentile).toBe(50)
    })
  })

  describe('with rising history', () => {
    // prices 1..30
    const rising = makeHistory(Array.from({ length: 30 }, (_, i) => i + 1))

    it('returns positive zScore (current price above 30d mean)', () => {
      const { zScore } = computeGESignals(rising, 5000)
      expect(zScore).toBeGreaterThan(0)
    })

    it('returns high percentile (current price near 30d high)', () => {
      const { percentile } = computeGESignals(rising, 5000)
      expect(percentile).toBe(100)
    })

    it('returns positive streak', () => {
      const { streak } = computeGESignals(rising, 5000)
      expect(streak).toBeGreaterThan(0)
    })
  })

  describe('with falling history', () => {
    const falling = makeHistory(Array.from({ length: 30 }, (_, i) => 30 - i))

    it('returns negative streak', () => {
      const { streak } = computeGESignals(falling, 5000)
      expect(streak).toBeLessThan(0)
    })
  })

  describe('volumeTier', () => {
    const history = makeHistory([100, 100])

    it('returns high for volume >= 10k', () => {
      expect(computeGESignals(history, 10_000).volumeTier).toBe('high')
    })

    it('returns medium for volume 1k–9999', () => {
      expect(computeGESignals(history, 5_000).volumeTier).toBe('medium')
    })

    it('returns low for volume < 1k', () => {
      expect(computeGESignals(history, 500).volumeTier).toBe('low')
    })
  })

  describe('edge cases', () => {
    it('handles empty history gracefully', () => {
      const result = computeGESignals([], 5000)
      expect(result.zScore).toBe(0)
      expect(result.percentile).toBe(50)
      expect(result.streak).toBe(0)
    })

    it('handles single data point', () => {
      const result = computeGESignals([{ date: 0, price: 100 }], 5000)
      expect(result.zScore).toBe(0)
    })
  })
})
