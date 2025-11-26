import { NextRequest } from 'next/server'
import connectDB from '@/lib/mongodb'
import SiteImage from '@/models/SiteImage'
import { verifyToken } from '@/lib/auth'
import { successResponse, errorResponse, unauthorizedResponse, badRequestResponse, validationErrorResponse } from '@/lib/api-response'
import { logger } from '@/lib/logger'

// Tüm site görsellerini getir
export async function GET(request: NextRequest) {
  try {
    await connectDB()
    
    const searchParams = request.nextUrl.searchParams
    const location = searchParams.get('location')
    const key = searchParams.get('key')
    
    const query: any = {}
    if (location) {
      query.location = location
    }
    if (key) {
      query.key = key
    }
    
    const images = await SiteImage.find(query).sort({ createdAt: -1 })
    
    return successResponse(images)
  } catch (error: any) {
    logger.error('Error fetching site images:', error)
    return errorResponse(
      'Site görselleri yüklenirken bir hata oluştu',
      error.message || 'Bilinmeyen bir hata oluştu',
      500
    )
  }
}

// Yeni site görseli oluştur
export async function POST(request: NextRequest) {
  try {
    // Admin kontrolü
    const user = verifyToken(request)
    if (!user || user.role !== 'admin') {
      return unauthorizedResponse('Bu işlem için admin yetkisi gereklidir')
    }

    await connectDB()
    const body = await request.json()
    
    // Validasyon
    if (!body.key || !body.imageUrl || !body.location) {
      return badRequestResponse('key, imageUrl ve location zorunludur')
    }
    
    // Aynı key'de görsel var mı kontrol et
    const existing = await SiteImage.findOne({ key: body.key })
    if (existing) {
      return badRequestResponse('Bu key zaten kullanılıyor')
    }
    
    const siteImage = new SiteImage({
      key: body.key.trim(),
      imageUrl: body.imageUrl.trim(),
      location: body.location.trim(),
      description: body.description?.trim() || undefined,
      altText: body.altText?.trim() || undefined,
      isActive: body.isActive !== undefined ? body.isActive : true,
    })
    
    await siteImage.save()
    
    return successResponse(siteImage, 'Site görseli başarıyla oluşturuldu', 201)
  } catch (error: any) {
    logger.error('Error creating site image:', error)
    
    if (error.code === 11000) {
      return badRequestResponse('Bu key zaten kullanılıyor')
    }
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err: any) => err.message)
      return validationErrorResponse(messages)
    }
    
    return errorResponse(
      'Site görseli oluşturulurken bir hata oluştu',
      error.message || 'Bilinmeyen bir hata oluştu',
      500
    )
  }
}
