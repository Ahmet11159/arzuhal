/**
 * Türkiye saati yardımcıları.
 *
 * Sunucu hangi saat diliminde çalışırsa çalışsın (bulut sunucular genellikle UTC'dir) iş kuralları
 * Türkiye saatine göre işler: dalga "Perşembe 18:00"de kapanır, ay sınırları İstanbul'a göredir.
 * Bu yüzden tarih bileşenleri hiçbir yerde `getHours()`/`new Date(y, m, d)` gibi yerel saatle alınmaz.
 */
export const TIME_ZONE = 'Europe/Istanbul';

export interface TrParts {
  year: number;
  /** 1–12 */
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  /** 0 = Pazar … 6 = Cumartesi */
  weekday: number;
}

const partsFmt = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  weekday: 'short',
});
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Verilen anın İstanbul'daki duvar saati bileşenleri. */
export function trParts(d: Date = new Date()): TrParts {
  const p: Record<string, string> = {};
  for (const x of partsFmt.formatToParts(d)) p[x.type] = x.value;
  return {
    year: Number(p.year),
    month: Number(p.month),
    day: Number(p.day),
    hour: Number(p.hour) % 24,
    minute: Number(p.minute),
    second: Number(p.second),
    weekday: WEEKDAYS.indexOf(p.weekday),
  };
}

/** İstanbul'un UTC'ye göre farkı (ms) — verilen anda. */
function offsetMs(d: Date): number {
  const p = trParts(d);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(d.getTime() / 1000) * 1000;
}

/**
 * İstanbul duvar saatinden gerçek an (Date). Ay taşmaları normalize edilir:
 * trDate(2026, 13, 1) → 1 Ocak 2027 00:00 (İstanbul).
 */
export function trDate(year: number, month: number, day = 1, hour = 0, minute = 0): Date {
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  const first = guess - offsetMs(new Date(guess));
  // Saat dilimi farkı değişen bir günün sınırındaysak bir kez daha düzelt (Türkiye 2016'dan beri sabit +03).
  return new Date(guess - offsetMs(new Date(first)));
}

/** "2026-11" biçiminde İstanbul ayı. */
export function trMonthKey(d: Date): string {
  const p = trParts(d);
  return `${p.year}-${String(p.month).padStart(2, '0')}`;
}

/** İçinde bulunulan aydan `offset` ay önceki/sonraki ayın ilk anı (İstanbul). */
export function trMonthStart(d: Date = new Date(), offset = 0): Date {
  const p = trParts(d);
  return trDate(p.year, p.month + offset, 1);
}

export const trYear = (d: Date = new Date()) => trParts(d).year;

/** datetime-local girişi için "YYYY-AA-GGTSS:DD" (İstanbul saati). */
export function trInputValue(d: Date): string {
  const p = trParts(d);
  const z = (n: number) => String(n).padStart(2, '0');
  return `${p.year}-${z(p.month)}-${z(p.day)}T${z(p.hour)}:${z(p.minute)}`;
}

/** datetime-local değerini ("YYYY-AA-GGTSS:DD") İstanbul saati olarak yorumlar. */
export function fromTrInputValue(v: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(v);
  if (!m) return null;
  return trDate(Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4]), Number(m[5]));
}

/**
 * Bir sonraki belirtilen hafta günü ve saat (İstanbul). Bugün o gün ve saat henüz geçmediyse bugün.
 * Örn. nextTrWeekday(4, 18) → önümüzdeki Perşembe 18:00.
 */
export function nextTrWeekday(weekday: number, hour: number, from: Date = new Date()): Date {
  const p = trParts(from);
  let add = (weekday - p.weekday + 7) % 7;
  let d = trDate(p.year, p.month, p.day + add, hour);
  if (d <= from) {
    add += 7;
    d = trDate(p.year, p.month, p.day + add, hour);
  }
  return d;
}

/** Türkiye saatiyle biçimlendirici (tarayıcı ve sunucuda aynı sonucu verir). */
export function trFormat(opts: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat('tr-TR', { timeZone: TIME_ZONE, ...opts });
}
