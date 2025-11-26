import { NextRequest } from 'next/server'
import connectDB from '@/lib/mongodb'
import Product from '@/models/Product'
import { verifyToken } from '@/lib/auth'
import { successResponse, errorResponse, unauthorizedResponse, validationErrorResponse } from '@/lib/api-response'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    
    const searchParams = request.nextUrl.searchParams
    const category = searchParams.get('category')
    const search = searchParams.get('search') || searchParams.get('q')
    
    // Admin kontrolü - admin ise tüm ürünleri göster
    const user = verifyToken(request)
    const isAdmin = user && user.role === 'admin'
    
    const query: any = {}
    // Admin değilse sadece aktif ürünleri göster
    if (!isAdmin) {
      query.isActive = true
    }
    
    // Arama sorgusu
    if (search && search.trim()) {
      query.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { description: { $regex: search.trim(), $options: 'i' } },
        { material: { $regex: search.trim(), $options: 'i' } },
        { 'collectionTags': { $regex: search.trim(), $options: 'i' } },
      ]
    }
    
    if (category && category !== 'all') {
      // Kategori slug'ının geçerli olup olmadığını kontrol et
      const Category = (await import('@/models/Category')).default
      const categoryExists = await Category.findOne({ slug: category, isActive: true })
      if (categoryExists) {
        query.category = category
      } else {
        // Kategori bulunamazsa boş sonuç döndür
        return successResponse([], undefined, 200, 0)
      }
    }
    
    // Konsept ürünler için hikaye bilgilerini populate et
    // storyId null olabilir, bu yüzden populate'i güvenli şekilde yap
    let products = await Product.find(query).sort({ createdAt: -1 })
    
    // storyId varsa populate et (hata olursa devam et)
    try {
      products = await Product.populate(products, {
        path: 'storyId',
        select: 'title description',
      })
    } catch (populateError) {
      // Populate hatası olsa bile devam et
      logger.warn('Populate hatası (devam ediliyor):', populateError)
    }
    
    return successResponse(products)
  } catch (error: any) {
    logger.error('Error fetching products:', error)
    
    // MongoDB bağlantı hatası kontrolü
    if (error.name === 'MongooseServerSelectionError' || error.message?.includes('whitelist')) {
      return errorResponse(
        'Veritabanı bağlantısı kurulamadı',
        'MongoDB Atlas IP whitelist ayarlarınızı kontrol edin. IP adresinizin whitelist\'te olduğundan emin olun.',
        503
      )
    }
    
    return errorResponse(
      'Ürünler yüklenirken bir hata oluştu',
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
    
    // Trendyol linkini işle: boş string'leri null'a çevir
    if ('trendyolLink' in body) {
      if (typeof body.trendyolLink === 'string') {
        const trimmed = body.trendyolLink.trim()
        body.trendyolLink = trimmed || null
      } else if (body.trendyolLink === '' || body.trendyolLink === undefined) {
        body.trendyolLink = null
      }
    }
    
    // setPrice işle (6'lı takım fiyatı)
    if ('setPrice' in body) {
      if (typeof body.setPrice === 'string') {
        body.setPrice = body.setPrice.trim() ? parseFloat(body.setPrice) : undefined
      } else if (body.setPrice === '' || body.setPrice === null) {
        body.setPrice = undefined
      } else if (typeof body.setPrice === 'number') {
        body.setPrice = body.setPrice > 0 ? body.setPrice : undefined
      }
    }
    
    // Konsept ürünler için storyId, chapterNumber, chapterTitle işle
    // Eğer kategori konsept değilse bu alanları temizle
    if (body.category !== 'konsept') {
      body.storyId = null
      body.chapterNumber = undefined
      body.chapterTitle = undefined
    } else {
      // Konsept ise, boş string'leri null/undefined'a çevir
      if ('storyId' in body && (body.storyId === '' || body.storyId === null)) {
        body.storyId = null
      }
      if ('chapterNumber' in body && (body.chapterNumber === '' || body.chapterNumber === null)) {
        body.chapterNumber = undefined
      }
      if ('chapterTitle' in body && (body.chapterTitle === '' || body.chapterTitle === null)) {
        body.chapterTitle = undefined
      }
    }
    
    const product = new Product(body)
    await product.save()
    
    // Populate ile hikaye bilgisini ekle
    await product.populate({
      path: 'storyId',
      model: 'Story',
      select: 'title description',
    })
    
    return successResponse(product, 'Ürün başarıyla oluşturuldu', 201)
  } catch (error: any) {
    logger.error('Error creating product:', error)
    
    // Mongoose validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err: any) => err.message)
      return validationErrorResponse(messages)
    }
    
    // MongoDB bağlantı hatası kontrolü
    if (error.name === 'MongooseServerSelectionError' || error.message?.includes('whitelist')) {
      return errorResponse(
        'Veritabanı bağlantısı kurulamadı',
        'MongoDB Atlas IP whitelist ayarlarınızı kontrol edin.',
        503
      )
    }
    
    return errorResponse(
      'Ürün oluşturulurken bir hata oluştu',
      error.message || 'Bilinmeyen bir hata oluştu',
      500
    )
  }
}

