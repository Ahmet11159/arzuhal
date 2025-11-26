import { NextRequest } from 'next/server'
import connectDB from '@/lib/mongodb'
import SiteImage from '@/models/SiteImage'
import { verifyToken } from '@/lib/auth'
import { successResponse, errorResponse, unauthorizedResponse, badRequestResponse, validationErrorResponse } from '@/lib/api-response'
import { logger } from '@/lib/logger'

// Tüm arka plan görsellerini getir
export async function GET(request: NextRequest) {
  try {
    await connectDB()
    
    const searchParams = request.nextUrl.searchParams
    const page = searchParams.get('page')
    const section = searchParams.get('section')
    
    const query: any = { location: 'background' }
    
    if (page) {
      query.page = page
    }
    if (section) {
      query.section = section
    }
    
    const backgrounds = await SiteImage.find(query).sort({ page: 1, section: 1, createdAt: -1 })
    
    return successResponse(backgrounds)
  } catch (error: any) {
    logger.error('Error fetching backgrounds:', error)
    return errorResponse(
      'Arka planlar yüklenirken bir hata oluştu',
      error.message || 'Bilinmeyen bir hata oluştu',
      500
    )
  }
}

// Yeni arka plan görseli oluştur
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
    if (!body.key || !body.imageUrl || !body.page || !body.section) {
      return badRequestResponse('key, imageUrl, page ve section zorunludur')
    }
    
    // Aynı key'de görsel var mı kontrol et
    const existing = await SiteImage.findOne({ key: body.key })
    if (existing) {
      return badRequestResponse('Bu key zaten kullanılıyor')
    }
    
    const background = new SiteImage({
      key: body.key.trim(),
      imageUrl: body.imageUrl.trim(),
      location: 'background',
      page: body.page.trim(),
      section: body.section.trim(),
      description: body.description?.trim() || undefined,
      altText: body.altText?.trim() || undefined,
      isActive: body.isActive !== undefined ? body.isActive : true,
    })
    
    await background.save()
    
    return successResponse(background, 'Arka plan başarıyla oluşturuldu', 201)
  } catch (error: any) {
    logger.error('Error creating background:', error)
    
    if (error.code === 11000) {
      return badRequestResponse('Bu key zaten kullanılıyor')
    }
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err: any) => err.message)
      return validationErrorResponse(messages)
    }
    
    return errorResponse(
      'Arka plan oluşturulurken bir hata oluştu',
      error.message || 'Bilinmeyen bir hata oluştu',
      500
    )
  }
}

