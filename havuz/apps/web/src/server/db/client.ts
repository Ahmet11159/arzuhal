import 'server-only';
import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { count } from 'drizzle-orm';
import type { PgliteDatabase } from 'drizzle-orm/pglite';
import * as schema from './schema';

export type DB = PgliteDatabase<typeof schema>;
export type Tx = Parameters<Parameters<DB['transaction']>[0]>[0];
export type Executor = DB | Tx;

const MIGRATIONS = path.join(process.cwd(), 'drizzle');

/**
 * Veritabanı bağlantısı:
 *  - DATABASE_URL varsa → PostgreSQL (node-postgres havuzu)
 *  - yoksa              → gömülü PGlite (WASM Postgres, ./.data/pglite)
 * Her iki sürücü de aynı Drizzle PG API'sini sunar; servis katmanı farkı bilmez.
 */
async function connect(): Promise<DB> {
  if (process.env.DATABASE_URL) {
    const { Pool } = await import('pg');
    const { drizzle } = await import('drizzle-orm/node-postgres');
    const { migrate } = await import('drizzle-orm/node-postgres/migrator');
    const db = drizzle(new Pool({ connectionString: process.env.DATABASE_URL, max: 10 }), { schema });
    await migrate(db, { migrationsFolder: MIGRATIONS });
    // İki sürücü aynı sorgu oluşturucuyu paylaşır; tip tek bir sürücüye sabitlenir.
    return db as unknown as DB;
  }
  const { PGlite } = await import('@electric-sql/pglite');
  const { drizzle } = await import('drizzle-orm/pglite');
  const { migrate } = await import('drizzle-orm/pglite/migrator');
  const dir = process.env.PGLITE_DIR ?? path.join(process.cwd(), '.data', 'pglite');
  if (dir !== 'memory://') mkdirSync(dir, { recursive: true });
  const db = drizzle(new PGlite(dir), { schema });
  await migrate(db, { migrationsFolder: MIGRATIONS });
  return db;
}

async function init(): Promise<DB> {
  const db = await connect();
  const autoSeed = (process.env.AUTO_SEED ?? (process.env.NODE_ENV === 'production' ? 'false' : 'true')) === 'true';
  if (autoSeed) {
    const [{ n }] = await db.select({ n: count() }).from(schema.users);
    if (n === 0) {
      const { seed } = await import('./seed');
      await seed(db);
    }
  }
  return db;
}

const g = globalThis as unknown as { __havuzDb?: Promise<DB> };

export function getDb(): Promise<DB> {
  if (!g.__havuzDb) {
    g.__havuzDb = init().catch((e) => {
      g.__havuzDb = undefined;
      throw e;
    });
  }
  return g.__havuzDb;
}

export { schema };
