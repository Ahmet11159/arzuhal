import { MemberShell } from '@/components/app/shells';

export default function Layout({ children }: { children: React.ReactNode }) {
  return <MemberShell>{children}</MemberShell>;
}
