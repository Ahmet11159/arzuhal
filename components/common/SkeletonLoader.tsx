'use client'

export function ProductCardSkeleton() {
  return (
    <div className="bg-white rounded-lg overflow-hidden border border-charcoal-900/10 premium-hover animate-pulse">
      <div className="relative h-64 bg-cream-200" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-cream-200 rounded w-3/4" />
        <div className="h-3 bg-cream-200 rounded w-full" />
        <div className="h-3 bg-cream-200 rounded w-2/3" />
        <div className="h-6 bg-cream-200 rounded w-1/4 mt-2" />
      </div>
    </div>
  )
}

export function StoryCardSkeleton() {
  return (
    <div className="bg-white rounded-lg overflow-hidden border border-charcoal-900/10 premium-hover animate-pulse">
      <div className="relative h-64 bg-cream-200" />
      <div className="p-6 space-y-3">
        <div className="h-6 bg-cream-200 rounded w-3/4" />
        <div className="h-4 bg-cream-200 rounded w-full" />
        <div className="h-4 bg-cream-200 rounded w-5/6" />
        <div className="h-10 bg-cream-200 rounded w-1/3 mt-4" />
      </div>
    </div>
  )
}

export function TableRowSkeleton() {
  return (
    <tr className="animate-pulse">
      <td className="px-6 py-4">
        <div className="h-4 bg-cream-200 rounded w-3/4" />
      </td>
      <td className="px-6 py-4">
        <div className="h-4 bg-cream-200 rounded w-1/2" />
      </td>
      <td className="px-6 py-4">
        <div className="h-4 bg-cream-200 rounded w-1/4" />
      </td>
      <td className="px-6 py-4">
        <div className="h-6 bg-cream-200 rounded w-16" />
      </td>
      <td className="px-6 py-4">
        <div className="h-4 bg-cream-200 rounded w-12" />
      </td>
    </tr>
  )
}



