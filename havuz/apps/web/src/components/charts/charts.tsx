'use client';

import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipProps } from 'recharts';
import { formatTRY, formatTRYCompact } from '@havuz/core';
import { useChartColors } from './use-chart-colors';
import { Skeleton } from '../ui/skeleton';

interface Series {
  key: string;
  label: string;
  /** Kategorik slot (1–7) veya 'brand' — sabit sırayla atanır. */
  slot: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 'brand';
}

function ChartTooltip({ active, payload, label, series }: TooltipProps<number, string> & { series: Series[] }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="min-w-[160px] rounded-xl border border-border bg-surface/95 px-3 py-2.5 text-xs shadow-lift backdrop-blur">
      <div className="mb-1.5 font-semibold text-fg">{label}</div>
      {payload.map((p) => {
        const s = series.find((x) => x.key === p.dataKey);
        return (
          <div key={String(p.dataKey)} className="flex items-center justify-between gap-4 py-0.5">
            <span className="inline-flex items-center gap-1.5 text-fg-muted">
              <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
              {s?.label}
            </span>
            <span className="font-medium tabular text-fg">{formatTRY(Number(p.value))}</span>
          </div>
        );
      })}
    </div>
  );
}

function Legend({ series, colors }: { series: Series[]; colors: Record<string, string> }) {
  if (series.length < 2) return null;
  return (
    <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg-muted">
      {series.map((s) => (
        <span key={s.key} className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: colors[`chart-${s.slot}`] }} />
          {s.label}
        </span>
      ))}
    </div>
  );
}

export function TrendChart({ data, xKey, series, height = 240 }: { data: Record<string, string | number>[]; xKey: string; series: Series[]; height?: number }) {
  const c = useChartColors();
  if (!c) return <Skeleton style={{ height }} className="w-full" />;
  return (
    <div>
      <Legend series={series} colors={c} />
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
            <defs>
              {series.map((s) => (
                <linearGradient key={s.key} id={`fill-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={c[`chart-${s.slot}`]} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={c[`chart-${s.slot}`]} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid vertical={false} stroke={c['chart-grid']} />
            <XAxis dataKey={xKey} tickLine={false} axisLine={false} tick={{ fill: c.fgMuted, fontSize: 12 }} dy={6} />
            <YAxis tickLine={false} axisLine={false} width={64} tick={{ fill: c.fgMuted, fontSize: 11 }} tickFormatter={(v) => formatTRYCompact(v)} />
            <Tooltip content={<ChartTooltip series={series} />} cursor={{ stroke: c.fgMuted, strokeDasharray: '3 3' }} />
            {series.map((s, i) => (
              <Area
                key={s.key}
                type="monotone"
                dataKey={s.key}
                stroke={c[`chart-${s.slot}`]}
                strokeWidth={2}
                fill={`url(#fill-${s.key})`}
                activeDot={{ r: 5, strokeWidth: 2, stroke: c.surface }}
                animationDuration={900 + i * 200}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function ColumnChart({ data, xKey, series, height = 240 }: { data: Record<string, string | number>[]; xKey: string; series: Series[]; height?: number }) {
  const c = useChartColors();
  if (!c) return <Skeleton style={{ height }} className="w-full" />;
  return (
    <div>
      <Legend series={series} colors={c} />
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 6, right: 6, left: 0, bottom: 0 }} barGap={2} barCategoryGap="28%">
            <CartesianGrid vertical={false} stroke={c['chart-grid']} />
            <XAxis dataKey={xKey} tickLine={false} axisLine={false} tick={{ fill: c.fgMuted, fontSize: 12 }} dy={6} />
            <YAxis tickLine={false} axisLine={false} width={64} tick={{ fill: c.fgMuted, fontSize: 11 }} tickFormatter={(v) => formatTRYCompact(v)} />
            <Tooltip content={<ChartTooltip series={series} />} cursor={{ fill: c['chart-grid'], opacity: 0.5 }} />
            {series.map((s) => (
              <Bar key={s.key} dataKey={s.key} fill={c[`chart-${s.slot}`]} radius={[4, 4, 0, 0]} maxBarSize={28} animationDuration={900} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
