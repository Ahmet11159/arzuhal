import type { Config } from 'tailwindcss';

const c = (v: string) => `rgb(var(--${v}) / <alpha-value>)`;

export default {
  darkMode: ['class', '[data-theme="dark"]'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    container: { center: true, padding: '1rem', screens: { '2xl': '1280px' } },
    extend: {
      colors: {
        bg: c('bg'),
        surface: c('surface'),
        muted: c('muted'),
        border: c('border'),
        fg: c('fg'),
        'fg-muted': c('fg-muted'),
        'fg-subtle': c('fg-subtle'),
        primary: { DEFAULT: c('primary'), fg: c('primary-fg'), soft: c('primary-soft') },
        accent: { DEFAULT: c('accent'), fg: c('accent-fg'), soft: c('accent-soft') },
        danger: { DEFAULT: c('danger'), soft: c('danger-soft') },
        warning: { DEFAULT: c('warning'), soft: c('warning-soft') },
        success: { DEFAULT: c('success'), soft: c('success-soft') },
        info: { DEFAULT: c('info'), soft: c('info-soft') },
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'ui-monospace', 'monospace'],
      },
      borderRadius: { xl: '14px', '2xl': '18px', '3xl': '24px' },
      boxShadow: {
        card: '0 1px 2px rgb(var(--shadow) / 0.06), 0 4px 16px -4px rgb(var(--shadow) / 0.08)',
        lift: '0 2px 4px rgb(var(--shadow) / 0.06), 0 18px 40px -12px rgb(var(--shadow) / 0.22)',
        glow: '0 0 0 1px rgb(var(--primary) / 0.25), 0 8px 32px -6px rgb(var(--primary) / 0.45)',
      },
      keyframes: {
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        'pulse-ring': { '0%': { transform: 'scale(0.8)', opacity: '0.8' }, '100%': { transform: 'scale(2.2)', opacity: '0' } },
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-6px)' } },
        'gradient-x': { '0%,100%': { backgroundPosition: '0% 50%' }, '50%': { backgroundPosition: '100% 50%' } },
      },
      animation: {
        shimmer: 'shimmer 1.6s infinite',
        'pulse-ring': 'pulse-ring 1.8s cubic-bezier(0.2,0.6,0.4,1) infinite',
        float: 'float 5s ease-in-out infinite',
        'gradient-x': 'gradient-x 8s ease infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
