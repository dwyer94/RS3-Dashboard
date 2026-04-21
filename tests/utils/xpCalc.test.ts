import { describe, it, expect } from 'vitest'
import { xpForLevel, levelForXP, levelProgressPercent } from '../../src/utils/xpCalc'

describe('xpForLevel', () => {
  it('returns 0 for level 1', () => {
    expect(xpForLevel(1)).toBe(0)
  })

  it('returns 83 for level 2', () => {
    expect(xpForLevel(2)).toBe(83)
  })

  it('returns 1154 for level 10', () => {
    expect(xpForLevel(10)).toBe(1_154)
  })

  it('returns 13,034,431 for level 99', () => {
    expect(xpForLevel(99)).toBe(13_034_431)
  })

  it('returns 104,273,167 for level 120', () => {
    expect(xpForLevel(120)).toBe(104_273_167)
  })

  it('clamps to level 120 for levels above 120', () => {
    expect(xpForLevel(121)).toBe(xpForLevel(120))
  })
})

describe('levelForXP', () => {
  it('returns 1 for 0 XP', () => {
    expect(levelForXP(0)).toBe(1)
  })

  it('returns 2 for exactly 83 XP', () => {
    expect(levelForXP(83)).toBe(2)
  })

  it('returns 2 for 84 XP (not yet level 3)', () => {
    expect(levelForXP(84)).toBe(2)
  })

  it('returns 10 for exactly 1154 XP', () => {
    expect(levelForXP(1_154)).toBe(10)
  })

  it('returns 99 for exactly level-99 XP', () => {
    expect(levelForXP(13_034_431)).toBe(99)
  })

  it('returns 120 for max-level XP', () => {
    expect(levelForXP(104_273_167)).toBe(120)
  })

  it('clamps to 120 for XP beyond max level', () => {
    expect(levelForXP(200_000_000)).toBe(120)
  })
})

describe('levelProgressPercent', () => {
  it('returns 0 at the start of level 1', () => {
    expect(levelProgressPercent(0)).toBe(0)
  })

  it('returns 0 at exact level boundaries', () => {
    expect(levelProgressPercent(83)).toBe(0)
    expect(levelProgressPercent(1_154)).toBe(0)
  })

  it('returns a value between 0 and 100 within a level', () => {
    const pct = levelProgressPercent(100)
    expect(pct).toBeGreaterThan(0)
    expect(pct).toBeLessThan(100)
  })

  it('returns 100 at max level XP', () => {
    expect(levelProgressPercent(104_273_167)).toBe(100)
  })

  it('returns 100 for XP beyond max level', () => {
    expect(levelProgressPercent(200_000_000)).toBe(100)
  })
})
