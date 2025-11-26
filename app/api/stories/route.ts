import { NextRequest } from 'next/server'
import connectDB from '@/lib/mongodb'
import Story from '@/models/Story'
import { verifyToken } from '@/lib/auth'
import { successResponse, errorResponse, unauthorizedResponse, badRequestResponse, validationErrorResponse } from '@/lib/api-response'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    // Admin paneli için tüm hikayeleri getir (isActive filtresi yok)
    // chapters'ı da seç ki totalChapters'ı doğru hesaplayabilelim
    const stories = await Story.find({})
      .select('title description coverImage totalChapters introContent isActive chapters')
      .sort({ createdAt: -1 })
    
    // Her story için totalChapters'ı chapters.length ile güncelle
    const storiesWithCorrectCount = stories.map((story: any) => {
      const storyObj = story.toObject ? story.toObject() : story
      // chapters varsa length'ini kullan, yoksa totalChapters'ı kullan
      storyObj.totalChapters = storyObj.chapters && Array.isArray(storyObj.chapters) 
        ? storyObj.chapters.length 
        : (storyObj.totalChapters || 0)
      // chapters'ı response'dan çıkar (performans için)
      delete storyObj.chapters
      return storyObj
    })
    
    return successResponse(storiesWithCorrectCount)
  } catch (error: any) {
    logger.error('Error fetching stories:', error)
    
    // MongoDB bağlantı hatası kontrolü
    if (error.name === 'MongooseServerSelectionError' || error.message?.includes('whitelist')) {
      return errorResponse(
        'Veritabanı bağlantısı kurulamadı',
        'MongoDB Atlas IP whitelist ayarlarınızı kontrol edin. IP adresinizin whitelist\'te olduğundan emin olun.',
        503
      )
    }
    
    return errorResponse(
      'Hikayeler yüklenirken bir hata oluştu',
      error.message || 'Bilinmeyen bir hata oluştu',
      500
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Admin kontrolü
    const user = verifyToken(request)
    if (!user || user.role !== 'admin') {
      return unauthorizedResponse('Bu işlem için admin yetkisi gereklidir')
    }
    
    await connectDB()
    const body = await request.json()
    
    logger.log('POST - Gelen veri:', JSON.stringify(body, null, 2))
    
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
    
    logger.log('POST - Kaydedilecek veri:', JSON.stringify(body, null, 2))
    
    const story = new Story(body)
    await story.save()
    
    logger.log('POST - Kaydedilen hikaye:', JSON.stringify(story, null, 2))
    
    return successResponse(story, 'Hikaye başarıyla oluşturuldu', 201)
  } catch (error: any) {
    logger.error('Error creating story:', error)
    
    // Mongoose validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err: any) => err.message)
      logger.error('Validation Error:', messages.join(', '))
      return validationErrorResponse(messages)
    }
    
    return errorResponse(
      'Hikaye oluşturulurken bir hata oluştu',
      error.message || 'Bilinmeyen bir hata oluştu',
      500
    )
  }
}

