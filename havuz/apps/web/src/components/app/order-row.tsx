'use client';

import Link from 'next/link';
import { ChevronRight, Waves, Zap } from 'lucide-react';
import { formatTRY, PAYMENT_TERM_LABEL, type OrderSummaryDTO } from '@havuz/core';
import { fmtDate } from '@/lib/format';
import { OrderStatusBadge } from '../ui/status';

export function OrderRow({ o, href }: { o: OrderSummaryDTO; href: string }) {
  return (
    <Link href={href} className="group flex items-center gap-4 px-5 py-3.5 transition hover:bg-muted/50">
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${o.wave ? 'bg-primary-soft text-primary' : 'bg-accent-soft text-warning'}`}>
        {o.wave ? <Waves className="h-[18px] w-[18px]" /> : <Zap className="h-[18px] w-[18px]" />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-mono text-[13px] font-medium">{o.number}</span>
          <OrderStatusBadge status={o.status} />
        </div>
        <div className="mt-0.5 truncate text-xs text-fg-muted">
          {o.member ? `${o.member.name} · ` : ''}
          {fmtDate(o.createdAt)} · {o.itemCount} kalem · {o.supplierCount} tedarikçi · {o.wave ? o.wave.title : 'Hemen teslim'} · {PAYMENT_TERM_LABEL[o.paymentTerm]}
        </div>
      </div>
      <div className="text-right">
        <div className="font-semibold tabular">{formatTRY(o.total)}</div>
        {o.savings + o.waveCredit > 0 && <div className="text-xs font-medium text-success tabular">−{formatTRY(o.savings + o.waveCredit)}</div>}
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-fg-subtle transition group-hover:translate-x-0.5" />
    </Link>
  );
}
