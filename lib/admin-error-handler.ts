/**
 * Admin sayfasındayken gereksiz "admin yetkisi gereklidir" hatalarını filtreler
 */
export function shouldShowAdminError(message: string | undefined): boolean {
  if (!message) return true
  
  // Admin sayfasındayken "admin yetkisi gereklidir" mesajını gösterme
  if (message.includes('admin yetkisi') || message.includes('admin yetkisi gereklidir')) {
    return false
  }
  
  return true
}


