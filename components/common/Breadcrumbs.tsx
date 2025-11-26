'use client'

import Link from 'next/link'
import { Home, ChevronRight } from 'lucide-react'
import { motion } from 'framer-motion'

interface BreadcrumbItem {
  label: string
  href: string
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[]
}

export default function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mb-6"
    >
      <nav aria-label="Breadcrumb">
        <ol className="flex items-center space-x-2 text-sm text-charcoal-600 flex-wrap">
          {items.map((item, index) => (
            <li key={item.href} className="flex items-center">
              {index === 0 ? (
                <Link href={item.href} className="hover:text-gold-500 premium-transition flex items-center gap-1">
                  <Home size={16} />
                  {item.label}
                </Link>
              ) : (
                <>
                  <ChevronRight size={16} className="text-charcoal-400 mx-2" />
                  {index === items.length - 1 ? (
                    <span className="text-charcoal-900 font-medium">{item.label}</span>
                  ) : (
                    <Link href={item.href} className="hover:text-gold-500 premium-transition">
                      {item.label}
                    </Link>
                  )}
                </>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </motion.div>
  )
}


