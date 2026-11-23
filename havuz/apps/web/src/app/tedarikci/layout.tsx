import type { Metadata } from 'next';
import { SupplierShell } from '@/components/app/shells';

/** Paneller arama motorlarında dizinlenmez. */
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function Layout({ children }: { children: React.ReactNode }) {
  return <SupplierShell>{children}</SupplierShell>;
}
