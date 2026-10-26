import type { FoodSelection, Match, PlayerSlot } from './entities/match'

export type Winner = PlayerSlot | 'tie'

export interface MatchResult {
  /** Puntos de lo comido (o de lo planeado, si aún no se confirma). */
  points: Record<PlayerSlot, number>
  plannedPoints: Record<PlayerSlot, number>
  winner: Winner
}

export function plannedPointsOf(selection: FoodSelection): number {
  return selection.plannedQuantity * selection.pointsPerPortionSnapshot
}

export function consumedPointsOf(selection: FoodSelection): number {
  return (selection.consumedQuantity ?? selection.plannedQuantity) * selection.pointsPerPortionSnapshot
}

function sumBy(match: Match, slot: PlayerSlot, fn: (s: FoodSelection) => number): number {
  return match.selections.filter((s) => s.slot === slot).reduce((total, s) => total + fn(s), 0)
}

export function calculateMatchResult(match: Match): MatchResult {
  const points = { a: sumBy(match, 'a', consumedPointsOf), b: sumBy(match, 'b', consumedPointsOf) }
  const plannedPoints = { a: sumBy(match, 'a', plannedPointsOf), b: sumBy(match, 'b', plannedPointsOf) }
  const winner: Winner = points.a === points.b ? 'tie' : points.a > points.b ? 'a' : 'b'
  return { points, plannedPoints, winner }
}
