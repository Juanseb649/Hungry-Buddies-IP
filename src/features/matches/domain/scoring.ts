import type { FoodSelection, Match, PlayerSlot } from './entities/match'

export type Winner = PlayerSlot | 'tie'

export interface MatchResult {
  points: Record<PlayerSlot, number>
  portions: Record<PlayerSlot, number>
  winner: Winner
}

export function pointsOf(selection: FoodSelection): number {
  return selection.consumedQuantity * selection.pointsPerPortionSnapshot
}

function sumBy(match: Match, slot: PlayerSlot, fn: (s: FoodSelection) => number): number {
  return match.selections.filter((s) => s.slot === slot).reduce((total, s) => total + fn(s), 0)
}

export function calculateMatchResult(match: Match): MatchResult {
  const points = { a: sumBy(match, 'a', pointsOf), b: sumBy(match, 'b', pointsOf) }
  const portions = {
    a: sumBy(match, 'a', (s) => s.consumedQuantity),
    b: sumBy(match, 'b', (s) => s.consumedQuantity),
  }
  const winner: Winner = points.a === points.b ? 'tie' : points.a > points.b ? 'a' : 'b'
  return { points, portions, winner }
}

/** Lo que más porciones sumó un jugador en la partida. */
export function favoriteOf(match: Match, slot: PlayerSlot): FoodSelection | null {
  return (
    match.selections
      .filter((s) => s.slot === slot && s.consumedQuantity > 0)
      .sort((x, y) => y.consumedQuantity - x.consumedQuantity)[0] ?? null
  )
}
