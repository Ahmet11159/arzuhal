/**
 * Boş bir kurulumda ilk yönetim hesabını oluşturur.
 *   DATABASE_URL=... npx tsx scripts/create-admin.ts "Ad Soyad" eposta@alanadi.com
 * Geçici şifre ekrana yazılır; ilk girişte değiştirilmesi zorunludur.
 */
import path from 'node:path';
import bcrypt from 'bcryptjs';
import { randomInt } from 'node:crypto';
import { eq } from 'drizzle-orm';

async function main() {
  const [name, email] = process.argv.slice(2);
  if (!name || !email || !/^\S+@\S+\.\S+$/.test(email)) {
    console.error('Kullanım: npx tsx scripts/create-admin.ts "Ad Soyad" eposta@alanadi.com');
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL tanımlı olmalı');
    process.exit(1);
  }
  const { Pool } = await import('pg');
  const { drizzle } = await import('drizzle-orm/node-postgres');
  const { migrate } = await import('drizzle-orm/node-postgres/migrator');
  const s = await import('../src/server/db/schema');
  const db = drizzle(new Pool({ connectionString: process.env.DATABASE_URL }), { schema: s });
  await migrate(db, { migrationsFolder: path.join(process.cwd(), 'drizzle') });

  const [exists] = await db.select({ id: s.users.id }).from(s.users).where(eq(s.users.email, email.toLowerCase()));
  if (exists) {
    console.error('Bu e-postayla bir kullanıcı zaten var');
    process.exit(1);
  }
  let [op] = await db.select().from(s.organizations).where(eq(s.organizations.type, 'operator'));
  if (!op) [op] = await db.insert(s.organizations).values({ type: 'operator', name: 'Havuz Operasyon', city: 'İstanbul' }).returning();
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let password = '';
  while (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) password = Array.from({ length: 14 }, () => chars[randomInt(chars.length)]).join('');
  await db.insert(s.users).values({
    orgId: op.id,
    name,
    email: email.toLowerCase(),
    passwordHash: await bcrypt.hash(password, 10),
    role: 'admin',
    isOwner: true,
    mustChangePassword: true,
  });
  console.log(`✓ Yönetici oluşturuldu: ${email}\n  Geçici şifre: ${password}\n  İlk girişte yeni şifre belirlemeniz istenecek.`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
