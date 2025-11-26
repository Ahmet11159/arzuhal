'use client'

import { ReactNode } from 'react'
import { Package, BookOpen, Search } from 'lucide-react'

interface EmptyStateProps {
  icon?: 'package' | 'book' | 'search'
  title: string
  description?: string
  action?: ReactNode
}

const icons = {
  package: Package,
  book: BookOpen,
  search: Search,
}

export default function EmptyState({ icon = 'package', title, description, action }: EmptyStateProps) {
  const Icon = icons[icon]

  return (
    <div className="text-center py-16 px-4">
      <div className="flex justify-center mb-4">
        <div className="p-4 bg-cream-100 rounded-full">
          <Icon size={48} className="text-charcoal-400" />
        </div>
      </div>
      <h3 className="text-xl font-serif font-semibold text-charcoal-900 mb-2">{title}</h3>
      {description && (
        <p className="text-charcoal-600 mb-6 max-w-md mx-auto">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}



