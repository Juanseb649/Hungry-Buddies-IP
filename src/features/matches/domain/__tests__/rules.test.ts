import { describe, expect, it } from 'vitest'
import { DomainError, type Match } from '../entities/match'
import * as rules from '../rules'
import { calculateMatchResult } from '../scoring'
import type { FoodItem } from '../../../food-catalog/domain/food-item'

const burger: FoodItem = { id: 'burger', name: 'Hamburguesa', emoji: '🍔', pointsPerPortion: 3, isCustom: false }
const fries: FoodItem = { id: 'fries', name: 'Papas', emoji: '🍟', pointsPerPortion: 1, isCustom: false }

let n = 0
const newId = () => `id-${++n}`

function newMatch(): Match {
  return rules.createMatch({
    id: 'm1',
    now: '2026-10-26T12:00:00.000Z',
    players: { a: { playerId: 'p1', displayName: ' Ana ' }, b: { playerId: 'p2', displayName: 'Luis' } },
  })
}

describe('createMatch', () => {
  it('normaliza nombres y arranca en planeación', () => {
    const m = newMatch()
    expect(m.players.a.displayName).toBe('Ana')
    expect(m.status).toBe('planning')
  })

  it('rechaza nombres vacíos o repetidos', () => {
    expect(rules.validatePlayerNames('', 'Luis')).not.toBeNull()
    expect(rules.validatePlayerNames('ana', 'ANA')).not.toBeNull()
    expect(rules.validatePlayerNames('Ana', 'Luis')).toBeNull()
  })
})

describe('cantidades', () => {
  it('rechaza negativas, no múltiplos de media y excesivas', () => {
    const m = newMatch()
    expect(() => rules.setPlannedQuantity(m, 'a', burger, -1, newId)).toThrow(DomainError)
    expect(() => rules.setPlannedQuantity(m, 'a', burger, 1.3, newId)).toThrow(DomainError)
    expect(() => rules.setPlannedQuantity(m, 'a', burger, 51, newId)).toThrow(DomainError)
  })

  it('poner 0 en el plan quita la comida', () => {
    let m = rules.setPlannedQuantity(newMatch(), 'a', burger, 2, newId)
    m = rules.setPlannedQuantity(m, 'a', burger, 0, newId)
    expect(m.selections).toHaveLength(0)
  })
})

describe('flujo completo y puntuación', () => {
  function planned(): Match {
    let m = newMatch()
    m = rules.setPlannedQuantity(m, 'a', burger, 2, newId) // 6 pts
    m = rules.setPlannedQuantity(m, 'b', fries, 4, newId) // 4 pts
    return m
  }

  it('no deja empezar a comer si un jugador no eligió nada', () => {
    const m = rules.setPlannedQuantity(newMatch(), 'a', burger, 1, newId)
    expect(rules.canStartEating(m)).toBe(false)
    expect(() => rules.startEating(m)).toThrow(DomainError)
  })

  it('lo consumido arranca igual a lo planeado', () => {
    const m = rules.startEating(planned())
    expect(m.selections.every((s) => s.consumedQuantity === s.plannedQuantity)).toBe(true)
    expect(calculateMatchResult(m).winner).toBe('a')
  })

  it('gana quien más puntos come de verdad, no quien más planea', () => {
    let m = rules.startEating(planned())
    m = rules.setConsumedQuantity(m, 'a', burger, 1, newId) // 3
    m = rules.setConsumedQuantity(m, 'b', burger, 0.5, newId) // 4 + 1.5, no estaba planeado
    m = rules.finishMatch(m, '2026-10-26T13:00:00.000Z')
    const result = calculateMatchResult(m)
    expect(result.points).toEqual({ a: 3, b: 5.5 })
    expect(result.plannedPoints).toEqual({ a: 6, b: 4 })
    expect(result.winner).toBe('b')
  })

  it('detecta empate', () => {
    let m = rules.startEating(planned())
    m = rules.setConsumedQuantity(m, 'a', burger, 1, newId) // 3
    m = rules.setConsumedQuantity(m, 'b', fries, 3, newId) // 3
    expect(calculateMatchResult(m).winner).toBe('tie')
  })

  it('usa el snapshot de puntos aunque cambie el catálogo', () => {
    const m = rules.startEating(planned())
    const pricier = { ...burger, pointsPerPortion: 10 }
    const next = rules.setConsumedQuantity(m, 'a', pricier, 2, newId)
    expect(calculateMatchResult(next).points.a).toBe(6)
  })

  it('una partida cerrada no se puede modificar', () => {
    const m = rules.finishMatch(rules.startEating(planned()), '2026-10-26T13:00:00.000Z')
    expect(() => rules.setConsumedQuantity(m, 'a', burger, 5, newId)).toThrow(DomainError)
    expect(() => rules.setPlannedQuantity(m, 'a', burger, 5, newId)).toThrow(DomainError)
    expect(() => rules.finishMatch(m, 'x')).toThrow(DomainError)
  })

  it('volver al plan descarta lo no planeado', () => {
    let m = rules.startEating(planned())
    m = rules.setConsumedQuantity(m, 'a', fries, 2, newId)
    m = rules.backToPlanning(m)
    expect(m.status).toBe('planning')
    expect(m.selections).toHaveLength(2)
    expect(m.selections.every((s) => s.consumedQuantity === null)).toBe(true)
  })
})
