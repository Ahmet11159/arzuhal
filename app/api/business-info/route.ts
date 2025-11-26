import { NextRequest } from 'next/server'
import connectDB from '@/lib/mongodb'
import BusinessInfo from '@/models/BusinessInfo'
import { verifyToken } from '@/lib/auth'
import { successResponse, errorResponse, unauthorizedResponse, badRequestResponse, validationErrorResponse } from '@/lib/api-response'
import { logger } from '@/lib/logger'

// İşletme bilgilerini getir (public)
export async function GET(request: NextRequest) {
  try {
    await connectDB()
    
    const businessInfo = await BusinessInfo.findOne({ isActive: true })
    
    const headers = {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    }
    
    if (!businessInfo) {
      return successResponse(null, undefined, 200)
    }
    
    return successResponse(businessInfo, undefined, 200)
  } catch (error: any) {
    logger.error('Error fetching business info:', error)
    return errorResponse(
      'İşletme bilgileri yüklenirken bir hata oluştu',
      error.message || 'Bilinmeyen bir hata oluştu',
      500
    )
  }
}

// İşletme bilgilerini güncelle (admin only)
export async function PUT(request: NextRequest) {
  try {
    // Admin kontrolü
    const user = verifyToken(request)
    if (!user || user.role !== 'admin') {
      return unauthorizedResponse('Bu işlem için admin yetkisi gereklidir')
    }

    await connectDB()
    const body = await request.json()
    
    // Validasyon
    if (!body.businessName || !body.address || !body.city || !body.email) {
      return badRequestResponse('İşletme adı, adres, şehir ve e-posta zorunludur')
    }

    // Mevcut aktif kaydı bul
    let businessInfo = await BusinessInfo.findOne({ isActive: true })
    
    if (businessInfo) {
      // Mevcut kaydı güncelle
      businessInfo.businessName = body.businessName.trim()
      businessInfo.address = body.address.trim()
      businessInfo.city = body.city.trim()
      businessInfo.district = body.district?.trim() || undefined
      businessInfo.postalCode = body.postalCode?.trim() || undefined
      businessInfo.country = body.country?.trim() || 'Türkiye'
      businessInfo.phone = body.phone?.trim() || undefined
      businessInfo.email = body.email.trim()
      businessInfo.googleMapsLink = body.googleMapsLink?.trim() || undefined
      businessInfo.appleMapsLink = body.appleMapsLink?.trim() || undefined
      
      await businessInfo.save()
    } else {
      // Yeni kayıt oluştur
      businessInfo = new BusinessInfo({
        businessName: body.businessName.trim(),
        address: body.address.trim(),
        city: body.city.trim(),
        district: body.district?.trim() || undefined,
        postalCode: body.postalCode?.trim() || undefined,
        country: body.country?.trim() || 'Türkiye',
        phone: body.phone?.trim() || undefined,
        email: body.email.trim(),
        googleMapsLink: body.googleMapsLink?.trim() || undefined,
        appleMapsLink: body.appleMapsLink?.trim() || undefined,
        isActive: true,
      })
      
      await businessInfo.save()
    }
    
    return successResponse(businessInfo, 'İşletme bilgileri başarıyla güncellendi')
  } catch (error: any) {
    logger.error('Error updating business info:', error)
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err: any) => err.message)
      return validationErrorResponse(messages)
    }
    
    return errorResponse(
      'İşletme bilgileri güncellenirken bir hata oluştu',
      error.message || 'Bilinmeyen bir hata oluştu',
      500
    )
  }
}

