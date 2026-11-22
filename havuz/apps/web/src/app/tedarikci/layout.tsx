import { SupplierShell } from '@/components/app/shells';

export default function Layout({ children }: { children: React.ReactNode }) {
  return <SupplierShell>{children}</SupplierShell>;
}
