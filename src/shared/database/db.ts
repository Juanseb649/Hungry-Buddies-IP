import { Dexie, type EntityTable } from 'dexie'
import { DEFAULT_CATALOG } from '../../features/food-catalog/domain/food-item'

// Filas tal como viven en IndexedDB (snake_case, como en el modelo de datos del documento).

export interface PlayerRow {
  id: string
  display_name: string
  /** Nombre en minúsculas para buscar sin importar mayúsculas. */
  name_key: string
  created_at: string
  last_played_at: string
}

export interface FoodRow {
  id: string
  name: string
  emoji: string
  points_per_portion: number
  is_custom: 0 | 1
  position: number
}

export interface MatchRow {
  id: string
  started_at: string
  finished_at: string | null
  status: 'planning' | 'eating' | 'finished'
}

export interface MatchPlayerRow {
  match_id: string
  slot: 'a' | 'b'
  player_id: string
  display_name: string
}

export interface FoodSelectionRow {
  id: string
  match_id: string
  slot: 'a' | 'b'
  food_id: string
  food_name: string
  food_emoji: string
  planned_quantity: number
  consumed_quantity: number | null
  points_per_portion_snapshot: number
}

export class HungryBuddiesDb extends Dexie {
  players!: EntityTable<PlayerRow, 'id'>
  foods!: EntityTable<FoodRow, 'id'>
  matches!: EntityTable<MatchRow, 'id'>
  match_players!: Dexie.Table<MatchPlayerRow, [string, string]>
  food_selections!: EntityTable<FoodSelectionRow, 'id'>

  constructor(name = 'hungry-buddies') {
    super(name)
    // Cada cambio de esquema es una nueva versión: db.version(2).stores(...).upgrade(...)
    this.version(1).stores({
      players: 'id, &name_key, last_played_at',
      foods: 'id, position',
      matches: 'id, started_at, status',
      match_players: '[match_id+slot], match_id, player_id',
      food_selections: 'id, match_id',
    })
    this.on('populate', (tx) => {
      tx.table('foods').bulkAdd(
        DEFAULT_CATALOG.map((f, position) => ({
          id: f.id,
          name: f.name,
          emoji: f.emoji,
          points_per_portion: f.pointsPerPortion,
          is_custom: 0,
          position,
        })),
      )
    })
  }
}
