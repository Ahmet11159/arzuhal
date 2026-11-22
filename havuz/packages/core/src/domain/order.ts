import { applyBps, sum, type Kurus } from '../money';
import type { ItemStatus, OrderStatus, PaymentTerm, Plan } from './enums';

export interface OrderLineInput {
  qty: number;
  unitPrice: Kurus;
  marketPrice: Kurus;
  vatRate: number;
}

/** Vadeli ödeme farkı (bps). Pro üyeler daha düşük oranla, 60 gün vadeye erişir. */
export const FINANCING_BPS: Record<Plan, Record<PaymentTerm, number | null>> = {
  free: { cash: 0, net30: 150, net60: null },
  pro: { cash: 0, net30: 90, net60: 190 },
};

export const PAYMENT_TERM_DAYS: Record<PaymentTerm, number> = { cash: 0, net30: 30, net60: 60 };

export function isTermAllowed(plan: Plan, term: PaymentTerm): boolean {
  return FINANCING_BPS[plan][term] !== null;
}

export interface OrderTotals {
  subtotal: Kurus;
  marketTotal: Kurus;
  savings: Kurus;
  vat: Kurus;
  financingFee: Kurus;
  creditApplied: Kurus;
  total: Kurus;
}

/**
 * Sipariş toplamları. Fiyatlar KDV hariçtir; KDV kalem bazında hesaplanır.
 * Kredi KDV dahil tutardan düşülür; vade farkı kalan (ertelenen) tutara uygulanır.
 */
export function computeOrderTotals(
  lines: OrderLineInput[],
  opts: { plan: Plan; term: PaymentTerm; availableCredit?: Kurus; useCredit?: boolean },
): OrderTotals {
  const subtotal = sum(lines.map((l) => l.qty * l.unitPrice));
  const marketTotal = sum(lines.map((l) => l.qty * Math.max(l.marketPrice, l.unitPrice)));
  const vat = sum(lines.map((l) => Math.round((l.qty * l.unitPrice * l.vatRate) / 100)));
  const bps = FINANCING_BPS[opts.plan][opts.term];
  if (bps === null) throw new Error('Bu ödeme vadesi üyelik planınızda kullanılamaz.');
  const gross = subtotal + vat;
  // Kredi önce düşülür; vade farkı yalnızca ertelenen (kalan) tutara uygulanır.
  const creditApplied = opts.useCredit ? Math.min(Math.max(0, opts.availableCredit ?? 0), gross) : 0;
  const financingFee = applyBps(gross - creditApplied, bps);
  return {
    subtotal,
    marketTotal,
    savings: marketTotal - subtotal,
    vat,
    financingFee,
    creditApplied,
    total: gross - creditApplied + financingFee,
  };
}

const STATUS_ORDER: ItemStatus[] = ['pending', 'confirmed', 'shipped', 'delivered'];

/** Sipariş durumu, iptal edilmemiş kalemlerin en geride olanıdır. */
export function deriveOrderStatus(itemStatuses: ItemStatus[]): OrderStatus {
  const active = itemStatuses.filter((s) => s !== 'cancelled');
  if (active.length === 0) return 'cancelled';
  const minIdx = Math.min(...active.map((s) => STATUS_ORDER.indexOf(s)));
  return STATUS_ORDER[minIdx];
}

/** Kalem için izin verilen bir sonraki durumlar (tedarikçi akışı). */
export const ITEM_TRANSITIONS: Record<ItemStatus, ItemStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};

export function canTransition(from: ItemStatus, to: ItemStatus): boolean {
  return ITEM_TRANSITIONS[from].includes(to);
}

export function dueDate(createdAt: Date, term: PaymentTerm): Date {
  return new Date(createdAt.getTime() + PAYMENT_TERM_DAYS[term] * 86_400_000);
}

export function formatOrderNumber(seq: number, year: number): string {
  return `HVZ-${year}-${String(seq).padStart(6, '0')}`;
}
