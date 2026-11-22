'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';
import { useOrders } from '@havuz/sdk';
import { PageHeader } from '@/components/app/page-header';
import { OrderRow } from '@/components/app/order-row';
import { Card } from '@/components/ui/card';
import { Segmented } from '@/components/ui/segmented';
import { EmptyState, ErrorState } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

type F = 'active' | 'all' | 'delivered';

export default function OrdersPage() {
  const { data, isLoading, error, refetch } = useOrders();
  const [f, setF] = useState<F>('active');
  const list = useMemo(() => {
    const o = data?.orders ?? [];
    if (f === 'active') return o.filter((x) => x.status !== 'delivered' && x.status !== 'cancelled');
    if (f === 'delivered') return o.filter((x) => x.status === 'delivered');
    return o;
  }, [data, f]);

  return (
    <div>
      <PageHeader
        title="Siparişler"
        description="Tüm tedarikçilerden verdiğiniz siparişler tek listede."
        action={
          <Segmented
            value={f}
            onChange={setF}
            options={[
              { value: 'active', label: 'Aktif' },
              { value: 'delivered', label: 'Teslim edilen' },
              { value: 'all', label: 'Tümü' },
            ]}
          />
        }
      />
      {error ? (
        <ErrorState message={error.message} onRetry={() => refetch()} />
      ) : isLoading ? (
        <Skeleton className="h-96" />
      ) : list.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag className="h-6 w-6" />}
          title={f === 'active' ? 'Aktif siparişiniz yok' : 'Sipariş bulunamadı'}
          action={
            <Link href="/uye/katalog">
              <Button>Sipariş ver</Button>
            </Link>
          }
        />
      ) : (
        <Card className="divide-y divide-border overflow-hidden">
          {list.map((o) => (
            <OrderRow key={o.id} o={o} href={`/uye/siparisler/${o.id}`} />
          ))}
        </Card>
      )}
    </div>
  );
}
