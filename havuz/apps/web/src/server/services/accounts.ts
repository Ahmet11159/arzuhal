import 'server-only';
import bcrypt from 'bcryptjs';
import { createHash, randomBytes, randomInt } from 'node:crypto';
import { and, desc, eq, gt, isNull, sql } from 'drizzle-orm';
import {
  BUSINESS_TYPE_LABEL,
  changePasswordInput,
  createOrgInput,
  forgotPasswordInput,
  inviteUserInput,
  profileInput,
  resetPasswordInput,
  updateOrgInput,
  updateUserInput,
  type CreatedAccountDTO,
  type SettingsDTO,
  type TeamUserDTO,
} from '@havuz/core';
import type { DB, Executor } from '../db/client';
import * as s from '../db/schema';
import { AppError, badRequest, forbidden, notFound } from '../http';
import type { SessionPayload } from '../auth/secret';
import { signSession } from '../auth/session';
import { audit, type Actor } from '../audit';
import { APP_URL, notifyOperators, sendSensitiveEmail } from '../notify';

const ROLE_FOR_ORG = { member: 'member', supplier: 'supplier', operator: 'admin' } as const;
const RESET_TTL_MS = 60 * 60_000;

/** Okunması kolay geçici şifre (karışan karakterler yok), en az bir harf ve bir rakam. */
export function temporaryPassword(): string {
  const letters = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ';
  const digits = '23456789';
  const all = letters + digits;
  const chars = [letters[randomInt(letters.length)], digits[randomInt(digits.length)]];
  while (chars.length < 12) chars.push(all[randomInt(all.length)]);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');

async function assertEmailFree(tx: Executor, email: string) {
  const [u] = await tx.select({ id: s.users.id }).from(s.users).where(eq(s.users.email, email));
  if (u) throw new AppError(409, 'email_taken', 'Bu e-posta adresiyle kayıtlı bir kullanıcı zaten var');
}

function welcomeEmail(name: string, orgName: string, email: string, password: string) {
  return `Merhaba ${name},\n\n${orgName} için Havuz hesabınız açıldı.\n\nGiriş: ${APP_URL()}/giris\nE-posta: ${email}\nGeçici şifre: ${password}\n\nİlk girişte kendi şifrenizi belirlemeniz istenecek.\n\nHavuz`;
}

function toTeamUser(u: typeof s.users.$inferSelect): TeamUserDTO {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    isOwner: u.isOwner,
    active: u.active,
    mustChangePassword: u.mustChangePassword,
    lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
    createdAt: u.createdAt.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Yönetim: kuruluş açma ve düzenleme
// ---------------------------------------------------------------------------

export async function createOrganization(db: DB, raw: unknown, actor: Actor): Promise<CreatedAccountDTO> {
  const input = createOrgInput.parse(raw);
  const password = temporaryPassword();
  const passwordHash = await bcrypt.hash(password, 10);
  return db.transaction(async (tx) => {
    await assertEmailFree(tx, input.owner.email);
    if (input.leadId) {
      const [lead] = await tx.select().from(s.leads).where(eq(s.leads.id, input.leadId)).for('update');
      if (!lead) throw notFound('Başvuru');
      if (lead.status !== 'new') throw badRequest('Bu başvuru zaten sonuçlandırılmış');
    }
    const [org] = await tx
      .insert(s.organizations)
      .values({
        type: input.type,
        name: input.name,
        businessType: input.type === 'member' ? input.businessType : null,
        city: input.city,
        district: input.district ?? null,
        taxNo: input.taxNo ?? null,
        email: input.email ?? input.owner.email,
        phone: input.phone ?? input.owner.phone ?? null,
        plan: input.type === 'member' ? input.plan : 'free',
        creditLimit: input.type === 'member' ? input.creditLimit : 0,
        commissionBps: input.type === 'supplier' ? input.commissionBps : 300,
        iban: input.type === 'supplier' ? input.iban || null : null,
        rating: 5,
        onTimeRate: 1,
      })
      .returning();
    const [user] = await tx
      .insert(s.users)
      .values({
        orgId: org.id,
        name: input.owner.name,
        email: input.owner.email,
        phone: input.owner.phone ?? null,
        passwordHash,
        role: ROLE_FOR_ORG[input.type],
        isOwner: true,
        mustChangePassword: true,
      })
      .returning();
    if (input.leadId) await tx.update(s.leads).set({ status: 'approved', orgId: org.id }).where(eq(s.leads.id, input.leadId));
    await sendSensitiveEmail(tx, user.email, 'Havuz hesabınız açıldı', welcomeEmail(user.name, org.name, user.email, password));
    const kind = input.type === 'member' ? `${input.businessType ? BUSINESS_TYPE_LABEL[input.businessType] : 'İşletme'}` : 'Tedarikçi';
    await audit(tx, actor, 'org.create', 'organization', org.id, `${kind} hesabı açıldı: ${org.name} (${user.email})`, { leadId: input.leadId ?? null });
    return { orgId: org.id, userId: user.id, email: user.email, temporaryPassword: password };
  });
}

export async function updateOrganization(db: DB, id: string, raw: unknown, actor: Actor) {
  const input = updateOrgInput.parse(raw);
  await db.transaction(async (tx) => {
    const [org] = await tx.select().from(s.organizations).where(eq(s.organizations.id, id)).for('no key update');
    if (!org || org.type === 'operator') throw notFound('Kuruluş');
    const patch: Partial<typeof s.organizations.$inferInsert> = { ...input, iban: input.iban === undefined ? undefined : input.iban || null };
    await tx.update(s.organizations).set(patch).where(eq(s.organizations.id, id));
    const changes = Object.keys(input).join(', ');
    await audit(tx, actor, input.active === false ? 'org.deactivate' : 'org.update', 'organization', id, `${org.name} güncellendi: ${changes}`, {
      ...('creditLimit' in input ? { creditLimit: input.creditLimit } : {}),
      ...('commissionBps' in input ? { commissionBps: input.commissionBps } : {}),
      ...('plan' in input ? { plan: input.plan } : {}),
      ...('active' in input ? { active: input.active } : {}),
    });
  });
}

export async function rejectLead(db: DB, id: string, actor: Actor) {
  await db.transaction(async (tx) => {
    const [lead] = await tx.update(s.leads).set({ status: 'rejected' }).where(and(eq(s.leads.id, id), eq(s.leads.status, 'new'))).returning();
    if (!lead) throw badRequest('Başvuru bulunamadı veya zaten sonuçlandırılmış');
    await audit(tx, actor, 'lead.reject', 'lead', id, `${lead.businessName} başvurusu reddedildi`);
  });
}

// ---------------------------------------------------------------------------
// Ayarlar ve ekip
// ---------------------------------------------------------------------------

export async function getSettings(db: DB, session: SessionPayload): Promise<SettingsDTO> {
  const user = await db.query.users.findFirst({ where: eq(s.users.id, session.sub) });
  const org = await db.query.organizations.findFirst({ where: eq(s.organizations.id, session.org) });
  if (!user || !org) throw notFound('Hesap');
  const team = await db.select().from(s.users).where(eq(s.users.orgId, org.id)).orderBy(desc(s.users.isOwner), s.users.createdAt);
  return {
    user: toTeamUser(user),
    org: { id: org.id, name: org.name, type: org.type, email: org.email, phone: org.phone, iban: org.iban },
    team: team.map(toTeamUser),
  };
}

async function assertOwner(db: Executor, session: SessionPayload) {
  const [u] = await db.select({ isOwner: s.users.isOwner }).from(s.users).where(eq(s.users.id, session.sub));
  if (!u?.isOwner) throw new AppError(403, 'owner_only', 'Bu işlemi yalnızca hesap sahibi yapabilir');
}

export async function updateProfile(db: DB, session: SessionPayload, raw: unknown, actor: Actor) {
  const input = profileInput.parse(raw);
  await db.transaction(async (tx) => {
    if (input.name !== undefined || input.phone !== undefined) {
      await tx.update(s.users).set({ name: input.name, phone: input.phone }).where(eq(s.users.id, session.sub));
    }
    const orgPatch: Partial<typeof s.organizations.$inferInsert> = {};
    if (input.orgEmail !== undefined) orgPatch.email = input.orgEmail;
    if (input.orgPhone !== undefined) orgPatch.phone = input.orgPhone;
    if (input.iban !== undefined) {
      if (session.role !== 'supplier') throw badRequest('IBAN yalnızca tedarikçi hesaplarında tutulur');
      orgPatch.iban = input.iban || null;
    }
    if (Object.keys(orgPatch).length) {
      await assertOwner(tx, session);
      await tx.update(s.organizations).set(orgPatch).where(eq(s.organizations.id, session.org));
    }
    await audit(tx, actor, 'profile.update', 'user', session.sub, `Profil güncellendi: ${Object.keys(input).join(', ')}`);
  });
  // IBAN veya iletişim bilgisi değiştiyse iyzico alt satıcı kaydı da güncellenir.
  if (session.role === 'supplier' && (input.iban !== undefined || input.orgEmail !== undefined || input.orgPhone !== undefined)) {
    const { syncSubMerchant } = await import('./payout-profile');
    await syncSubMerchant(db, session.org, actor);
  }
}

export async function inviteUser(db: DB, session: SessionPayload, raw: unknown, actor: Actor): Promise<CreatedAccountDTO> {
  const input = inviteUserInput.parse(raw);
  const password = temporaryPassword();
  const passwordHash = await bcrypt.hash(password, 10);
  return db.transaction(async (tx) => {
    await assertOwner(tx, session);
    await assertEmailFree(tx, input.email);
    const [org] = await tx.select().from(s.organizations).where(eq(s.organizations.id, session.org));
    const [user] = await tx
      .insert(s.users)
      .values({ orgId: org.id, name: input.name, email: input.email, phone: input.phone ?? null, passwordHash, role: session.role, mustChangePassword: true })
      .returning();
    await sendSensitiveEmail(tx, user.email, 'Havuz ekibine eklendiniz', welcomeEmail(user.name, org.name, user.email, password));
    await audit(tx, actor, 'user.create', 'user', user.id, `${org.name} ekibine ${user.email} eklendi`);
    return { orgId: org.id, userId: user.id, email: user.email, temporaryPassword: password };
  });
}

export async function setUserActive(db: DB, session: SessionPayload, userId: string, raw: unknown, actor: Actor) {
  const { active } = updateUserInput.parse(raw);
  await db.transaction(async (tx) => {
    await assertOwner(tx, session);
    if (userId === session.sub) throw badRequest('Kendi hesabınızı pasifleştiremezsiniz');
    const [u] = await tx
      .update(s.users)
      // Pasifleştirilen kullanıcının tüm açık oturumları anında düşer.
      .set({ active, tokenVersion: sql`${s.users.tokenVersion} + 1` })
      .where(and(eq(s.users.id, userId), eq(s.users.orgId, session.org)))
      .returning();
    if (!u) throw notFound('Kullanıcı');
    await audit(tx, actor, active ? 'user.activate' : 'user.deactivate', 'user', u.id, `${u.email} ${active ? 'aktifleştirildi' : 'pasifleştirildi'}`);
  });
}

// ---------------------------------------------------------------------------
// Şifre
// ---------------------------------------------------------------------------

/** Şifre değişir, diğer tüm oturumlar düşer, bu cihaz için yeni token döner. */
export async function changePassword(db: DB, session: SessionPayload, raw: unknown, actor: Actor) {
  const input = changePasswordInput.parse(raw);
  const user = await db.query.users.findFirst({ where: eq(s.users.id, session.sub) });
  if (!user) throw notFound('Kullanıcı');
  if (!(await bcrypt.compare(input.currentPassword, user.passwordHash))) throw new AppError(400, 'wrong_password', 'Mevcut şifre hatalı');
  if (await bcrypt.compare(input.newPassword, user.passwordHash)) throw badRequest('Yeni şifre mevcut şifreyle aynı olamaz');
  const hash = await bcrypt.hash(input.newPassword, 10);
  const [u] = await db.transaction(async (tx) => {
    const r = await tx
      .update(s.users)
      .set({ passwordHash: hash, mustChangePassword: false, tokenVersion: sql`${s.users.tokenVersion} + 1` })
      .where(eq(s.users.id, user.id))
      .returning();
    await audit(tx, { ...actor, userId: user.id, orgId: user.orgId, name: user.name }, 'auth.password_change', 'user', user.id, `${user.email} şifresini değiştirdi`);
    return r;
  });
  return signSession({ sub: u.id, org: u.orgId, role: u.role, tv: u.tokenVersion, mcp: false });
}

/** Her durumda aynı yanıt döner (kayıtlı e-posta keşfedilemez). */
export async function requestPasswordReset(db: DB, raw: unknown, actor: Actor) {
  const { email } = forgotPasswordInput.parse(raw);
  const user = await db.query.users.findFirst({ where: eq(s.users.email, email), with: { org: true } });
  if (!user || !user.active || !user.org.active) return;
  const token = randomBytes(32).toString('base64url');
  await db.transaction(async (tx) => {
    // Önceki kullanılmamış bağlantılar geçersiz olur.
    await tx.update(s.passwordResets).set({ usedAt: new Date() }).where(and(eq(s.passwordResets.userId, user.id), isNull(s.passwordResets.usedAt)));
    await tx.insert(s.passwordResets).values({ userId: user.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + RESET_TTL_MS) });
    await sendSensitiveEmail(
      tx,
      user.email,
      'Havuz şifre sıfırlama',
      `Merhaba ${user.name},\n\nŞifrenizi sıfırlamak için bağlantı (1 saat geçerli):\n${APP_URL()}/sifre-sifirla?token=${token}\n\nBu isteği siz yapmadıysanız bu e-postayı yok sayın.\n\nHavuz`,
    );
    await audit(tx, { ...actor, userId: user.id, orgId: user.orgId }, 'auth.reset_request', 'user', user.id, `${user.email} için şifre sıfırlama bağlantısı gönderildi`);
  });
}

export async function resetPassword(db: DB, raw: unknown, actor: Actor) {
  const input = resetPasswordInput.parse(raw);
  const hash = await bcrypt.hash(input.newPassword, 10);
  await db.transaction(async (tx) => {
    const [r] = await tx
      .update(s.passwordResets)
      .set({ usedAt: new Date() })
      .where(and(eq(s.passwordResets.tokenHash, sha256(input.token)), isNull(s.passwordResets.usedAt), gt(s.passwordResets.expiresAt, new Date())))
      .returning();
    if (!r) throw new AppError(400, 'invalid_token', 'Bağlantı geçersiz veya süresi dolmuş. Yeni bir sıfırlama isteyin.');
    const [u] = await tx
      .update(s.users)
      .set({ passwordHash: hash, mustChangePassword: false, tokenVersion: sql`${s.users.tokenVersion} + 1` })
      .where(eq(s.users.id, r.userId))
      .returning();
    await audit(tx, { ...actor, userId: u.id, orgId: u.orgId, name: u.name }, 'auth.reset', 'user', u.id, `${u.email} şifresini sıfırladı`);
  });
}

export async function notifyNewLead(tx: Executor, lead: { id: string; businessName: string; kind: string; city: string }) {
  await notifyOperators(tx, {
    type: 'lead.new',
    title: `Yeni başvuru: ${lead.businessName}`,
    body: `${lead.kind === 'member' ? 'İşletme' : 'Tedarikçi'} · ${lead.city}`,
    link: '/yonetim/basvurular',
    dedupeKey: `lead.new:${lead.id}`,
    email: true,
  });
}

export { forbidden };
