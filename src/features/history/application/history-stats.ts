import type { Match } from '../../matches/domain/entities/match'
import { calculateMatchResult } from '../../matches/domain/scoring'

export interface PlayerRecord {
  playerId: string
  displayName: string
  played: number
  wins: number
  ties: number
  totalPoints: number
}

export interface HistoryStats {
  finished: Match[]
  players: PlayerRecord[]
  /** Más puntos en una sola partida. */
  bestMatch: { displayName: string; points: number; matchId: string } | null
  topFood: { name: string; emoji: string; portions: number } | null
}

export function computeHistoryStats(matches: Match[]): HistoryStats {
  const finished = matches.filter((m) => m.status === 'finished')
  const byPlayer = new Map<string, PlayerRecord>()
  const foods = new Map<string, { name: string; emoji: string; portions: number }>()
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
      }
      const points = result.points[player.slot]
      record.played += 1
      record.totalPoints += points
      if (result.winner === player.slot) record.wins += 1
      if (result.winner === 'tie') record.ties += 1
      byPlayer.set(player.playerId, record)
      if (!bestMatch || points > bestMatch.points) {
        bestMatch = { displayName: player.displayName, points, matchId: match.id }
      }
    }
    for (const s of match.selections) {
      const food = foods.get(s.foodId) ?? { name: s.foodName, emoji: s.foodEmoji, portions: 0 }
      food.portions += s.consumedQuantity ?? 0
      foods.set(s.foodId, food)
    }
  }

  const players = [...byPlayer.values()].sort((x, y) => y.wins - x.wins || y.totalPoints - x.totalPoints)
  const topFood = [...foods.values()].filter((f) => f.portions > 0).sort((x, y) => y.portions - x.portions)[0] ?? null
  return { finished, players, bestMatch, topFood }
}
