import { afterEach, describe, expect, it } from 'vitest'
import { Dexie } from 'dexie'
import { HungryBuddiesDb } from '../../../../shared/database/db'
import { createContainer } from '../../../../app/container'
import { exportBackup, importBackup, parseBackup } from '../../../../shared/database/backup'

let db: HungryBuddiesDb

afterEach(async () => {
  await db?.delete()
})

function setup(name = `test-${Math.random()}`) {
  db = new HungryBuddiesDb(name)
  return createContainer(db)
}

describe('persistencia con Dexie', () => {
  it('siembra catálogo y menús al crear la base', async () => {
    const { catalog, menus } = setup()
    expect((await catalog.list())[0].id).toBe('hamburguesa')
    expect((await menus.list()).map((m) => m.id)).toContain('comida-rapida')
  })

  it('guarda y recupera una partida completa', async () => {
    const { matches } = setup()
    const created = await matches.createMatch('comida-rapida', 'Ana', 'Luis')
    expect(created.menu.items.map((i) => i.foodId)).toContain('hamburguesa')
    await matches.updateConsumedQuantity(created.id, 'a', 'hamburguesa', 2)
    await matches.updateConsumedQuantity(created.id, 'b', 'papas', 1.5)
    const finished = await matches.finishMatch(created.id)

    const loaded = await matches.getMatch(created.id)
    expect(loaded).toEqual(finished)
    expect(loaded.status).toBe('finished')
    expect(loaded.selections).toHaveLength(2)
  })

  it('no cambia partidas viejas al editar el menú', async () => {
    const { matches, menus } = setup()
    const m = await matches.createMatch('postres', 'Ana', 'Luis')
    const menu = (await menus.findById('postres'))!
    await menus.save({ ...menu, foodIds: ['dona'] })
    expect((await matches.getMatch(m.id)).menu.items).toHaveLength(2)
  })

  it('reutiliza jugadores por nombre y les asigna avatar', async () => {
    const { matches, profiles } = setup()
    const one = await matches.createMatch('postres', 'Ana', 'Luis')
    const two = await matches.createMatch('postres', 'ana', 'Sofi')
    expect(two.players.a.playerId).toBe(one.players.a.playerId)
    const people = await profiles.listProfiles()
    expect(people.map((p) => p.player.displayName).sort()).toEqual(['Ana', 'Luis', 'Sofi'])
    expect(people.every((p) => p.player.avatar.length > 0)).toBe(true)
  })

  it('edita un perfil y evita nombres repetidos', async () => {
    const { matches, profiles } = setup()
    const m = await matches.createMatch('postres', 'Ana', 'Luis')
    await matches.updateConsumedQuantity(m.id, 'a', 'dona', 2)
    await matches.finishMatch(m.id)
    const anaId = m.players.a.playerId

    await profiles.updateProfile(anaId, { displayName: 'Anita', avatar: '🦊' })
    const ana = await profiles.getProfile(anaId)
    expect(ana.player).toMatchObject({ displayName: 'Anita', avatar: '🦊' })
    expect(ana.record).toMatchObject({ played: 1, wins: 1 })
    expect(ana.favoriteFood?.foodId).toBe('dona')
    await expect(profiles.updateProfile(anaId, { displayName: 'luis', avatar: '🦊' })).rejects.toThrow('Ya hay')
  })

  it('descarta partidas en juego', async () => {
    const { matches } = setup()
    const m = await matches.createMatch('postres', 'Ana', 'Luis')
    await matches.discardMatch(m.id)
    expect(await matches.getMatchHistory()).toHaveLength(0)
  })

  it('exporta e importa un respaldo', async () => {
    const { matches, clock } = setup()
    const m = await matches.createMatch('comida-rapida', 'Ana', 'Luis')
    await matches.updateConsumedQuantity(m.id, 'a', 'pizza', 3)
    const backup = parseBackup(JSON.stringify(await exportBackup(db, clock.now())))

    await matches.discardMatch(m.id)
    await importBackup(db, backup)
    expect((await matches.getMatch(m.id)).selections[0].consumedQuantity).toBe(3)
  })

  it('rechaza archivos que no son respaldos', () => {
    expect(() => parseBackup('{"hola":1}')).toThrow('no es un respaldo')
    expect(() => parseBackup('no json')).toThrow('JSON')
  })

  it('migra una base v1 (con fase de plan) a v2', async () => {
    const name = `test-migra-${Math.random()}`
    const v1 = new Dexie(name)
    v1.version(1).stores({
      players: 'id, &name_key, last_played_at',
      foods: 'id, position',
      matches: 'id, started_at, status',
      match_players: '[match_id+slot], match_id, player_id',
      food_selections: 'id, match_id',
    })
    await v1.table('matches').add({ id: 'm', started_at: '2026-10-26T12:00:00Z', finished_at: null, status: 'eating' })
    await v1.table('players').add({ id: 'p', display_name: 'Ana', name_key: 'ana', created_at: 'x', last_played_at: 'x' })
    await v1.table('food_selections').add({
      id: 's',
      match_id: 'm',
      slot: 'a',
      food_id: 'taco',
      food_name: 'Taco',
      food_emoji: '🌮',
      planned_quantity: 2,
      consumed_quantity: null,
      points_per_portion_snapshot: 1,
    })
    v1.close()

    setup(name)
    const match = await db.matches.get('m')
    expect(match?.status).toBe('playing')
    expect(match?.menu.items.map((i) => i.foodId)).toEqual(['taco'])
    expect((await db.food_selections.get('s'))?.consumed_quantity).toBe(2)
    expect((await db.players.get('p'))?.avatar).toBeTruthy()
    expect(await db.menus.count()).toBeGreaterThan(0)
  })
})
