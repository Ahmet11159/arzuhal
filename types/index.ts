/**
 * Shared TypeScript types and interfaces
 * Tüm projede kullanılan ortak type tanımları
 */

// Product Types
export interface Product {
  _id: string
  name: string
  description: string
  category: string // Kategori slug (örn: 'klasik', 'konsept', 'lekeli-fincanlar')
  price?: number
  setPrice?: number
  images: string[]
  material: string
  dimensions: {
    height?: number
    width?: number
    depth?: number
    unit: string
  }
  collectionTags: string[]
  suggestedPairings: string[]
  trendyolLink?: string
  isActive: boolean
  seoTitle?: string
  seoDescription?: string
  storyId?: string | { _id: string; title?: string; description?: string }
  chapterNumber?: number
  chapterTitle?: string
  createdAt: string
  updatedAt: string
}

// Story Types
export interface StoryChapter {
  chapterNumber: number
  chapterTitle: string
  chapterContent: string
  productId: string | Product
  isUnlocked?: boolean
}

export interface Story {
  _id: string
  title: string
  description: string
  coverImage?: string
  totalChapters: number
  introContent: string
  chapters: StoryChapter[]
  fullSetPrice?: number
  fullSetTrendyolLink?: string
  isActive: boolean
  seoTitle?: string
  seoDescription?: string
  createdAt: string
  updatedAt: string
}

// Category Types
export interface Category {
  _id: string
  name: string
  slug: string
  description?: string
  imageUrl?: string
  isActive: boolean
  order: number
  createdAt: string
  updatedAt: string
}

// Site Image Types
export interface SiteImage {
  _id: string
  key: string
  imageUrl: string
  location: string
  page?: string
  section?: string
  description?: string
  altText?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// Business Info Types
export interface BusinessInfo {
  _id: string
  businessName: string
  address: string
  city: string
  district?: string
  postalCode?: string
  country: string
  phone?: string
  email: string
  googleMapsLink?: string
  appleMapsLink?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// FAQ Types
export interface FAQ {
  _id: string
  question: string
  answer: string
  category?: string
  order: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// Testimonial Types
export interface Testimonial {
  _id: string
  name: string
  title?: string
  content: string
  rating: number
  imageUrl?: string
  isActive: boolean
  order: number
  createdAt: string
  updatedAt: string
}

// Announcement Types
export interface Announcement {
  _id: string
  title: string
  message: string
  type: 'info' | 'warning' | 'success' | 'promotion'
  link?: string
  linkText?: string
  isActive: boolean
  startDate?: string
  endDate?: string
  createdAt: string
  updatedAt: string
}

// Contact Message Types
export interface ContactMessage {
  _id: string
  name: string
  email: string
  phone?: string
  subject: string
  message: string
  status: 'pending' | 'read' | 'replied' | 'archived'
  adminNotes?: string
  createdAt: string
  updatedAt: string
}

// User Progress Types
export interface UserProgress {
  _id: string
  userId: string
  storyId: string
  unlockedChapters: number[]
  purchasedProducts: string[]
  createdAt: string
  updatedAt: string
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
  count?: number
  details?: any
}

