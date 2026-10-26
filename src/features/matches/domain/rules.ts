import type { FoodItem } from '../../food-catalog/domain/food-item'
import {
  DomainError,
  PLAYER_SLOTS,
  type FoodSelection,
  type Match,
  type MatchPlayer,
  type PlayerSlot,
} from './entities/match'

export const QUANTITY_STEP = 0.5
export const MAX_QUANTITY = 50
export const MAX_NAME_LENGTH = 24

export function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ')
}

export function validatePlayerNames(a: string, b: string): string | null {
  const na = normalizeName(a)
  const nb = normalizeName(b)
  if (!na || !nb) return 'Escribe un nombre o apodo para cada jugador.'
  if (na.length > MAX_NAME_LENGTH || nb.length > MAX_NAME_LENGTH) {
    return `Los nombres deben tener ${MAX_NAME_LENGTH} caracteres o menos.`
  }
  if (na.toLocaleLowerCase() === nb.toLocaleLowerCase()) {
    return 'Usa nombres distintos para que se sepa quién es quién.'
  }
  return null
}

export function validateQuantity(quantity: number): void {
  if (!Number.isFinite(quantity) || quantity < 0) {
    throw new DomainError('La cantidad no puede ser negativa.')
  }
  if (quantity > MAX_QUANTITY) {
    throw new DomainError(`La cantidad máxima es ${MAX_QUANTITY} porciones.`)
  }
  if (Math.round(quantity / QUANTITY_STEP) * QUANTITY_STEP !== quantity) {
    throw new DomainError('Las cantidades van de media en media porción.')
  }
}

export function createMatch(input: {
  id: string
  now: string
  players: Record<PlayerSlot, Omit<MatchPlayer, 'slot'>>
}): Match {
  const error = validatePlayerNames(input.players.a.displayName, input.players.b.displayName)
  if (error) throw new DomainError(error)
  return {
    id: input.id,
    startedAt: input.now,
    finishedAt: null,
    status: 'planning',
    players: {
      a: { slot: 'a', ...input.players.a, displayName: normalizeName(input.players.a.displayName) },
      b: { slot: 'b', ...input.players.b, displayName: normalizeName(input.players.b.displayName) },
    },
    selections: [],
  }
}

function assertStatus(match: Match, status: Match['status'], message: string): void {
  if (match.status !== status) throw new DomainError(message)
}

function findSelection(match: Match, slot: PlayerSlot, foodId: string): FoodSelection | undefined {
  return match.selections.find((s) => s.slot === slot && s.foodId === foodId)
}

function newSelection(id: string, slot: PlayerSlot, food: FoodItem): FoodSelection {
  return {
    id,
    slot,
    foodId: food.id,
    foodName: food.name,
    foodEmoji: food.emoji,
    pointsPerPortionSnapshot: food.pointsPerPortion,
    plannedQuantity: 0,
    consumedQuantity: null,
  }
}

/** Fija cuánto planea comer un jugador de un alimento. 0 lo quita del plan. */
export function setPlannedQuantity(
  match: Match,
  slot: PlayerSlot,
  food: FoodItem,
  quantity: number,
  newId: () => string,
): Match {
  assertStatus(match, 'planning', 'El plan ya está cerrado: ahora se confirma lo que se comió.')
  validateQuantity(quantity)
  const existing = findSelection(match, slot, food.id)
  if (quantity === 0) {
    return { ...match, selections: match.selections.filter((s) => s !== existing) }
  }
  if (existing) {
    return {
      ...match,
      selections: match.selections.map((s) => (s === existing ? { ...s, plannedQuantity: quantity } : s)),
    }
  }
  return {
    ...match,
    selections: [...match.selections, { ...newSelection(newId(), slot, food), plannedQuantity: quantity }],
  }
}

export function canStartEating(match: Match): boolean {
  return PLAYER_SLOTS.every((slot) => match.selections.some((s) => s.slot === slot))
}

/** Cierra el plan. Lo consumido arranca igual a lo planeado. */
export function startEating(match: Match): Match {
  assertStatus(match, 'planning', 'Esta partida ya no está en la fase de plan.')
  if (!canStartEating(match)) {
    throw new DomainError('Cada jugador necesita al menos una comida en su plan.')
  }
  return {
    ...match,
    status: 'eating',
    selections: match.selections.map((s) => ({ ...s, consumedQuantity: s.plannedQuantity })),
  }
}

/** Vuelve al plan; se descartan los ajustes de consumo y lo no planeado. */
export function backToPlanning(match: Match): Match {
  assertStatus(match, 'eating', 'Solo se puede volver al plan antes de cerrar la partida.')
  return {
    ...match,
    status: 'planning',
    selections: match.selections
      .filter((s) => s.plannedQuantity > 0)
      .map((s) => ({ ...s, consumedQuantity: null })),
  }
}

/** Registra cuánto comió de verdad. Permite sumar comida que no estaba planeada. */
export function setConsumedQuantity(
  match: Match,
  slot: PlayerSlot,
  food: FoodItem,
  quantity: number,
  newId: () => string,
): Match {
  assertStatus(match, 'eating', 'Solo se puede ajustar lo comido mientras la partida está abierta.')
  validateQuantity(quantity)
  const existing = findSelection(match, slot, food.id)
  if (!existing) {
    if (quantity === 0) return match
    return {
      ...match,
      selections: [...match.selections, { ...newSelection(newId(), slot, food), consumedQuantity: quantity }],
    }
  }
  if (quantity === 0 && existing.plannedQuantity === 0) {
    return { ...match, selections: match.selections.filter((s) => s !== existing) }
  }
  return {
    ...match,
    selections: match.selections.map((s) => (s === existing ? { ...s, consumedQuantity: quantity } : s)),
  }
}

export function finishMatch(match: Match, now: string): Match {
  assertStatus(match, 'eating', 'La partida tiene que estar en la fase de confirmación para cerrarla.')
  return { ...match, status: 'finished', finishedAt: now }
}
