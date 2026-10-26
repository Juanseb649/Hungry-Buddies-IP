import { Dexie, type EntityTable, type Transaction } from 'dexie'
import { DEFAULT_CATALOG } from '../../features/food-catalog/domain/food-item'
import { DEFAULT_MENUS } from '../../features/food-catalog/domain/menu'
import type { MatchMenu } from '../../features/matches/domain/entities/match'
import { AVATARS } from '../../features/matches/domain/ports/repositories'

// Filas tal como viven en IndexedDB (snake_case, como en el modelo de datos del documento).

export interface PlayerRow {
  id: string
  display_name: string
  /** Nombre en minúsculas para buscar sin importar mayúsculas. */
  name_key: string
  avatar: string
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

export interface MenuRow {
  id: string
  name: string
  emoji: string
  food_ids: string[]
  position: number
}

export interface MatchRow {
  id: string
  started_at: string
  finished_at: string | null
  status: 'playing' | 'finished'
  /** Snapshot del menú elegido. */
  menu: MatchMenu
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
  consumed_quantity: number
  points_per_portion_snapshot: number
}

async function seedMenus(tx: Transaction) {
  await tx.table('menus').bulkPut(
    DEFAULT_MENUS.map((m, position) => ({ id: m.id, name: m.name, emoji: m.emoji, food_ids: m.foodIds, position })),
  )
}

export class HungryBuddiesDb extends Dexie {
  players!: EntityTable<PlayerRow, 'id'>
  foods!: EntityTable<FoodRow, 'id'>
  menus!: EntityTable<MenuRow, 'id'>
  matches!: EntityTable<MatchRow, 'id'>
  match_players!: Dexie.Table<MatchPlayerRow, [string, string]>
  food_selections!: EntityTable<FoodSelectionRow, 'id'>

  constructor(name = 'hungry-buddies') {
    super(name)
    this.version(1).stores({
      players: 'id, &name_key, last_played_at',
      foods: 'id, position',
      matches: 'id, started_at, status',
      match_players: '[match_id+slot], match_id, player_id',
      food_selections: 'id, match_id',
    })

    // v2: menús guardados, contador en vivo (sin fase de plan) y avatar en perfiles.
    this.version(2)
      .stores({ menus: 'id, position' })
      .upgrade(async (tx) => {
        await seedMenus(tx)
        let i = 0
        await tx.table('players').toCollection().modify((p) => {
          p.avatar ??= AVATARS[i++ % AVATARS.length]
        })
        await tx.table('food_selections').toCollection().modify((s) => {
          s.consumed_quantity = s.consumed_quantity ?? s.planned_quantity
          delete s.planned_quantity
        })
        const selections = await tx.table('food_selections').toArray()
        await tx.table('matches').toCollection().modify((m) => {
          const items = new Map<string, MatchMenu['items'][number]>()
          for (const s of selections.filter((x) => x.match_id === m.id)) {
            items.set(s.food_id, {
              foodId: s.food_id,
              name: s.food_name,
              emoji: s.food_emoji,
              pointsPerPortion: s.points_per_portion_snapshot,
            })
          }
          m.menu = { id: 'anterior', name: 'Partida anterior', emoji: '🍽️', items: [...items.values()] }
          if (m.status !== 'finished') m.status = 'playing'
        })
      })

    this.on('populate', async (tx) => {
      await tx.table('foods').bulkAdd(
        DEFAULT_CATALOG.map((f, position) => ({
          id: f.id,
          name: f.name,
          emoji: f.emoji,
          points_per_portion: f.pointsPerPortion,
          is_custom: 0,
          position,
        })),
      )
      await seedMenus(tx)
    })
  }
}
