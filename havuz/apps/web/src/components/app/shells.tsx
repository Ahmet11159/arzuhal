'use client';

import type { ReactNode } from 'react';
import {
  AlertTriangle,
  ClipboardList,
  Inbox,
  LayoutDashboard,
  PackageSearch,
  ShoppingBag,
  Store,
  Tags,
  Truck,
  UserRound,
  Waves,
} from 'lucide-react';
import { AppShell, type NavItem } from './app-shell';

const MEMBER_NAV: NavItem[] = [
  { href: '/uye', label: 'Özet', icon: LayoutDashboard, mobile: true, exact: true },
  { href: '/uye/katalog', label: 'Katalog', icon: PackageSearch, mobile: true },
  { href: '/uye/dalga', label: 'Dalga', icon: Waves, mobile: true },
  { href: '/uye/siparisler', label: 'Siparişler', icon: ShoppingBag, mobile: true },
  { href: '/uye/hesap', label: 'Hesap', icon: UserRound, mobile: true },
];

const SUPPLIER_NAV: NavItem[] = [
  { href: '/tedarikci', label: 'Özet', icon: LayoutDashboard, mobile: true, exact: true },
  { href: '/tedarikci/siparisler', label: 'Siparişler', icon: ClipboardList, mobile: true },
  { href: '/tedarikci/teklifler', label: 'Teklifler', icon: Tags, mobile: true },
];

const ADMIN_NAV: NavItem[] = [
  { href: '/yonetim', label: 'Genel bakış', icon: LayoutDashboard, mobile: true, exact: true },
  { href: '/yonetim/dalgalar', label: 'Dalgalar', icon: Waves, mobile: true },
  { href: '/yonetim/uyeler', label: 'Üyeler', icon: Store, mobile: true },
  { href: '/yonetim/tedarikciler', label: 'Tedarikçiler', icon: Truck },
  { href: '/yonetim/sorunlar', label: 'Mal kabul', icon: AlertTriangle, mobile: true },
  { href: '/yonetim/basvurular', label: 'Başvurular', icon: Inbox, mobile: true },
];

export const MemberShell = ({ children }: { children: ReactNode }) => (
  <AppShell nav={MEMBER_NAV} areaLabel="İşletme paneli" showCart>
    {children}
  </AppShell>
);
export const SupplierShell = ({ children }: { children: ReactNode }) => (
  <AppShell nav={SUPPLIER_NAV} areaLabel="Tedarikçi paneli">
    {children}
  </AppShell>
);
export const AdminShell = ({ children }: { children: ReactNode }) => (
  <AppShell nav={ADMIN_NAV} areaLabel="Yönetim">
    {children}
  </AppShell>
);

