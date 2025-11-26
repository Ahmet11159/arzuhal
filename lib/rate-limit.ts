/**
 * Simple rate limiting utility
 * Production'da Redis veya daha gelişmiş bir çözüm kullanılmalı
 */

interface RateLimitEntry {
  count: number
  resetTime: number
}

// In-memory store (production'da Redis kullanılmalı)
const rateLimitStore = new Map<string, RateLimitEntry>()

/**
 * Rate limit kontrolü yapar
 * @param key - Rate limit key (örn: IP adresi veya email)
 * @param maxRequests - Maksimum istek sayısı
 * @param windowMs - Zaman penceresi (milisaniye)
 * @returns true if allowed, false if rate limited
 */
export function checkRateLimit(
  key: string,
  maxRequests: number = 3,
  windowMs: number = 5 * 60 * 1000 // 5 dakika
): boolean {
  const now = Date.now()
  const entry = rateLimitStore.get(key)

  if (!entry || now > entry.resetTime) {
    // Yeni entry oluştur veya süresi dolmuş entry'yi sıfırla
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + windowMs,
    })
    return true
  }

  if (entry.count >= maxRequests) {
    return false // Rate limit aşıldı
  }

  // Count'u artır
  entry.count++
  rateLimitStore.set(key, entry)
  return true
}

/**
 * Rate limit store'u temizle (eski entry'leri kaldır)
 */
export function cleanupRateLimitStore() {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key)
    }
  }
}

// Her 10 dakikada bir cleanup yap
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupRateLimitStore, 10 * 60 * 1000)
}


