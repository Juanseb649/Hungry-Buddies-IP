import type { Match } from '../entities/match'

export interface MatchRepository {
  save(match: Match): Promise<void>
  findById(id: string): Promise<Match | undefined>
  /** Más recientes primero. */
  list(): Promise<Match[]>
  remove(id: string): Promise<void>
}

export interface Player {
  id: string
  displayName: string
  createdAt: string
}

export interface PlayerRepository {
  findOrCreate(displayName: string): Promise<Player>
  /** Nombres usados recientemente, para sugerirlos al crear partida. */
  listRecent(limit: number): Promise<Player[]>
}

export interface Clock {
  now(): string
}

export interface IdGenerator {
  next(): string
}
