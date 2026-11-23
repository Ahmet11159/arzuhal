import { trFormat } from '@havuz/core';

// Sunucuda (UTC) ve tarayıcıda aynı sonucu vermesi için saat dilimi sabittir.
const dateFmt = trFormat({ day: 'numeric', month: 'short' });
const dateTimeFmt = trFormat({ day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const longDate = trFormat({ weekday: 'long', day: 'numeric', month: 'long' });
const rtf = new Intl.RelativeTimeFormat('tr-TR', { numeric: 'auto' });

export const fmtDate = (d: string | Date) => dateFmt.format(new Date(d));
export const fmtDateTime = (d: string | Date) => dateTimeFmt.format(new Date(d));
export const fmtLongDate = (d: string | Date) => longDate.format(new Date(d));

export function fmtRelative(d: string | Date) {
  const diff = new Date(d).getTime() - Date.now();
  const abs = Math.abs(diff);
  if (abs < 3600_000) return rtf.format(Math.round(diff / 60_000), 'minute');
  if (abs < 86_400_000) return rtf.format(Math.round(diff / 3600_000), 'hour');
  return rtf.format(Math.round(diff / 86_400_000), 'day');
}
