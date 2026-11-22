import 'server-only';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { loginInput, type SessionUser } from '@havuz/core';
import type { DB } from '../db/client';
import * as s from '../db/schema';
import { AppError, notFound } from '../http';
import { signSession } from '../auth/session';

export async function login(db: DB, raw: unknown) {
  const input = loginInput.parse(raw);
  const user = await db.query.users.findFirst({ where: eq(s.users.email, input.email), with: { org: true } });
  // Kullanıcı yoksa da hash karşılaştırması yap → zamanlama ile e-posta keşfi zorlaşır.
  const ok = await bcrypt.compare(input.password, user?.passwordHash ?? '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv');
  if (!user || !ok) throw new AppError(401, 'invalid_credentials', 'E-posta veya şifre hatalı');
  const token = await signSession({ sub: user.id, org: user.orgId, role: user.role });
  return { token, user: toSessionUser(user) };
}

export async function me(db: DB, userId: string): Promise<SessionUser> {
  const user = await db.query.users.findFirst({ where: eq(s.users.id, userId), with: { org: true } });
  if (!user) throw notFound('Kullanıcı');
  return toSessionUser(user);
}

function toSessionUser(u: typeof s.users.$inferSelect & { org: typeof s.organizations.$inferSelect }): SessionUser {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    org: { id: u.org.id, name: u.org.name, plan: u.org.plan, city: u.org.city, district: u.org.district },
  };
}
