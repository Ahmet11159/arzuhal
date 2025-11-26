'use client'

import { motion, HTMLMotionProps } from 'framer-motion'
import { ReactNode } from 'react'
import { LucideIcon } from 'lucide-react'

export interface CardProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  children: ReactNode
  variant?: 'default' | 'glass' | 'elevated' | 'outlined'
  hover?: boolean
  icon?: LucideIcon
  title?: string
  description?: string
}

const variants = {
  default: 'bg-white border border-charcoal-900/10',
  glass: 'bg-white/80 backdrop-blur-md border border-charcoal-900/10 shadow-lg',
  elevated: 'bg-white border border-charcoal-900/10 shadow-xl',
  outlined: 'bg-transparent border-2 border-charcoal-900/20',
}

export default function Card({
  children,
  variant = 'default',
  hover = true,
  icon: Icon,
  title,
  description,
  className = '',
  ...props
}: CardProps) {
  return (
    <motion.div
      layout
      whileHover={hover ? { y: -4, scale: 1.01 } : {}}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`
        ${variants[variant]}
        ${hover ? 'premium-hover' : ''}
        rounded-2xl overflow-hidden
        ${className}
      `}
      {...props}
    >
      {(Icon || title || description) && (
        <div className="p-6 border-b border-charcoal-900/10">
          {Icon && (
            <div className="mb-3 inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-gold-200 via-gold-100 to-cream-50 shadow-md">
              <Icon size={24} className="text-charcoal-900" />
            </div>
          )}
          {title && (
            <h3 className="text-xl font-serif font-semibold text-charcoal-900 mb-2">{title}</h3>
          )}
          {description && (
            <p className="text-sm text-charcoal-600">{description}</p>
          )}
        </div>
      )}
      <div className={Icon || title || description ? 'p-6' : 'p-6'}>
        {children}
      </div>
    </motion.div>
  )
}


