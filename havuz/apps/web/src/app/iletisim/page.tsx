import type { Metadata } from 'next';
import { Clock, Mail, MapPin, Phone, ShieldCheck } from 'lucide-react';
import { LegalShell } from '@/components/legal/legal-shell';
import { LEGAL_UPDATED, loadCompany } from '@/components/legal/company';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'İletişim · Havuz' };

export default async function Page() {
  const c = await loadCompany();
  const rows = [
    { icon: Mail, label: 'E-posta', value: <a href={`mailto:${c.email}`}>{c.email}</a> },
    { icon: Phone, label: 'Telefon', value: <a href={`tel:${c.phone.replace(/\s+/g, '')}`}>{c.phone}</a> },
    { icon: Clock, label: 'Destek saatleri', value: c.supportHours },
    { icon: MapPin, label: 'Adres', value: c.address },
    ...(c.kepAddress ? [{ icon: ShieldCheck, label: 'KEP adresi', value: c.kepAddress }] : []),
  ];
  return (
    <LegalShell title="İletişim" updated={LEGAL_UPDATED} path="/iletisim">
      <p>Sipariş, ödeme, iade ve üyelik konularında bize aşağıdaki kanallardan ulaşabilirsiniz. Üyeler, sipariş sayfasından da doğrudan bildirim yapabilir.</p>
      <ul className="!list-none !pl-0">
        {rows.map((r) => (
          <li key={r.label} className="flex items-start gap-3 rounded-xl border border-border p-3">
            <r.icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>
              <span className="block text-xs text-fg-subtle">{r.label}</span>
              <span className="text-fg">{r.value}</span>
            </span>
          </li>
        ))}
      </ul>
      <h2>Şirket</h2>
      <p>
        {c.legalName} · {c.taxOffice} V.D. {c.taxNo}
        {c.mersisNo ? ` · MERSİS ${c.mersisNo}` : ''}
      </p>
      <p>
        Kişisel verilerinizle ilgili başvurular için: <a href={`mailto:${c.kvkkEmail}`}>{c.kvkkEmail}</a>
      </p>
    </LegalShell>
  );
}
