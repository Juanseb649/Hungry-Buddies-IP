import { afterEach, describe, expect, it } from 'vitest'
import { HungryBuddiesDb } from '../../../../shared/database/db'
import { createContainer } from '../../../../app/container'
import { exportBackup, importBackup, parseBackup } from '../../../../shared/database/backup'

let db: HungryBuddiesDb

afterEach(async () => {
  await db?.delete()
})

function setup() {
  db = new HungryBuddiesDb(`test-${Math.random()}`)
  return createContainer(db)
}

describe('persistencia con Dexie', () => {
  it('siembra el catálogo al crear la base', async () => {
    const { catalog } = setup()
    const foods = await catalog.list()
    expect(foods.length).toBeGreaterThan(5)
    expect(foods[0].id).toBe('hamburguesa')
  })

  it('guarda y recupera una partida completa', async () => {
    const { matches } = setup()
    const created = await matches.createMatch('Ana', 'Luis')
    await matches.addFoodSelection(created.id, 'a', 'hamburguesa', 2)
    await matches.addFoodSelection(created.id, 'b', 'papas', 1.5)
    await matches.startEating(created.id)
    await matches.updateConsumedQuantity(created.id, 'b', 'taco', 1)
    const finished = await matches.finishMatch(created.id)

    const loaded = await matches.getMatch(created.id)
    expect(loaded).toEqual(finished)
    expect(loaded.status).toBe('finished')
    expect(loaded.selections).toHaveLength(3)
  })

  it('reutiliza jugadores por nombre sin importar mayúsculas', async () => {
    const { matches } = setup()
    const one = await matches.createMatch('Ana', 'Luis')
    const two = await matches.createMatch('ana', 'Sofi')
    expect(two.players.a.playerId).toBe(one.players.a.playerId)
    expect((await matches.recentPlayers()).map((p) => p.displayName)).toContain('Sofi')
  })

  it('descarta partidas abiertas', async () => {
    const { matches } = setup()
    const m = await matches.createMatch('Ana', 'Luis')
    await matches.discardMatch(m.id)
    expect(await matches.getMatchHistory()).toHaveLength(0)
  })

  it('exporta e importa un respaldo', async () => {
    const { matches, clock } = setup()
    const m = await matches.createMatch('Ana', 'Luis')
    await matches.addFoodSelection(m.id, 'a', 'pizza', 3)
    const backup = parseBackup(JSON.stringify(await exportBackup(db, clock.now())))

    await matches.discardMatch(m.id)
    await importBackup(db, backup)
    expect((await matches.getMatch(m.id)).selections[0].plannedQuantity).toBe(3)
  })

  it('rechaza archivos que no son respaldos', () => {
    expect(() => parseBackup('{"hola":1}')).toThrow('no es un respaldo')
    expect(() => parseBackup('no json')).toThrow('JSON')
  })
})
