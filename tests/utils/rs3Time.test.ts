import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getDailyResetMs, getHourlyResetMs, formatCountdown, getUTCDateString } from '../../src/utils/rs3Time'

describe('rs3Time', () => {
  beforeEach(() => {
    // Fix time to 2026-04-19 14:32:45.123 UTC
    vi.setSystemTime(new Date('2026-04-19T14:32:45.123Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('getDailyResetMs', () => {
    it('returns ms until next 00:00 UTC', () => {
      // Current: 14:32:45.123 UTC
      // Time into day: (14*3600 + 32*60 + 45) * 1000 + 123 = 52365123ms
      // Remaining: 86400000 - 52365123 = 34034877ms
      const result = getDailyResetMs()
      expect(result).toBeCloseTo(34_034_877, -2)
    })

    it('returns a positive value', () => {
      expect(getDailyResetMs()).toBeGreaterThan(0)
    })

    it('returns at most 24h in ms', () => {
      expect(getDailyResetMs()).toBeLessThanOrEqual(86_400_000)
    })
  })

  describe('getHourlyResetMs', () => {
    it('returns ms until next :00 UTC', () => {
      // Current: :32:45.123 into the hour
      // Remaining: 3600000 - (32*60+45)*1000 - 123 = 3600000 - 1965123 = 1634877ms
      const result = getHourlyResetMs()
      expect(result).toBeCloseTo(1_634_877, -2)
    })

    it('returns a positive value', () => {
      expect(getHourlyResetMs()).toBeGreaterThan(0)
    })

    it('returns at most 1 hour in ms', () => {
      expect(getHourlyResetMs()).toBeLessThanOrEqual(3_600_000)
    })
  })

  describe('formatCountdown', () => {
    it('formats hours and minutes', () => {
      expect(formatCountdown(9_000_000)).toBe('2h 30m')
    })

    it('formats minutes and seconds', () => {
      expect(formatCountdown(150_000)).toBe('2m 30s')
    })

    it('formats seconds only', () => {
      expect(formatCountdown(45_000)).toBe('45s')
    })

    it('handles zero', () => {
      expect(formatCountdown(0)).toBe('0m')
    })

    it('handles negative (treats as zero)', () => {
      expect(formatCountdown(-1000)).toBe('0m')
    })
  })

  describe('getUTCDateString', () => {
    it('returns YYYY-MM-DD in UTC', () => {
      expect(getUTCDateString()).toBe('2026-04-19')
    })
  })
})
