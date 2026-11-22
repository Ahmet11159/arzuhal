import Link from 'next/link';
import { cn } from '@/lib/cn';

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn('h-8 w-8', className)} aria-hidden>
      <rect width="64" height="64" rx="16" fill="#06120e" />
      <circle cx="32" cy="32" r="18" fill="none" stroke="#2cc79a" strokeWidth="5" />
      <circle cx="32" cy="32" r="7" fill="#f5b453" />
      <circle cx="32" cy="9" r="4" fill="#2cc79a" />
      <circle cx="52" cy="44" r="4" fill="#2cc79a" />
      <circle cx="12" cy="44" r="4" fill="#2cc79a" />
    </svg>
  );
}

export function Logo({ href = '/', className, light }: { href?: string; className?: string; light?: boolean }) {
  return (
    <Link href={href} className={cn('inline-flex items-center gap-2.5', className)} aria-label="Havuz ana sayfa">
      <LogoMark />
      <span className={cn('text-[17px] font-semibold tracking-tight', light && 'text-white')}>havuz</span>
    </Link>
  );
}
