/**
 * Slug generation utility
 * Türkçe karakterleri İngilizce'ye çevirir ve URL-safe slug üretir
 */

export function generateSlug(text: string): string {
  if (!text || typeof text !== 'string') {
    return ''
  }

  // Türkçe karakterleri İngilizce'ye çevir
  const turkishToEnglish: { [key: string]: string } = {
    'ç': 'c',
    'Ç': 'c',
    'ğ': 'g',
    'Ğ': 'g',
    'ı': 'i',
    'İ': 'i',
    'ö': 'o',
    'Ö': 'o',
    'ş': 's',
    'Ş': 's',
    'ü': 'u',
    'Ü': 'u',
  }

  let slug = text
    .split('')
    .map((char) => turkishToEnglish[char] || char)
    .join('')
    .toLowerCase()
    .trim()
    // Boşlukları ve özel karakterleri tire ile değiştir
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return slug
}

export function validateSlug(slug: string): boolean {
  if (!slug || slug.length < 2 || slug.length > 50) {
    return false
  }
  // Sadece küçük harf, rakam ve tire içermeli
  return /^[a-z0-9-]+$/.test(slug)
}


