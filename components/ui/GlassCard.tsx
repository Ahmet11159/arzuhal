'use client'

import { motion, HTMLMotionProps } from 'framer-motion'
import { ReactNode } from 'react'

export interface GlassCardProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  children: ReactNode
  intensity?: 'light' | 'medium' | 'strong'
  hover?: boolean
}

const intensities = {
  light: 'bg-white/60 backdrop-blur-sm',
  medium: 'bg-white/80 backdrop-blur-md',
  strong: 'bg-white/90 backdrop-blur-lg',
}

export default function GlassCard({
  children,
  intensity = 'medium',
  hover = true,
  className = '',
  ...props
}: GlassCardProps) {
  return (
    <motion.div
      layout
      whileHover={hover ? { y: -2, scale: 1.01 } : {}}
      whileTap={hover ? { scale: 0.99 } : {}}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={`
        ${intensities[intensity]}
        border border-charcoal-900/10
        rounded-2xl
        shadow-lg hover:shadow-xl
        premium-transition
        ${className}
      `}
      {...props}
    >
      {children}
    </motion.div>
  )
}


