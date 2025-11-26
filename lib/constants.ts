/**
 * Application-wide constants
 * Centralized location for magic strings, routes, API endpoints, and configuration values
 */

// Product Categories
export const PRODUCT_CATEGORIES = {
  KLASIK: 'klasik',
  KONSEPT: 'konsept',
} as const

export type ProductCategory = typeof PRODUCT_CATEGORIES[keyof typeof PRODUCT_CATEGORIES]

// API Routes
export const API_ROUTES = {
  PRODUCTS: '/api/products',
  PRODUCTS_BY_ID: (id: string) => `/api/products/${id}`,
  STORIES: '/api/stories',
  STORIES_BY_ID: (id: string) => `/api/stories/${id}`,
  STORIES_CHAPTERS: (id: string) => `/api/stories/${id}/chapters`,
  STORIES_PROGRESS: (id: string) => `/api/stories/${id}/progress`,
  STORIES_PURCHASE: (id: string) => `/api/stories/${id}/purchase`,
  CATEGORIES: '/api/categories',
  CATEGORIES_BY_ID: (id: string) => `/api/categories/${id}`,
  CHAPTERS_BY_ID: (id: string) => `/api/chapters/${id}`,
  SITE_IMAGES: '/api/site-images',
  SITE_IMAGES_BY_KEY: (key: string) => `/api/site-images/${key}`,
  BACKGROUNDS: '/api/backgrounds',
  BACKGROUNDS_BY_KEY: (key: string) => `/api/backgrounds/${key}`,
  BUSINESS_INFO: '/api/business-info',
  FAQS: '/api/faqs',
  FAQS_BY_ID: (id: string) => `/api/faqs/${id}`,
  TESTIMONIALS: '/api/testimonials',
  TESTIMONIALS_BY_ID: (id: string) => `/api/testimonials/${id}`,
  ANNOUNCEMENTS: '/api/announcements',
  ANNOUNCEMENTS_BY_ID: (id: string) => `/api/announcements/${id}`,
  CONTACT_MESSAGES: '/api/contact-messages',
  CONTACT_MESSAGES_BY_ID: (id: string) => `/api/contact-messages/${id}`,
  UPLOAD: '/api/upload',
  ADMIN_LOGIN: '/api/admin/login',
  ADMIN_IMPORT_PRODUCTS: '/api/admin/import-products',
  PRODUCTS_CLEANUP_DUPLICATES: '/api/products/cleanup-duplicates',
} as const

// Frontend Routes
export const ROUTES = {
  HOME: '/',
  PRODUCTS: '/urunler',
  PRODUCT_BY_ID: (id: string) => `/urunler/${id}`,
  CONCEPTS: '/konseptler',
  CONCEPTS_STORIES: '/konseptler/hikayeler',
  CONCEPTS_STORY_BY_ID: (id: string) => `/konseptler/hikayeler/${id}`,
  CONCEPTS_CUP_BROTHERHOOD: '/konseptler/fincan-kardesligi',
  ABOUT: '/hakkimizda',
  CONTACT: '/iletisim',
  ACCOUNT: '/hesabim',
  ADMIN: '/admin',
  FAQ: '/sss',
} as const

// Site Image Locations
export const SITE_IMAGE_LOCATIONS = {
  HOMEPAGE: 'homepage',
  ABOUT_SECTION: 'about-section',
  CONCEPTS_PAGE: 'concepts-page',
  BACKGROUND: 'background',
} as const

// Background Image Pages
export const BACKGROUND_PAGES = {
  HOME: 'home',
  ABOUT: 'about',
  CONTACT: 'contact',
  CONCEPTS: 'concepts',
} as const

// Background Image Sections
export const BACKGROUND_SECTIONS = {
  HERO: 'hero',
  MAIN: 'main',
  CATEGORIES: 'categories',
  CONCEPTS: 'concepts',
  BRAND_MESSAGE: 'brand-message',
} as const

// Contact Message Status
export const CONTACT_MESSAGE_STATUS = {
  PENDING: 'pending',
  READ: 'read',
  REPLIED: 'replied',
  ARCHIVED: 'archived',
} as const

export type ContactMessageStatus = typeof CONTACT_MESSAGE_STATUS[keyof typeof CONTACT_MESSAGE_STATUS]

// Announcement Types
export const ANNOUNCEMENT_TYPES = {
  INFO: 'info',
  WARNING: 'warning',
  SUCCESS: 'success',
  PROMOTION: 'promotion',
} as const

export type AnnouncementType = typeof ANNOUNCEMENT_TYPES[keyof typeof ANNOUNCEMENT_TYPES]

// User Roles
export const USER_ROLES = {
  USER: 'user',
  ADMIN: 'admin',
} as const

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES]

// Local Storage Keys
export const STORAGE_KEYS = {
  ADMIN_TOKEN: 'admin_token',
  ANNOUNCEMENT_DISMISSED: 'announcement_dismissed',
} as const

// Default Values
export const DEFAULTS = {
  PAGE_SIZE: 20,
  POLLING_INTERVAL: 10000, // 10 seconds
  DEBOUNCE_DELAY: 300, // milliseconds
} as const

// Image Configuration
export const IMAGE_CONFIG = {
  MAX_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  QUALITY: 85,
} as const

// SEO Defaults
export const SEO_DEFAULTS = {
  SITE_NAME: 'ARZUHAL',
  SITE_DESCRIPTION: 'Özel tasarım fincanlar ve hikayeler',
  SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'https://arzuhal.com',
} as const


