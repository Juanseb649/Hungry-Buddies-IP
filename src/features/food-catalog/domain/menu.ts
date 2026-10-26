import type { FoodItem } from './food-item'

/** Un menú guardado en ajustes: un grupo de comidas con nombre, por ejemplo "Noche de pizza". */
export interface Menu {
  id: string
  name: string
  emoji: string
  foodIds: string[]
}

export interface MenuRepository {
  list(): Promise<Menu[]>
  findById(id: string): Promise<Menu | undefined>
  save(menu: Menu): Promise<void>
  remove(id: string): Promise<void>
}

export function validateMenu(menu: Pick<Menu, 'name' | 'foodIds'>): string | null {
  if (menu.name.trim().length === 0) return 'Ponle un nombre al menú.'
  if (menu.name.trim().length > 32) return 'El nombre del menú debe tener 32 caracteres o menos.'
  if (menu.foodIds.length === 0) return 'Elige al menos una comida para el menú.'
  return null
}

/** Las comidas del menú que siguen en el catálogo, en el orden del menú. */
export function menuFoods(menu: Menu, catalog: FoodItem[]): FoodItem[] {
  const byId = new Map(catalog.map((f) => [f.id, f]))
  return menu.foodIds.flatMap((id) => byId.get(id) ?? [])
}

export const DEFAULT_MENUS: Menu[] = [
  {
    id: 'comida-rapida',
    name: 'Comida rápida',
    emoji: '🍔',
    foodIds: ['hamburguesa', 'papas', 'hot-dog', 'pizza', 'refresco'],
  },
  { id: 'noche-mexicana', name: 'Noche mexicana', emoji: '🌮', foodIds: ['taco', 'burrito', 'refresco'] },
  { id: 'antojitos', name: 'Antojitos', emoji: '🥟', foodIds: ['empanada', 'arepa', 'alitas', 'refresco'] },
  { id: 'postres', name: 'Postres', emoji: '🍩', foodIds: ['helado', 'dona'] },
]
