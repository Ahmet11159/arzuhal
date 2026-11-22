'use client';

import { useDeferredValue, useState } from 'react';
import { CreditCard, History, Mail, MessageCircle, Search } from 'lucide-react';
import { formatTRY, PAYMENT_PURPOSE_LABEL, PAYMENT_RECORD_STATUS_LABEL } from '@havuz/core';
import { useAdminAudit, useAdminOutbox, usePayments } from '@havuz/sdk';
import { PageHeader } from '@/components/app/page-header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input, Select } from '@/components/ui/input';
import { Segmented } from '@/components/ui/segmented';
import { Skeleton } from '@/components/ui/skeleton';
import { fmtDateTime } from '@/lib/format';

const ENTITIES = [
  ['', 'Tümü'],
  ['order', 'Sipariş'],
  ['order_item', 'Sipariş kalemi'],
  ['payment', 'Ödeme'],
  ['settlement', 'Hakediş'],
  ['wave', 'Dalga'],
  ['issue', 'Mal kabul'],
  ['offer', 'Teklif'],
  ['product', 'Ürün'],
  ['organization', 'Kuruluş'],
  ['user', 'Kullanıcı'],
] as const;

export default function AdminLogsPage() {
  const [tab, setTab] = useState<'audit' | 'payments' | 'outbox'>('audit');
  return (
    <div>
      <PageHeader
        title="Kayıtlar"
        description="Kim neyi ne zaman yaptı, tüm kart ödemeleri ve gönderilen e-posta / WhatsApp mesajları."
        action={
          <Segmented
            value={tab}
            onChange={setTab}
            options={[
              { value: 'audit', label: <><History className="h-3.5 w-3.5" /> İşlem kaydı</> },
              { value: 'payments', label: <><CreditCard className="h-3.5 w-3.5" /> Ödemeler</> },
              { value: 'outbox', label: <><Mail className="h-3.5 w-3.5" /> Mesajlar</> },
            ]}
          />
        }
      />
      {tab === 'audit' ? <AuditTab /> : tab === 'payments' ? <PaymentsTab /> : <OutboxTab />}
    </div>
  );
}

function AuditTab() {
  const [q, setQ] = useState('');
  const [entity, setEntity] = useState('');
  const dq = useDeferredValue(q);
  const { data, isLoading } = useAdminAudit(dq, entity);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <div className="w-72">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Özet veya kişi ara" icon={<Search className="h-4 w-4" />} />
        </div>
        <div className="w-52">
          <Select value={entity} onChange={(e) => setEntity(e.target.value)}>
            {ENTITIES.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </div>
      </div>
      {isLoading ? (
        <Skeleton className="h-96" />
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-border">
            {data?.logs.length === 0 && <li className="px-5 py-10 text-center text-sm text-fg-muted">Kayıt yok</li>}
            {data?.logs.map((l) => (
              <li key={l.id} className="flex flex-wrap items-start gap-3 px-5 py-3 text-sm">
                <span className="w-36 shrink-0 text-xs tabular text-fg-subtle">{fmtDateTime(l.createdAt)}</span>
                <div className="min-w-0 flex-1">
                  <div>{l.summary}</div>
                  <div className="mt-0.5 text-xs text-fg-muted">
                    {l.actorName ?? 'Sistem'} · <span className="font-mono">{l.action}</span>
                    {l.ip ? ` · ${l.ip}` : ''}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function PaymentsTab() {
  const { data, isLoading } = usePayments();
  if (isLoading) return <Skeleton className="h-96" />;
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-xs text-fg-muted">
              <th className="px-5 py-2.5 font-medium">Tarih</th>
              <th className="px-3 py-2.5 font-medium">İşletme</th>
              <th className="px-3 py-2.5 font-medium">Amaç</th>
              <th className="px-3 py-2.5 font-medium">Sağlayıcı</th>
              <th className="px-3 py-2.5 font-medium">Durum</th>
              <th className="px-5 py-2.5 text-right font-medium">Tutar</th>
            </tr>
          </thead>
          <tbody>
            {data?.payments.map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0">
                <td className="px-5 py-3 text-fg-muted">{fmtDateTime(p.createdAt)}</td>
                <td className="px-3 py-3">{p.orgName}</td>
                <td className="px-3 py-3">
                  {PAYMENT_PURPOSE_LABEL[p.purpose]}
                  {p.orderNumber && <div className="font-mono text-xs text-fg-subtle">{p.orderNumber}</div>}
                </td>
                <td className="px-3 py-3 text-fg-muted">
                  {p.provider}
                  {p.cardLast4 && ` · ••${p.cardLast4}`}
                </td>
                <td className="px-3 py-3">
                  <Badge tone={p.status === 'succeeded' ? 'success' : p.status === 'failed' ? 'danger' : p.status === 'pending' ? 'warning' : 'neutral'}>{PAYMENT_RECORD_STATUS_LABEL[p.status]}</Badge>
                  {p.errorMessage && <div className="mt-1 max-w-[220px] text-xs text-danger">{p.errorMessage}</div>}
                </td>
                <td className="px-5 py-3 text-right font-semibold tabular">{formatTRY(p.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function OutboxTab() {
  const { data, isLoading } = useAdminOutbox();
  if (isLoading) return <Skeleton className="h-96" />;
  return (
    <Card className="overflow-hidden">
      <ul className="divide-y divide-border">
        {data?.messages.length === 0 && <li className="px-5 py-10 text-center text-sm text-fg-muted">Henüz mesaj yok</li>}
        {data?.messages.map((m) => (
          <li key={m.id} className="flex flex-wrap items-start gap-3 px-5 py-3 text-sm">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-muted text-fg-muted">
              {m.channel === 'email' ? <Mail className="h-4 w-4" /> : <MessageCircle className="h-4 w-4" />}
            </span>
            <div className="min-w-0 flex-1">
              <div className="font-medium">{m.subject}</div>
              <div className="text-xs text-fg-muted">
                {m.recipient} · {fmtDateTime(m.createdAt)}
                {m.attempts > 1 ? ` · ${m.attempts} deneme` : ''}
              </div>
              {m.body ? <div className="mt-1 line-clamp-2 whitespace-pre-line text-xs text-fg-subtle">{m.body}</div> : <div className="mt-1 text-xs italic text-fg-subtle">İçerik gizli (giriş bilgisi içerir)</div>}
              {m.lastError && <div className="mt-1 text-xs text-danger">{m.lastError}</div>}
            </div>
            <Badge tone={m.status === 'sent' ? 'success' : m.status === 'failed' ? 'danger' : m.status === 'pending' ? 'warning' : 'neutral'}>
              {m.status === 'sent' ? 'Gönderildi' : m.status === 'failed' ? 'Başarısız' : m.status === 'pending' ? 'Kuyrukta' : 'Atlandı'}
            </Badge>
          </li>
        ))}
      </ul>
    </Card>
  );
}
