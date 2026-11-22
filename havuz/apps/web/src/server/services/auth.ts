import 'server-only';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { loginInput, type SessionUser } from '@havuz/core';
import type { DB } from '../db/client';
import * as s from '../db/schema';
import { AppError, notFound } from '../http';
import { signSession } from '../auth/session';
import { audit, type Actor } from '../audit';

const DUMMY_HASH = '$2a$10$CwTycUXWue0Thq9StjUM0uJ8.rnFJ3aXUPqDrnJNLD6JFK/6E5aPm';

export async function login(db: DB, raw: unknown, actor: Actor = {}) {
  const input = loginInput.parse(raw);
  const user = await db.query.users.findFirst({ where: eq(s.users.email, input.email), with: { org: true } });
  // Kullanıcı yoksa da hash karşılaştırması yap → zamanlama ile e-posta keşfi zorlaşır.
  const ok = await bcrypt.compare(input.password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) throw new AppError(401, 'invalid_credentials', 'E-posta veya şifre hatalı');
  if (!user.active || !user.org.active) throw new AppError(403, 'account_disabled', 'Hesabınız pasif durumda. Havuz destek ekibiyle iletişime geçin.');
  await db.transaction(async (tx) => {
    await tx.update(s.users).set({ lastLoginAt: new Date() }).where(eq(s.users.id, user.id));
    await audit(tx, { ...actor, userId: user.id, orgId: user.orgId, name: user.name }, 'auth.login', 'user', user.id, `${user.email} giriş yaptı`);
  });
  const token = await signSession({ sub: user.id, org: user.orgId, role: user.role, tv: user.tokenVersion, mcp: user.mustChangePassword });
  return { token, user: toSessionUser(user) };
}

export async function me(db: DB, userId: string): Promise<SessionUser> {
  const user = await db.query.users.findFirst({ where: eq(s.users.id, userId), with: { org: true } });
  if (!user) throw notFound('Kullanıcı');
  return toSessionUser(user);
}

export function toSessionUser(u: typeof s.users.$inferSelect & { org: typeof s.organizations.$inferSelect }): SessionUser {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    isOwner: u.isOwner,
    mustChangePassword: u.mustChangePassword,
    org: { id: u.org.id, name: u.org.name, plan: u.org.plan, city: u.org.city, district: u.org.district },
  };
}
