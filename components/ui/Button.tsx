'use client'

import { motion, HTMLMotionProps } from 'framer-motion'
import { LucideIcon } from 'lucide-react'
import { ReactNode } from 'react'

export interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  icon?: LucideIcon
  iconPosition?: 'left' | 'right'
  fullWidth?: boolean
  isLoading?: boolean
}

const variants = {
  primary: 'bg-charcoal-900 text-cream-50 hover:bg-gold-500 hover:text-charcoal-900 shadow-lg hover:shadow-xl',
  secondary: 'bg-gold-500 text-charcoal-900 hover:bg-gold-400 shadow-md hover:shadow-lg',
  outline: 'border-2 border-charcoal-900 text-charcoal-900 hover:bg-charcoal-900 hover:text-cream-50 bg-cream-50/90 backdrop-blur-sm',
  ghost: 'text-charcoal-900 hover:bg-charcoal-900/5 hover:text-gold-500',
  danger: 'bg-red-500 text-white hover:bg-red-600 shadow-md hover:shadow-lg',
}

const sizes = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-3 text-base',
  lg: 'px-8 py-4 text-lg',
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconPosition = 'left',
  fullWidth = false,
  isLoading = false,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: disabled || isLoading ? 1 : 1.02, y: disabled || isLoading ? 0 : -2 }}
      whileTap={{ scale: disabled || isLoading ? 1 : 0.98 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={`
        ${variants[variant]}
        ${sizes[size]}
        ${fullWidth ? 'w-full' : ''}
        ${disabled || isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        font-medium rounded-lg
        flex items-center justify-center gap-2
        premium-transition
        min-h-[44px]
        touch-manipulation
        focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-offset-2
        ${className}
      `}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
          />
          <span>Yükleniyor...</span>
        </>
      ) : (
        <>
          {Icon && iconPosition === 'left' && <Icon size={size === 'sm' ? 16 : size === 'md' ? 18 : 20} />}
          {children}
          {Icon && iconPosition === 'right' && <Icon size={size === 'sm' ? 16 : size === 'md' ? 18 : 20} />}
        </>
      )}
    </motion.button>
  )
}

