import type { FoodCatalogRepository } from '../../../food-catalog/domain/food-item'
import type { MenuRepository } from '../../../food-catalog/domain/menu'
import { DomainError, type Match, type PlayerSlot } from '../entities/match'
import type { Clock, IdGenerator, MatchRepository, PlayerRepository } from '../ports/repositories'
import * as rules from '../rules'

export interface MatchUseCasesDeps {
  matches: MatchRepository
  players: PlayerRepository
  catalog: FoodCatalogRepository
  menus: MenuRepository
  clock: Clock
  ids: IdGenerator
}

export type MatchUseCases = ReturnType<typeof makeMatchUseCases>

export function makeMatchUseCases({ matches, players, catalog, menus, clock, ids }: MatchUseCasesDeps) {
  const newId = () => ids.next()

  async function load(id: string): Promise<Match> {
    const match = await matches.findById(id)
    if (!match) throw new DomainError('No encontramos esa partida. Puede que se haya descartado.')
    return match
  }

  async function update(id: string, change: (match: Match) => Match): Promise<Match> {
    const next = change(await load(id))
    await matches.save(next)
    return next
  }

  return {
    async createMatch(menuId: string, nameA: string, nameB: string): Promise<Match> {
      const error = rules.validatePlayerNames(nameA, nameB)
      if (error) throw new DomainError(error)
      const menu = await menus.findById(menuId)
      if (!menu) throw new DomainError('Ese menú ya no existe. Elige otro.')
      const snapshot = rules.snapshotMenu(menu, await catalog.list())
      const [a, b] = await Promise.all([
        players.findOrCreate(rules.normalizeName(nameA)),
        players.findOrCreate(rules.normalizeName(nameB)),
      ])
      const match = rules.createMatch({
        id: newId(),
        now: clock.now(),
        menu: snapshot,
        players: {
          a: { playerId: a.id, displayName: a.displayName },
          b: { playerId: b.id, displayName: b.displayName },
        },
      })
      await matches.save(match)
      return match
    },

    getMatch: load,

    updateConsumedQuantity: (id: string, slot: PlayerSlot, foodId: string, quantity: number) =>
      update(id, (m) => rules.setConsumedQuantity(m, slot, foodId, quantity, newId)),

    finishMatch: (id: string) => update(id, (m) => rules.finishMatch(m, clock.now())),

    async discardMatch(id: string): Promise<void> {
      const match = await load(id)
      if (match.status === 'finished') {
        throw new DomainError('Una partida terminada no se puede descartar.')
      }
      await matches.remove(id)
    },

    getMatchHistory: () => matches.list(),

    recentPlayers: (limit = 6) => players.listRecent(limit),
  }
}
