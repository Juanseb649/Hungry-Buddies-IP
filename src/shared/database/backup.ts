import type { HungryBuddiesDb } from './db'

const APP_ID = 'hungry-buddies'
const TABLES = ['players', 'foods', 'matches', 'match_players', 'food_selections'] as const

export interface BackupFile {
  app: typeof APP_ID
  schemaVersion: number
  exportedAt: string
  tables: Record<(typeof TABLES)[number], unknown[]>
}

export async function exportBackup(db: HungryBuddiesDb, now: string): Promise<BackupFile> {
  return db.transaction('r', TABLES.map((t) => db.table(t)), async () => {
    const entries = await Promise.all(TABLES.map(async (t) => [t, await db.table(t).toArray()] as const))
    return {
      app: APP_ID,
      schemaVersion: db.verno,
      exportedAt: now,
      tables: Object.fromEntries(entries) as BackupFile['tables'],
    }
  })
}

export function parseBackup(text: string): BackupFile {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('El archivo no es un respaldo válido: no se pudo leer como JSON.')
  }
  const file = data as Partial<BackupFile>
  if (file?.app !== APP_ID || typeof file.tables !== 'object' || file.tables === null) {
    throw new Error('Ese archivo no es un respaldo de Hungry Buddies.')
  }
  for (const t of TABLES) {
    if (!Array.isArray(file.tables[t])) {
      throw new Error(`Al respaldo le falta la tabla "${t}".`)
    }
  }
  return file as BackupFile
}

/** Reemplaza todos los datos locales por los del respaldo. */
export async function importBackup(db: HungryBuddiesDb, file: BackupFile): Promise<void> {
  if (file.schemaVersion > db.verno) {
    throw new Error('Este respaldo viene de una versión más nueva de la app. Actualiza la app e inténtalo otra vez.')
  }
  await db.transaction('rw', TABLES.map((t) => db.table(t)), async () => {
    for (const t of TABLES) {
      await db.table(t).clear()
      await db.table(t).bulkAdd(file.tables[t])
    }
  })
}
