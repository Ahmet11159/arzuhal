import { CheckCircle2, CircleDashed, Clock3, PackageCheck, Truck, XCircle } from 'lucide-react';
import { ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL, type OrderStatus, type PaymentStatus } from '@havuz/core';
import { Badge, type BadgeTone } from './badge';

const ORDER_TONE: Record<OrderStatus, BadgeTone> = {
  pending: 'warning',
  confirmed: 'info',
  shipped: 'primary',
  delivered: 'success',
  cancelled: 'neutral',
};
const ORDER_ICON = { pending: Clock3, confirmed: CircleDashed, shipped: Truck, delivered: PackageCheck, cancelled: XCircle };

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const Icon = ORDER_ICON[status];
  return (
    <Badge tone={ORDER_TONE[status]}>
      <Icon className="h-3 w-3" aria-hidden />
      {ORDER_STATUS_LABEL[status]}
    </Badge>
  );
}

const PAY_TONE: Record<PaymentStatus, BadgeTone> = { unpaid: 'warning', paid: 'success', due: 'info', overdue: 'danger' };
export function PaymentBadge({ status }: { status: PaymentStatus }) {
  return (
    <Badge tone={PAY_TONE[status]}>
      {status === 'paid' ? <CheckCircle2 className="h-3 w-3" aria-hidden /> : <Clock3 className="h-3 w-3" aria-hidden />}
      {PAYMENT_STATUS_LABEL[status]}
    </Badge>
  );
}
