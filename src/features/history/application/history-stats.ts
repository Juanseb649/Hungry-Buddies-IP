import type { Match } from '../../matches/domain/entities/match'
import { calculateMatchResult } from '../../matches/domain/scoring'

export interface PlayerRecord {
  playerId: string
  displayName: string
  played: number
  wins: number
  ties: number
  totalPoints: number
  /** Más puntos en una sola partida. */
  bestPoints: number
}

export interface FoodTally {
  foodId: string
  name: string
  emoji: string
  portions: number
}

export interface HistoryStats {
  finished: Match[]
  players: PlayerRecord[]
  bestMatch: { playerId: string; displayName: string; points: number; matchId: string } | null
  topFood: FoodTally | null
}

function topFoodOf(matches: Match[], playerId?: string): FoodTally | null {
  const foods = new Map<string, FoodTally>()
  for (const match of matches) {
    const slots = Object.values(match.players)
      .filter((p) => !playerId || p.playerId === playerId)
      .map((p) => p.slot)
    for (const s of match.selections) {
      if (!slots.includes(s.slot)) continue
      const food = foods.get(s.foodId) ?? { foodId: s.foodId, name: s.foodName, emoji: s.foodEmoji, portions: 0 }
      food.portions += s.consumedQuantity
      foods.set(s.foodId, food)
    }
  }
  return [...foods.values()].filter((f) => f.portions > 0).sort((x, y) => y.portions - x.portions)[0] ?? null
}

export function computeHistoryStats(matches: Match[]): HistoryStats {
  const finished = matches.filter((m) => m.status === 'finished')
  const byPlayer = new Map<string, PlayerRecord>()
  let bestMatch: HistoryStats['bestMatch'] = null

  for (const match of finished) {
    const result = calculateMatchResult(match)
    for (const player of Object.values(match.players)) {
      const record = byPlayer.get(player.playerId) ?? {
        playerId: player.playerId,
        displayName: player.displayName,
        played: 0,
        wins: 0,
        ties: 0,
        totalPoints: 0,
        bestPoints: 0,
      }
      const points = result.points[player.slot]
      record.played += 1
      record.totalPoints += points
      record.bestPoints = Math.max(record.bestPoints, points)
      if (result.winner === player.slot) record.wins += 1
      if (result.winner === 'tie') record.ties += 1
      byPlayer.set(player.playerId, record)
      if (!bestMatch || points > bestMatch.points) {
        bestMatch = { playerId: player.playerId, displayName: player.displayName, points, matchId: match.id }
      }
    }
  }

  const players = [...byPlayer.values()].sort((x, y) => y.wins - x.wins || y.totalPoints - x.totalPoints)
  return { finished, players, bestMatch, topFood: topFoodOf(finished) }
}

export interface PlayerStats {
  record: PlayerRecord | null
  matches: Match[]
  favoriteFood: FoodTally | null
}

/** Estadísticas de una persona a partir de sus partidas terminadas. */
export function computePlayerStats(playerId: string, matches: Match[]): PlayerStats {
  const mine = matches.filter(
    (m) => m.status === 'finished' && Object.values(m.players).some((p) => p.playerId === playerId),
  )
  const record = computeHistoryStats(mine).players.find((p) => p.playerId === playerId) ?? null
  return { record, matches: mine, favoriteFood: topFoodOf(mine, playerId) }
}
