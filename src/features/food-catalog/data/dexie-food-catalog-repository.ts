import type { HungryBuddiesDb } from '../../../shared/database/db'
import type { FoodCatalogRepository, FoodItem } from '../domain/food-item'

export class DexieFoodCatalogRepository implements FoodCatalogRepository {
  constructor(private readonly db: HungryBuddiesDb) {}

  async list(): Promise<FoodItem[]> {
    const rows = await this.db.foods.orderBy('position').toArray()
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      emoji: r.emoji,
      pointsPerPortion: r.points_per_portion,
      isCustom: r.is_custom === 1,
    }))
  }

  async save(item: FoodItem): Promise<void> {
    const { db } = this
    await db.transaction('rw', db.foods, async () => {
      const existing = await db.foods.get(item.id)
      const last = await db.foods.orderBy('position').last()
      await db.foods.put({
        id: item.id,
        name: item.name.trim(),
        emoji: item.emoji,
        points_per_portion: item.pointsPerPortion,
        is_custom: item.isCustom ? 1 : 0,
        position: existing?.position ?? (last ? last.position + 1 : 0),
      })
    })
  }

  async remove(id: string): Promise<void> {
    await this.db.foods.delete(id)
  }
}
