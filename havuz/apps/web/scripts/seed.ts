/**
 * Demo verisini yükler.
 *   npm run db:seed          → boşsa doldurur
 *   npm run db:reset         → tüm tabloları temizleyip yeniden doldurur
 */
import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { count } from 'drizzle-orm';

async function main() {
  const reset = process.argv.includes('--reset');
  let db;
  if (process.env.DATABASE_URL) {
    const { Pool } = await import('pg');
    const { drizzle } = await import('drizzle-orm/node-postgres');
    const { migrate } = await import('drizzle-orm/node-postgres/migrator');
    const schema = await import('../src/server/db/schema');
    db = drizzle(new Pool({ connectionString: process.env.DATABASE_URL }), { schema });
    await migrate(db, { migrationsFolder: path.join(process.cwd(), 'drizzle') });
  } else {
    const { PGlite } = await import('@electric-sql/pglite');
    const { drizzle } = await import('drizzle-orm/pglite');
    const { migrate } = await import('drizzle-orm/pglite/migrator');
    const schema = await import('../src/server/db/schema');
    const dir = process.env.PGLITE_DIR ?? path.join(process.cwd(), '.data', 'pglite');
    mkdirSync(dir, { recursive: true });
    db = drizzle(new PGlite(dir), { schema });
    await migrate(db, { migrationsFolder: path.join(process.cwd(), 'drizzle') });
  }
  const anyDb = db as any;
  const { seed, resetDatabase, DEMO_ACCOUNTS, DEMO_PASSWORD } = await import('../src/server/db/seed');
  const schema = await import('../src/server/db/schema');
  if (reset) await resetDatabase(anyDb);
  const [{ n }] = await anyDb.select({ n: count() }).from(schema.users);
  if (n > 0) {
    console.log('Veritabanı zaten dolu. Sıfırlamak için: npm run db:reset');
    process.exit(0);
  }
  const t = Date.now();
  const r = await seed(anyDb);
  console.log(`✓ Demo verisi yüklendi (${Date.now() - t} ms)`, r);
  console.log('Demo hesapları (şifre: %s):', DEMO_PASSWORD, DEMO_ACCOUNTS);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
