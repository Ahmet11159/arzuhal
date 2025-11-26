/**
 * Analytics utility for Google Analytics and Google Tag Manager
 * 
 * Environment variables:
 * - NEXT_PUBLIC_GA_ID: Google Analytics Measurement ID (G-XXXXXXXXXX)
 * - NEXT_PUBLIC_GTM_ID: Google Tag Manager Container ID (GTM-XXXXXXX)
 */

export const GA_ID = process.env.NEXT_PUBLIC_GA_ID
export const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID

/**
 * Check if analytics is enabled
 */
export function isAnalyticsEnabled(): boolean {
  return !!(GA_ID || GTM_ID)
}

/**
 * Track page view (for client-side navigation)
 */
export function trackPageView(url: string): void {
  if (typeof window === 'undefined') return

  // Google Analytics 4
  if (GA_ID && (window as any).gtag) {
    ;(window as any).gtag('config', GA_ID, {
      page_path: url,
    })
  }

  // Google Tag Manager
  if (GTM_ID && (window as any).dataLayer) {
    ;(window as any).dataLayer.push({
      event: 'page_view',
      page_path: url,
    })
  }
}

/**
 * Track custom event
 */
export function trackEvent(
  eventName: string,
  eventParams?: Record<string, any>
): void {
  if (typeof window === 'undefined') return

  // Google Analytics 4
  if (GA_ID && (window as any).gtag) {
    ;(window as any).gtag('event', eventName, eventParams)
  }

  // Google Tag Manager
  if (GTM_ID && (window as any).dataLayer) {
    ;(window as any).dataLayer.push({
      event: eventName,
      ...eventParams,
    })
  }
}

/**
 * Track product view
 */
export function trackProductView(productId: string, productName: string): void {
  trackEvent('view_item', {
    item_id: productId,
    item_name: productName,
  })
}

/**
 * Track product click
 */
export function trackProductClick(productId: string, productName: string): void {
  trackEvent('select_item', {
    item_list_id: 'products',
    item_list_name: 'Ürünler',
    items: [
      {
        item_id: productId,
        item_name: productName,
      },
    ],
  })
}

/**
 * Track search
 */
export function trackSearch(searchTerm: string): void {
  trackEvent('search', {
    search_term: searchTerm,
  })
}

/**
 * Track contact form submission
 */
export function trackContactForm(): void {
  trackEvent('generate_lead', {
    event_category: 'engagement',
    event_label: 'contact_form',
  })
}

/**
 * Track story view
 */
export function trackStoryView(storyId: string, storyTitle: string): void {
  trackEvent('view_item', {
    content_type: 'story',
    item_id: storyId,
    item_name: storyTitle,
  })
}


