/** Edge (middleware) ve Node tarafında ortak kullanılan oturum ayarları. Node API'si içermez. */
export const SESSION_COOKIE = 'havuz_session';
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

const DEV_SECRET = 'havuz-dev-secret-yalnizca-yerel-gelistirme-icin';

export function sessionSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    if (process.env.NODE_ENV === 'production' && process.env.HAVUZ_ALLOW_DEV_SECRET !== 'true') {
      throw new Error('SESSION_SECRET en az 32 karakter olmalı');
    }
    return new TextEncoder().encode(DEV_SECRET);
  }
  return new TextEncoder().encode(secret);
}

export type Role = 'member' | 'supplier' | 'admin';

export interface SessionPayload {
  sub: string;
  org: string;
  role: Role;
  /** Token sürümü: şifre değişince artar, eski token'lar geçersizleşir. */
  tv: number;
  /** Geçici şifre: kullanıcı şifresini değiştirene kadar yalnızca şifre değiştirme yapılabilir. */
  mcp: boolean;
}

export const CHANGE_PASSWORD_PATH = '/sifre-degistir';

/** Rol → uygulama alanı. */
export const ROLE_HOME: Record<Role, string> = {
  member: '/uye',
  supplier: '/tedarikci',
  admin: '/yonetim',
};
