'use client'

import { ReactNode } from 'react'

export interface TypographyProps {
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'body' | 'body-sm' | 'caption'
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span' | 'div'
  gradient?: boolean
  children: ReactNode
  className?: string
}

const variants = {
  h1: 'text-5xl md:text-7xl font-serif font-bold text-charcoal-900',
  h2: 'text-4xl md:text-5xl font-serif font-bold text-charcoal-900',
  h3: 'text-3xl md:text-4xl font-serif font-semibold text-charcoal-900',
  h4: 'text-2xl md:text-3xl font-serif font-semibold text-charcoal-900',
  h5: 'text-xl md:text-2xl font-serif font-medium text-charcoal-900',
  h6: 'text-lg md:text-xl font-serif font-medium text-charcoal-900',
  body: 'text-base text-charcoal-700 leading-relaxed',
  'body-sm': 'text-sm text-charcoal-600 leading-relaxed',
  caption: 'text-xs text-charcoal-500',
}

const defaultElements = {
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  h4: 'h4',
  h5: 'h5',
  h6: 'h6',
  body: 'p',
  'body-sm': 'p',
  caption: 'span',
} as const

export default function Typography({
  variant = 'body',
  as,
  gradient = false,
  children,
  className = '',
}: TypographyProps) {
  const element = as || defaultElements[variant]
  const gradientClass = gradient 
    ? 'bg-gradient-to-r from-charcoal-900 via-gold-500 to-charcoal-900 bg-clip-text text-transparent'
    : ''

  const baseClassName = `
    ${variants[variant]}
    ${gradientClass}
    ${className}
  `.trim()

  switch (element) {
    case 'h1':
      return <h1 className={baseClassName}>{children}</h1>
    case 'h2':
      return <h2 className={baseClassName}>{children}</h2>
    case 'h3':
      return <h3 className={baseClassName}>{children}</h3>
    case 'h4':
      return <h4 className={baseClassName}>{children}</h4>
    case 'h5':
      return <h5 className={baseClassName}>{children}</h5>
    case 'h6':
      return <h6 className={baseClassName}>{children}</h6>
    case 'p':
      return <p className={baseClassName}>{children}</p>
    case 'span':
      return <span className={baseClassName}>{children}</span>
    case 'div':
    default:
      return <div className={baseClassName}>{children}</div>
  }
}
