import { NextRequest } from 'next/server'
import connectDB from '@/lib/mongodb'
import Category from '@/models/Category'
import { successResponse, errorResponse, unauthorizedResponse, badRequestResponse, validationErrorResponse } from '@/lib/api-response'
import { logger } from '@/lib/logger'
import { verifyAdmin } from '@/lib/auth'
import { generateSlug, validateSlug } from '@/lib/slug'

// GET - Public: Aktif kategorileri getir (admin ise tümünü)
export async function GET(request: NextRequest) {
  try {
    await connectDB()
    
    const searchParams = request.nextUrl.searchParams
    const includeInactive = searchParams.get('includeInactive') === 'true'
    
    // Admin kontrolü - admin ise pasif kategorileri de göster
    const admin = await verifyAdmin(request)
    const showInactive = admin !== null || includeInactive
    
    const query: any = {}
    if (!showInactive) {
      query.isActive = true
    }
    
    const categories = await Category.find(query).sort({ order: 1, createdAt: -1 })
    return successResponse(categories, undefined, 200, categories.length)
  } catch (error: any) {
    logger.error('Error fetching categories:', error)
    return errorResponse(
      'Kategoriler yüklenirken bir hata oluştu',
      error.message || 'Bilinmeyen bir hata oluştu',
      500
    )
  }
}

// POST - Admin only: Yeni kategori oluştur
export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request)
    if (!admin) {
      return unauthorizedResponse('Bu işlem için admin yetkisi gereklidir')
    }

    await connectDB()

    const body = await request.json()
    const { name, description, imageUrl, order, isActive } = body

    if (!name || !name.trim()) {
      return badRequestResponse('Kategori adı gereklidir')
    }

    if (name.trim().length < 2 || name.trim().length > 50) {
      return badRequestResponse('Kategori adı 2-50 karakter arasında olmalıdır')
    }

    // Slug üret
    const slug = body.slug?.trim() || generateSlug(name.trim())
    
    if (!validateSlug(slug)) {
      return badRequestResponse('Geçersiz slug formatı. Slug sadece küçük harf, rakam ve tire içerebilir.')
    }

    // Aynı slug'da kategori var mı kontrol et
    const existing = await Category.findOne({ slug })
    if (existing) {
      return badRequestResponse('Bu slug zaten kullanılıyor. Lütfen farklı bir slug girin.')
    }

    // Description validation
    if (description && description.length > 500) {
      return badRequestResponse('Açıklama en fazla 500 karakter olabilir')
    }

    const category = new Category({
      name: name.trim(),
      slug,
      description: description?.trim() || undefined,
      image: imageUrl?.trim() || undefined,
      order: order || 0,
      isActive: isActive !== undefined ? isActive : true,
    })

    await category.save()

    return successResponse(category, 'Kategori başarıyla oluşturuldu', 201)
  } catch (error: any) {
    logger.error('Error creating category:', error)
    
    if (error.code === 11000) {
      // Duplicate key error (slug)
      return badRequestResponse('Bu slug zaten kullanılıyor')
    }
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e: any) => e.message)
      return validationErrorResponse(messages)
    }

    return errorResponse(
      'Kategori oluşturulurken bir hata oluştu',
      error.message || 'Bilinmeyen bir hata oluştu',
      500
    )
  }
}



