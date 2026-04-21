// XP thresholds for levels 1–120 using the standard RS3 formula:
// cumulative floor(L + 300 * 2^(L/7)) / 4
const XP_TABLE: number[] = (() => {
  const table: number[] = [0, 0]  // table[0] unused; table[1] = 0 (level 1)
  let points = 0
  for (let L = 1; L <= 119; L++) {
    points += Math.floor(L + 300 * Math.pow(2, L / 7))
    table.push(Math.floor(points / 4))  // table[L + 1]
  }
  return table
})()

export function xpForLevel(level: number): number {
  if (level <= 1) return 0
  if (level >= 120) return XP_TABLE[120]
  return XP_TABLE[level]
}

export function levelForXP(xp: number): number {
  for (let L = 120; L >= 2; L--) {
    if (xp >= XP_TABLE[L]) return L
  }
  return 1
}

export function levelProgressPercent(xp: number): number {
  if (xp >= XP_TABLE[120]) return 100
  const current = levelForXP(xp)
  if (current >= 120) return 100
  const lo = XP_TABLE[current]
  const hi = XP_TABLE[current + 1]
  return Math.round(((xp - lo) / (hi - lo)) * 1000) / 10
}
