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
  /** Emoji que identifica a la persona en su perfil. */
  avatar: string
  createdAt: string
}

export interface PlayerRepository {
  findOrCreate(displayName: string): Promise<Player>
  findById(id: string): Promise<Player | undefined>
  findByName(displayName: string): Promise<Player | undefined>
  /** Más recientes primero. */
  list(): Promise<Player[]>
  listRecent(limit: number): Promise<Player[]>
  update(player: Player): Promise<void>
}

export interface Clock {
  now(): string
}

export interface IdGenerator {
  next(): string
}

export const AVATARS = ['🐻', '🦊', '🐼', '🐯', '🐸', '🐵', '🐶', '🐱', '🐷', '🐰', '🦁', '🐙', '🦖', '👽', '🤠', '🥷']
