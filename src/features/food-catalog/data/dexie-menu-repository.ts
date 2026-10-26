import type { HungryBuddiesDb, MenuRow } from '../../../shared/database/db'
import type { Menu, MenuRepository } from '../domain/menu'

const toMenu = (r: MenuRow): Menu => ({ id: r.id, name: r.name, emoji: r.emoji, foodIds: r.food_ids })

export class DexieMenuRepository implements MenuRepository {
  constructor(private readonly db: HungryBuddiesDb) {}

  async list(): Promise<Menu[]> {
    return (await this.db.menus.orderBy('position').toArray()).map(toMenu)
  }

  async findById(id: string): Promise<Menu | undefined> {
    const row = await this.db.menus.get(id)
    return row && toMenu(row)
  }

  async save(menu: Menu): Promise<void> {
    const { db } = this
    await db.transaction('rw', db.menus, async () => {
      const existing = await db.menus.get(menu.id)
      const last = await db.menus.orderBy('position').last()
      await db.menus.put({
        id: menu.id,
        name: menu.name.trim(),
        emoji: menu.emoji,
        food_ids: menu.foodIds,
        position: existing?.position ?? (last ? last.position + 1 : 0),
      })
    })
  }

  async remove(id: string): Promise<void> {
    await this.db.menus.delete(id)
  }
}
