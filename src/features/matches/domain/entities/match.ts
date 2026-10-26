export type PlayerSlot = 'a' | 'b'

export const PLAYER_SLOTS: readonly PlayerSlot[] = ['a', 'b']

export type MatchStatus = 'planning' | 'eating' | 'finished'

export interface MatchPlayer {
  slot: PlayerSlot
  playerId: string
  /** Snapshot del nombre al momento de jugar. */
  displayName: string
}

export interface FoodSelection {
  id: string
  slot: PlayerSlot
  foodId: string
  /** Snapshots del catálogo: editar el catálogo no cambia partidas viejas. */
  foodName: string
  foodEmoji: string
  pointsPerPortionSnapshot: number
  /** 0 cuando el alimento no estaba planeado y se agregó al confirmar. */
  plannedQuantity: number
  /** null hasta que empieza la fase de confirmación. */
  consumedQuantity: number | null
}

export interface Match {
  id: string
  startedAt: string
  finishedAt: string | null
  status: MatchStatus
  players: Record<PlayerSlot, MatchPlayer>
  selections: FoodSelection[]
}

export class DomainError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DomainError'
  }
}
