import { describe, expect, it } from 'vitest'
import { DomainError, type Match } from '../entities/match'
import * as rules from '../rules'
import { calculateMatchResult, favoriteOf } from '../scoring'
import type { FoodItem } from '../../../food-catalog/domain/food-item'
import type { Menu } from '../../../food-catalog/domain/menu'

const burger: FoodItem = { id: 'burger', name: 'Hamburguesa', emoji: '🍔', pointsPerPortion: 3, isCustom: false }
const fries: FoodItem = { id: 'fries', name: 'Papas', emoji: '🍟', pointsPerPortion: 1, isCustom: false }
const taco: FoodItem = { id: 'taco', name: 'Taco', emoji: '🌮', pointsPerPortion: 1, isCustom: false }
const catalog = [burger, fries, taco]
const fastFood: Menu = { id: 'fast', name: 'Comida rápida', emoji: '🍔', foodIds: ['burger', 'fries', 'ya-no-existe'] }

let n = 0
const newId = () => `id-${++n}`

function newMatch(): Match {
  return rules.createMatch({
    id: 'm1',
    now: '2026-10-26T12:00:00.000Z',
    menu: rules.snapshotMenu(fastFood, catalog),
    players: { a: { playerId: 'p1', displayName: ' Ana ' }, b: { playerId: 'p2', displayName: 'Luis' } },
  })
}

describe('menú', () => {
  it('congela las comidas que siguen en el catálogo, con sus puntos actuales', () => {
    const snap = rules.snapshotMenu(fastFood, catalog)
    expect(snap.items.map((i) => i.foodId)).toEqual(['burger', 'fries'])
    expect(snap.items[0].pointsPerPortion).toBe(3)
  })

  it('rechaza un menú sin comidas disponibles', () => {
    expect(() => rules.snapshotMenu({ ...fastFood, foodIds: ['nada'] }, catalog)).toThrow(DomainError)
  })
})

describe('createMatch', () => {
  it('normaliza nombres y arranca contando', () => {
    const m = newMatch()
    expect(m.players.a.displayName).toBe('Ana')
    expect(m.status).toBe('playing')
    expect(m.selections).toEqual([])
  })

  it('rechaza nombres vacíos o repetidos', () => {
    expect(rules.validatePlayerNames('', 'Luis')).not.toBeNull()
    expect(rules.validatePlayerNames('ana', 'ANA')).not.toBeNull()
    expect(rules.validatePlayerNames('Ana', 'Luis')).toBeNull()
  })
})

describe('contador', () => {
  it('rechaza cantidades negativas, no múltiplos de media y excesivas', () => {
    const m = newMatch()
    expect(() => rules.setConsumedQuantity(m, 'a', 'burger', -1, newId)).toThrow(DomainError)
    expect(() => rules.setConsumedQuantity(m, 'a', 'burger', 1.3, newId)).toThrow(DomainError)
    expect(() => rules.setConsumedQuantity(m, 'a', 'burger', 51, newId)).toThrow(DomainError)
  })

  it('solo cuenta comidas del menú de la partida', () => {
    expect(() => rules.setConsumedQuantity(newMatch(), 'a', 'taco', 1, newId)).toThrow('no está en el menú')
  })

  it('poner 0 quita la comida del marcador', () => {
    let m = rules.setConsumedQuantity(newMatch(), 'a', 'burger', 2, newId)
    m = rules.setConsumedQuantity(m, 'a', 'burger', 0, newId)
    expect(m.selections).toHaveLength(0)
  })

  it('suma puntos con el snapshot del menú y elige ganador', () => {
    let m = newMatch()
    m = rules.setConsumedQuantity(m, 'a', 'burger', 1, newId) // 3
    m = rules.setConsumedQuantity(m, 'b', 'fries', 4, newId) // 4
    m = rules.setConsumedQuantity(m, 'b', 'burger', 0.5, newId) // 1.5
    const result = calculateMatchResult(rules.finishMatch(m, '2026-10-26T13:00:00.000Z'))
    expect(result.points).toEqual({ a: 3, b: 5.5 })
    expect(result.portions).toEqual({ a: 1, b: 4.5 })
    expect(result.winner).toBe('b')
    expect(favoriteOf(m, 'b')?.foodId).toBe('fries')
  })

  it('detecta empate', () => {
    let m = newMatch()
    m = rules.setConsumedQuantity(m, 'a', 'burger', 1, newId)
    m = rules.setConsumedQuantity(m, 'b', 'fries', 3, newId)
    expect(calculateMatchResult(m).winner).toBe('tie')
  })
})

describe('terminar', () => {
  it('no deja terminar si nadie ha comido', () => {
    expect(rules.canFinish(newMatch())).toBe(false)
    expect(() => rules.finishMatch(newMatch(), 'x')).toThrow(DomainError)
  })

  it('una partida terminada no se puede modificar', () => {
    const m = rules.finishMatch(
      rules.setConsumedQuantity(newMatch(), 'a', 'burger', 1, newId),
      '2026-10-26T13:00:00.000Z',
    )
    expect(m.status).toBe('finished')
    expect(() => rules.setConsumedQuantity(m, 'a', 'burger', 5, newId)).toThrow(DomainError)
    expect(() => rules.finishMatch(m, 'x')).toThrow(DomainError)
  })
})
