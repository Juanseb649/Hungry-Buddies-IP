import type { FoodItem } from '../../food-catalog/domain/food-item'
import { menuFoods, type Menu } from '../../food-catalog/domain/menu'
import { DomainError, type Match, type MatchMenu, type MatchPlayer, type PlayerSlot } from './entities/match'

export const QUANTITY_STEP = 0.5
export const MAX_QUANTITY = 50
export const MAX_NAME_LENGTH = 24

export function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ')
}

export function validateDisplayName(name: string): string | null {
  const n = normalizeName(name)
  if (!n) return 'Escribe un nombre o apodo.'
  if (n.length > MAX_NAME_LENGTH) return `El nombre debe tener ${MAX_NAME_LENGTH} caracteres o menos.`
  return null
}

export function validatePlayerNames(a: string, b: string): string | null {
  if (!normalizeName(a) || !normalizeName(b)) return 'Escribe un nombre o apodo para cada jugador.'
  const error = validateDisplayName(a) ?? validateDisplayName(b)
  if (error) return error
  if (normalizeName(a).toLocaleLowerCase() === normalizeName(b).toLocaleLowerCase()) {
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

/** Congela el menú con los puntos actuales del catálogo. */
export function snapshotMenu(menu: Menu, catalog: FoodItem[]): MatchMenu {
  const items = menuFoods(menu, catalog).map((f) => ({
    foodId: f.id,
    name: f.name,
    emoji: f.emoji,
    pointsPerPortion: f.pointsPerPortion,
  }))
  if (items.length === 0) {
    throw new DomainError('Ese menú se quedó sin comidas. Edítalo en Ajustes antes de jugar.')
  }
  return { id: menu.id, name: menu.name, emoji: menu.emoji, items }
}

export function createMatch(input: {
  id: string
  now: string
  menu: MatchMenu
  players: Record<PlayerSlot, Omit<MatchPlayer, 'slot'>>
}): Match {
  const error = validatePlayerNames(input.players.a.displayName, input.players.b.displayName)
  if (error) throw new DomainError(error)
  if (input.menu.items.length === 0) throw new DomainError('El menú necesita al menos una comida.')
  return {
    id: input.id,
    startedAt: input.now,
    finishedAt: null,
    status: 'playing',
    menu: input.menu,
    players: {
      a: { slot: 'a', ...input.players.a, displayName: normalizeName(input.players.a.displayName) },
      b: { slot: 'b', ...input.players.b, displayName: normalizeName(input.players.b.displayName) },
    },
    selections: [],
  }
}

export function consumedOf(match: Match, slot: PlayerSlot, foodId: string): number {
  return match.selections.find((s) => s.slot === slot && s.foodId === foodId)?.consumedQuantity ?? 0
}

/** Fija cuántas porciones de una comida del menú lleva un jugador. 0 la quita. */
export function setConsumedQuantity(
  match: Match,
  slot: PlayerSlot,
  foodId: string,
  quantity: number,
  newId: () => string,
): Match {
  if (match.status !== 'playing') {
    throw new DomainError('La partida ya terminó: el marcador no se puede cambiar.')
  }
  validateQuantity(quantity)
  const item = match.menu.items.find((i) => i.foodId === foodId)
  if (!item) throw new DomainError('Esa comida no está en el menú de esta partida.')
  const existing = match.selections.find((s) => s.slot === slot && s.foodId === foodId)
  if (quantity === 0) {
    return { ...match, selections: match.selections.filter((s) => s !== existing) }
  }
  if (existing) {
    return {
      ...match,
      selections: match.selections.map((s) => (s === existing ? { ...s, consumedQuantity: quantity } : s)),
    }
  }
  return {
    ...match,
    selections: [
      ...match.selections,
      {
        id: newId(),
        slot,
        foodId,
        foodName: item.name,
        foodEmoji: item.emoji,
        pointsPerPortionSnapshot: item.pointsPerPortion,
        consumedQuantity: quantity,
      },
    ],
  }
}

export function canFinish(match: Match): boolean {
  return match.status === 'playing' && match.selections.some((s) => s.consumedQuantity > 0)
}

export function finishMatch(match: Match, now: string): Match {
  if (match.status !== 'playing') throw new DomainError('Esta partida ya terminó.')
  if (!canFinish(match)) throw new DomainError('Nadie ha comido nada todavía.')
  return { ...match, status: 'finished', finishedAt: now }
}
