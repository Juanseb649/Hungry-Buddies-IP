export interface FoodItem {
  id: string
  name: string
  emoji: string
  pointsPerPortion: number
  isCustom: boolean
}

export interface FoodCatalogRepository {
  list(): Promise<FoodItem[]>
  save(item: FoodItem): Promise<void>
  remove(id: string): Promise<void>
}

export const MAX_POINTS_PER_PORTION = 20

export function validateFoodItem(item: Pick<FoodItem, 'name' | 'pointsPerPortion'>): string | null {
  if (item.name.trim().length === 0) return 'Escribe un nombre para la comida.'
  if (item.name.trim().length > 40) return 'El nombre debe tener 40 caracteres o menos.'
  if (!Number.isInteger(item.pointsPerPortion) || item.pointsPerPortion < 1) {
    return 'Los puntos por porción deben ser un número entero de 1 o más.'
  }
  if (item.pointsPerPortion > MAX_POINTS_PER_PORTION) {
    return `Los puntos por porción no pueden pasar de ${MAX_POINTS_PER_PORTION}.`
  }
  return null
}

export const DEFAULT_CATALOG: FoodItem[] = [
  { id: 'hamburguesa', name: 'Hamburguesa', emoji: '🍔', pointsPerPortion: 3, isCustom: false },
  { id: 'papas', name: 'Porción de papas', emoji: '🍟', pointsPerPortion: 1, isCustom: false },
  { id: 'pizza', name: 'Rebanada de pizza', emoji: '🍕', pointsPerPortion: 2, isCustom: false },
  { id: 'hot-dog', name: 'Perro caliente', emoji: '🌭', pointsPerPortion: 2, isCustom: false },
  { id: 'taco', name: 'Taco', emoji: '🌮', pointsPerPortion: 1, isCustom: false },
  { id: 'burrito', name: 'Burrito', emoji: '🌯', pointsPerPortion: 3, isCustom: false },
  { id: 'alitas', name: 'Alitas (6)', emoji: '🍗', pointsPerPortion: 2, isCustom: false },
  { id: 'empanada', name: 'Empanada', emoji: '🥟', pointsPerPortion: 1, isCustom: false },
  { id: 'arepa', name: 'Arepa', emoji: '🫓', pointsPerPortion: 2, isCustom: false },
  { id: 'sushi', name: 'Rollo de sushi', emoji: '🍣', pointsPerPortion: 2, isCustom: false },
  { id: 'ensalada', name: 'Ensalada', emoji: '🥗', pointsPerPortion: 1, isCustom: false },
  { id: 'helado', name: 'Bola de helado', emoji: '🍦', pointsPerPortion: 1, isCustom: false },
  { id: 'dona', name: 'Dona', emoji: '🍩', pointsPerPortion: 1, isCustom: false },
  { id: 'refresco', name: 'Refresco', emoji: '🥤', pointsPerPortion: 1, isCustom: false },
]
