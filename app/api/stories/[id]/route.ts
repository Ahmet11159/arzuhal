import { NextRequest } from 'next/server'
import connectDB from '@/lib/mongodb'
import Story from '@/models/Story'
import { verifyToken } from '@/lib/auth'
import { successResponse, errorResponse, unauthorizedResponse, notFoundResponse, badRequestResponse, validationErrorResponse } from '@/lib/api-response'
import { logger } from '@/lib/logger'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB()
    const story = await Story.findById(params.id).populate({
      path: 'chapters.productId',
      model: 'Product',
      select: 'name images description price setPrice category material dimensions collectionTags trendyolLink isActive', // price, setPrice, category ve trendyolLink dahil
    })
    
    if (!story) {
      return notFoundResponse('Hikaye bulunamadı')
    }
    
    return successResponse(story)
  } catch (error: any) {
    logger.error('Error fetching story:', error)
    return errorResponse(
      'Hikaye yüklenirken bir hata oluştu',
      error.message || 'Bilinmeyen bir hata oluştu',
      500
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Admin kontrolü
    const user = verifyToken(request)
    if (!user || user.role !== 'admin') {
      return unauthorizedResponse('Bu işlem için admin yetkisi gereklidir')
    }
    
    await connectDB()
    const body = await request.json()
    
    logger.log('PUT - Gelen veri:', JSON.stringify(body, null, 2))
    
    // Validasyon
    if (!body.title || !body.description || !body.introContent || !body.coverImage) {
      return badRequestResponse('Başlık, açıklama, giriş içeriği ve kapak görseli zorunludur')
    }
    
    // isActive varsayılan değeri
    if (body.isActive === undefined) {
      body.isActive = true
    }
    
    // chapters varsayılan değeri
    if (!body.chapters) {
      body.chapters = []
    }
    
    // Trendyol linklerini temizle
    if (body.fullSetTrendyolLink && typeof body.fullSetTrendyolLink === 'string') {
      body.fullSetTrendyolLink = body.fullSetTrendyolLink.trim() || undefined
    }
    
    // fullSetPrice işle
    if ('fullSetPrice' in body) {
      if (typeof body.fullSetPrice === 'string') {
        body.fullSetPrice = body.fullSetPrice.trim() ? parseFloat(body.fullSetPrice) : undefined
      } else if (body.fullSetPrice === '' || body.fullSetPrice === null) {
        body.fullSetPrice = undefined
      } else if (typeof body.fullSetPrice === 'number') {
        body.fullSetPrice = body.fullSetPrice > 0 ? body.fullSetPrice : undefined
      }
    }
    
    if (body.chapters && Array.isArray(body.chapters)) {
      body.chapters = body.chapters.map((chapter: any) => {
        // productId boş string veya undefined ise null yap
        let productId = chapter.productId
        if (productId === '' || productId === undefined) {
          productId = null
        } else if (typeof productId === 'string') {
          productId = productId.trim() || null
        }
        
        return {
          ...chapter,
          productId: productId,
          trendyolLink: chapter.trendyolLink?.trim() || undefined,
        }
      })
    }
    
    logger.log('PUT - Güncellenecek veri:', JSON.stringify(body, null, 2))
    
    const story = await Story.findByIdAndUpdate(
      params.id,
      body,
      { new: true, runValidators: true }
    )
    
    if (!story) {
      return notFoundResponse('Hikaye bulunamadı')
    }
    
    // Populate ile güncellenmiş story'yi döndür
    await story.populate({
      path: 'chapters.productId',
      model: 'Product',
      select: 'name images description price setPrice category material dimensions collectionTags trendyolLink isActive',
    })
    
    logger.log('PUT - Güncellenen hikaye:', JSON.stringify(story, null, 2))
    
    return successResponse(story, 'Hikaye başarıyla güncellendi')
  } catch (error: any) {
    logger.error('Error updating story:', error)
    
    // Mongoose validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err: any) => err.message)
      return validationErrorResponse(messages)
    }
    
    return errorResponse(
      'Hikaye güncellenirken bir hata oluştu',
      error.message || 'Bilinmeyen bir hata oluştu',
      500
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Admin kontrolü
    const user = verifyToken(request)
    if (!user || user.role !== 'admin') {
      return unauthorizedResponse('Bu işlem için admin yetkisi gereklidir')
    }
    
    await connectDB()
    const story = await Story.findByIdAndDelete(params.id)
    
    if (!story) {
      return notFoundResponse('Hikaye bulunamadı')
    }
    
    return successResponse(null, 'Hikaye başarıyla silindi')
  } catch (error: any) {
    logger.error('Error deleting story:', error)
    return errorResponse(
      'Hikaye silinirken bir hata oluştu',
      error.message || 'Bilinmeyen bir hata oluştu',
      500
    )
  }
}

