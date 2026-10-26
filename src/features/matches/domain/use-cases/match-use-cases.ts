import type { FoodCatalogRepository, FoodItem } from '../../../food-catalog/domain/food-item'
import { DomainError, type Match, type PlayerSlot } from '../entities/match'
import type { Clock, IdGenerator, MatchRepository, PlayerRepository } from '../ports/repositories'
import * as rules from '../rules'

export interface MatchUseCasesDeps {
  matches: MatchRepository
  players: PlayerRepository
  catalog: FoodCatalogRepository
  clock: Clock
  ids: IdGenerator
}

export type MatchUseCases = ReturnType<typeof makeMatchUseCases>

export function makeMatchUseCases({ matches, players, catalog, clock, ids }: MatchUseCasesDeps) {
  const newId = () => ids.next()

  async function load(id: string): Promise<Match> {
    const match = await matches.findById(id)
    if (!match) throw new DomainError('No encontramos esa partida. Puede que se haya descartado.')
    return match
  }

  async function findFood(foodId: string): Promise<FoodItem> {
    const food = (await catalog.list()).find((f) => f.id === foodId)
    if (!food) throw new DomainError('Esa comida ya no está en el catálogo.')
    return food
  }

  async function update(id: string, change: (match: Match) => Match): Promise<Match> {
    const next = change(await load(id))
    await matches.save(next)
    return next
  }

  return {
    async createMatch(nameA: string, nameB: string): Promise<Match> {
      const error = rules.validatePlayerNames(nameA, nameB)
      if (error) throw new DomainError(error)
      const [a, b] = await Promise.all([
        players.findOrCreate(rules.normalizeName(nameA)),
        players.findOrCreate(rules.normalizeName(nameB)),
      ])
      const match = rules.createMatch({
        id: newId(),
        now: clock.now(),
        players: {
          a: { playerId: a.id, displayName: a.displayName },
          b: { playerId: b.id, displayName: b.displayName },
        },
      })
      await matches.save(match)
      return match
    },

    getMatch: load,

    async addFoodSelection(id: string, slot: PlayerSlot, foodId: string, quantity: number) {
      const food = await findFood(foodId)
      return update(id, (m) => rules.setPlannedQuantity(m, slot, food, quantity, newId))
    },

    startEating: (id: string) => update(id, rules.startEating),

    backToPlanning: (id: string) => update(id, rules.backToPlanning),

    async updateConsumedQuantity(id: string, slot: PlayerSlot, foodId: string, quantity: number) {
      const match = await load(id)
      // Una comida ya elegida conserva su snapshot aunque se haya borrado del catálogo.
      const existing = match.selections.find((s) => s.slot === slot && s.foodId === foodId)
      const food: FoodItem = existing
        ? {
            id: existing.foodId,
            name: existing.foodName,
            emoji: existing.foodEmoji,
            pointsPerPortion: existing.pointsPerPortionSnapshot,
            isCustom: false,
          }
        : await findFood(foodId)
      const next = rules.setConsumedQuantity(match, slot, food, quantity, newId)
      await matches.save(next)
      return next
    },

    finishMatch: (id: string) => update(id, (m) => rules.finishMatch(m, clock.now())),

    async discardMatch(id: string): Promise<void> {
      const match = await load(id)
      if (match.status === 'finished') {
        throw new DomainError('Una partida cerrada no se puede descartar.')
      }
      await matches.remove(id)
    },

    getMatchHistory: () => matches.list(),

    recentPlayers: (limit = 6) => players.listRecent(limit),
  }
}
