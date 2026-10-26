export type PlayerSlot = 'a' | 'b'

export const PLAYER_SLOTS: readonly PlayerSlot[] = ['a', 'b']

export type MatchStatus = 'playing' | 'finished'

export interface MatchPlayer {
  slot: PlayerSlot
  playerId: string
  /** Snapshot del nombre al momento de jugar. */
  displayName: string
}

/** Copia de una comida del menú tal como estaba al empezar la partida. */
export interface MenuItemSnapshot {
  foodId: string
  name: string
  emoji: string
  pointsPerPortion: number
}

/** El menú elegido para la partida, congelado: editar ajustes no cambia partidas viejas. */
export interface MatchMenu {
  id: string
  name: string
  emoji: string
  items: MenuItemSnapshot[]
}

export interface FoodSelection {
  id: string
  slot: PlayerSlot
  foodId: string
  foodName: string
  foodEmoji: string
  pointsPerPortionSnapshot: number
  consumedQuantity: number
}

export interface Match {
  id: string
  startedAt: string
  finishedAt: string | null
  status: MatchStatus
  menu: MatchMenu
  players: Record<PlayerSlot, MatchPlayer>
  selections: FoodSelection[]
}

export class DomainError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DomainError'
  }
}
