import type { HungryBuddiesDb, MatchRow } from '../../../../shared/database/db'
import type { FoodSelection, Match, MatchPlayer } from '../../domain/entities/match'
import type { IdGenerator, MatchRepository, Player, PlayerRepository } from '../../domain/ports/repositories'

export class DexieMatchRepository implements MatchRepository {
  constructor(private readonly db: HungryBuddiesDb) {}

  async save(match: Match): Promise<void> {
    const { db } = this
    await db.transaction('rw', db.matches, db.match_players, db.food_selections, async () => {
      await db.matches.put({
        id: match.id,
        started_at: match.startedAt,
        finished_at: match.finishedAt,
        status: match.status,
      })
      await db.match_players.bulkPut(
        Object.values(match.players).map((p) => ({
          match_id: match.id,
          slot: p.slot,
          player_id: p.playerId,
          display_name: p.displayName,
        })),
      )
      await db.food_selections.where('match_id').equals(match.id).delete()
      await db.food_selections.bulkAdd(
        match.selections.map((s) => ({
          id: s.id,
          match_id: match.id,
          slot: s.slot,
          food_id: s.foodId,
          food_name: s.foodName,
          food_emoji: s.foodEmoji,
          planned_quantity: s.plannedQuantity,
          consumed_quantity: s.consumedQuantity,
          points_per_portion_snapshot: s.pointsPerPortionSnapshot,
        })),
      )
    })
  }

  async findById(id: string): Promise<Match | undefined> {
    const { db } = this
    return db.transaction('r', db.matches, db.match_players, db.food_selections, async () => {
      const row = await db.matches.get(id)
      return row ? this.hydrate(row) : undefined
    })
  }

  async list(): Promise<Match[]> {
    const { db } = this
    return db.transaction('r', db.matches, db.match_players, db.food_selections, async () => {
      const rows = await db.matches.orderBy('started_at').reverse().toArray()
      return Promise.all(rows.map((row) => this.hydrate(row)))
    })
  }

  async remove(id: string): Promise<void> {
    const { db } = this
    await db.transaction('rw', db.matches, db.match_players, db.food_selections, async () => {
      await db.food_selections.where('match_id').equals(id).delete()
      await db.match_players.where('match_id').equals(id).delete()
      await db.matches.delete(id)
    })
  }

  private async hydrate(row: MatchRow): Promise<Match> {
    const [playerRows, selectionRows] = await Promise.all([
      this.db.match_players.where('match_id').equals(row.id).toArray(),
      this.db.food_selections.where('match_id').equals(row.id).toArray(),
    ])
    const players = Object.fromEntries(
      playerRows.map((p): [string, MatchPlayer] => [
        p.slot,
        { slot: p.slot, playerId: p.player_id, displayName: p.display_name },
      ]),
    ) as Match['players']
    const selections = selectionRows.map(
      (s): FoodSelection => ({
        id: s.id,
        slot: s.slot,
        foodId: s.food_id,
        foodName: s.food_name,
        foodEmoji: s.food_emoji,
        plannedQuantity: s.planned_quantity,
        consumedQuantity: s.consumed_quantity,
        pointsPerPortionSnapshot: s.points_per_portion_snapshot,
      }),
    )
    return {
      id: row.id,
      startedAt: row.started_at,
      finishedAt: row.finished_at,
      status: row.status,
      players,
      selections,
    }
  }
}

export class DexiePlayerRepository implements PlayerRepository {
  constructor(
    private readonly db: HungryBuddiesDb,
    private readonly ids: IdGenerator,
    private readonly now: () => string,
  ) {}

  async findOrCreate(displayName: string): Promise<Player> {
    const { db } = this
    return db.transaction('rw', db.players, async () => {
      const nameKey = displayName.toLocaleLowerCase()
      const now = this.now()
      const existing = await db.players.where('name_key').equals(nameKey).first()
      if (existing) {
        await db.players.update(existing.id, { display_name: displayName, last_played_at: now })
        return { id: existing.id, displayName, createdAt: existing.created_at }
      }
      const row = { id: this.ids.next(), display_name: displayName, name_key: nameKey, created_at: now, last_played_at: now }
      await db.players.add(row)
      return { id: row.id, displayName, createdAt: now }
    })
  }

  async listRecent(limit: number): Promise<Player[]> {
    const rows = await this.db.players.orderBy('last_played_at').reverse().limit(limit).toArray()
    return rows.map((r) => ({ id: r.id, displayName: r.display_name, createdAt: r.created_at }))
  }
}
