import { describe, expect, it } from 'vitest';
import { fromTrInputValue, nextTrWeekday, trDate, trInputValue, trMonthKey, trMonthStart, trParts } from '../src/domain/time';

describe('Türkiye saati', () => {
  it('UTC anını İstanbul duvar saatine çevirir (+03)', () => {
    const p = trParts(new Date('2026-11-23T21:30:00Z'));
    expect(p).toMatchObject({ year: 2026, month: 11, day: 24, hour: 0, minute: 30, weekday: 2 });
  });

  it('İstanbul duvar saatinden doğru UTC anı üretir', () => {
    expect(trDate(2026, 11, 26, 18).toISOString()).toBe('2026-11-26T15:00:00.000Z');
    expect(trDate(2026, 13, 1).toISOString()).toBe('2026-12-31T21:00:00.000Z');
  });

  it('ay anahtarı ve ay başlangıcı İstanbul’a göredir', () => {
    // UTC'de 31 Ekim 22:00 = İstanbul'da 1 Kasım 01:00
    const d = new Date('2026-10-31T22:00:00Z');
    expect(trMonthKey(d)).toBe('2026-11');
    expect(trMonthStart(d).toISOString()).toBe('2026-10-31T21:00:00.000Z');
    expect(trMonthStart(d, -1).toISOString()).toBe('2026-09-30T21:00:00.000Z');
  });

  it('bir sonraki Perşembe 18:00', () => {
    const from = new Date('2026-11-23T09:00:00Z'); // Pazartesi
    expect(nextTrWeekday(4, 18, from).toISOString()).toBe('2026-11-26T15:00:00.000Z');
    const thuLate = new Date('2026-11-26T16:00:00Z'); // Perşembe 19:00 → bir sonraki hafta
    expect(nextTrWeekday(4, 18, thuLate).toISOString()).toBe('2026-12-03T15:00:00.000Z');
  });

  it('datetime-local değerleri İstanbul saatiyle gidip gelir', () => {
    const d = fromTrInputValue('2026-11-26T18:00')!;
    expect(d.toISOString()).toBe('2026-11-26T15:00:00.000Z');
    expect(trInputValue(d)).toBe('2026-11-26T18:00');
    expect(fromTrInputValue('bozuk')).toBeNull();
  });
});
