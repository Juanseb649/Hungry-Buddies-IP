import { createContext, useContext } from 'react'
import { randomId } from '../shared/utils/ids'
import { DexieFoodCatalogRepository } from '../features/food-catalog/data/dexie-food-catalog-repository'
import type { FoodCatalogRepository } from '../features/food-catalog/domain/food-item'
import { DexieMenuRepository } from '../features/food-catalog/data/dexie-menu-repository'
import type { MenuRepository } from '../features/food-catalog/domain/menu'
import { makeProfileUseCases, type ProfileUseCases } from '../features/profiles/application/profile-use-cases'
import { DexieMatchRepository, DexiePlayerRepository } from '../features/matches/data/dexie/dexie-repositories'
import type { Clock, IdGenerator } from '../features/matches/domain/ports/repositories'
import { makeMatchUseCases, type MatchUseCases } from '../features/matches/domain/use-cases/match-use-cases'
import { HungryBuddiesDb } from '../shared/database/db'

/** Punto único de composición: aquí se conectan los puertos con sus adaptadores. */
export interface Container {
  db: HungryBuddiesDb
  catalog: FoodCatalogRepository
  menus: MenuRepository
  matches: MatchUseCases
  profiles: ProfileUseCases
  clock: Clock
  ids: IdGenerator
}

export function createContainer(db = new HungryBuddiesDb()): Container {
  const clock: Clock = { now: () => new Date().toISOString() }
  const ids: IdGenerator = { next: randomId }
  const catalog = new DexieFoodCatalogRepository(db)
  const menus = new DexieMenuRepository(db)
  const matchRepo = new DexieMatchRepository(db)
  const players = new DexiePlayerRepository(db, ids, clock.now)
  const matches = makeMatchUseCases({ matches: matchRepo, players, catalog, menus, clock, ids })
  const profiles = makeProfileUseCases({ players, matches: matchRepo })
  return { db, catalog, menus, matches, profiles, clock, ids }
}

export const ContainerContext = createContext<Container | null>(null)

export function useContainer(): Container {
  const container = useContext(ContainerContext)
  if (!container) throw new Error('useContainer debe usarse dentro de <ContainerContext>')
  return container
}
