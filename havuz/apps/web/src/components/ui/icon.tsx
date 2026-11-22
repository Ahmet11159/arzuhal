import { Apple, Beef, Coffee, Milk, Package, SprayCan, Wheat, ShoppingBasket, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

const ICONS: Record<string, LucideIcon> = { Wheat, Coffee, Milk, Apple, Beef, Package, SprayCan };

/** Kategori renkleri: kimlik (kategorik) görevini taşır, sabit sırada. */
const TINTS: Record<string, string> = {
  Wheat: 'from-[#f5c46b] to-[#e08a1e] text-[#3b2200]',
  Coffee: 'from-[#b98a66] to-[#6b4229] text-white',
  Milk: 'from-[#cfe3ff] to-[#7aa7e8] text-[#0b2547]',
  Apple: 'from-[#9be37a] to-[#2f9e44] text-[#062b0c]',
  Beef: 'from-[#ff9a8f] to-[#d6453d] text-white',
  Package: 'from-[#e6d2b5] to-[#a8875c] text-[#2b1d08]',
  SprayCan: 'from-[#a6f0e4] to-[#1baf9a] text-[#032b25]',
};

export function CategoryIcon({ name, className, size = 'md' }: { name: string; className?: string; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const Icon = ICONS[name] ?? ShoppingBasket;
  const box = { sm: 'h-8 w-8 rounded-lg', md: 'h-10 w-10 rounded-xl', lg: 'h-14 w-14 rounded-2xl', xl: 'h-20 w-20 rounded-3xl' }[size];
  const ic = { sm: 'h-4 w-4', md: 'h-5 w-5', lg: 'h-7 w-7', xl: 'h-9 w-9' }[size];
  return (
    <span
      className={cn(
        'relative grid shrink-0 place-items-center bg-gradient-to-br shadow-[inset_0_1px_0_rgb(255_255_255/0.45),0_4px_12px_-4px_rgb(0_0_0/0.25)]',
        TINTS[name] ?? 'from-muted to-border text-fg',
        box,
        className,
      )}
    >
      <Icon className={ic} strokeWidth={2} aria-hidden />
    </span>
  );
}
