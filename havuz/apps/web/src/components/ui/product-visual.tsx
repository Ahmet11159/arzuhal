import { CategoryIcon } from './icon';
import { cn } from '@/lib/cn';

const BOX = { sm: 'h-8 w-8 rounded-lg', md: 'h-10 w-10 rounded-xl', lg: 'h-14 w-14 rounded-2xl', xl: 'h-20 w-20 rounded-3xl' } as const;

/** Ürün fotoğrafı varsa fotoğraf, yoksa kategori simgesi (aynı boyutta). */
export function ProductVisual({ imageUrl, icon, size = 'md', className, alt = '' }: { imageUrl?: string | null; icon: string; size?: keyof typeof BOX; className?: string; alt?: string }) {
  if (!imageUrl) return <CategoryIcon name={icon} size={size} className={className} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={imageUrl} alt={alt} loading="lazy" decoding="async" className={cn('shrink-0 bg-muted object-cover ring-1 ring-border', BOX[size], className)} />
  );
}
