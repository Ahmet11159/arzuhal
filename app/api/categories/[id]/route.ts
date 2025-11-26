import { NextRequest } from 'next/server'
import connectDB from '@/lib/mongodb'
import Category from '@/models/Category'
import { successResponse, errorResponse, unauthorizedResponse, notFoundResponse, badRequestResponse, validationErrorResponse } from '@/lib/api-response'
import { logger } from '@/lib/logger'
import { verifyAdmin } from '@/lib/auth'
import { generateSlug, validateSlug } from '@/lib/slug'

// GET - Public: Tek kategori getir
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB()

    const category = await Category.findById(params.id)

    if (!category) {
      return notFoundResponse('Kategori bulunamadı')
    }

    return successResponse(category)
  } catch (error: any) {
    logger.error('Error fetching category:', error)
    return errorResponse(
      'Kategori yüklenirken bir hata oluştu',
      error.message || 'Bilinmeyen bir hata oluştu',
      500
    )
  }
}

// PUT - Admin only: Kategori güncelle
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await verifyAdmin(request)
    if (!admin) {
      return unauthorizedResponse('Bu işlem için admin yetkisi gereklidir')
    }

    await connectDB()

    const body = await request.json()
    const { name, slug, description, imageUrl, order, isActive } = body

    const category = await Category.findById(params.id)

    if (!category) {
      return notFoundResponse('Kategori bulunamadı')
    }

    // Name validation
    if (name !== undefined) {
      if (!name || !name.trim()) {
        return badRequestResponse('Kategori adı gereklidir')
      }
      if (name.trim().length < 2 || name.trim().length > 50) {
        return badRequestResponse('Kategori adı 2-50 karakter arasında olmalıdır')
      }
      category.name = name.trim()
    }

    // Slug validation
    if (slug !== undefined) {
      const newSlug = slug.trim() || generateSlug(category.name)
      
      if (!validateSlug(newSlug)) {
        return badRequestResponse('Geçersiz slug formatı. Slug sadece küçük harf, rakam ve tire içerebilir.')
      }

      // Aynı slug'da başka kategori var mı kontrol et (kendisi hariç)
      const existing = await Category.findOne({ slug: newSlug, _id: { $ne: params.id } })
      if (existing) {
        return badRequestResponse('Bu slug zaten kullanılıyor. Lütfen farklı bir slug girin.')
      }

      category.slug = newSlug
    }

    // Description validation
    if (description !== undefined) {
      if (description && description.length > 500) {
        return badRequestResponse('Açıklama en fazla 500 karakter olabilir')
      }
      category.description = description?.trim() || undefined
    }

    // Image
    if (imageUrl !== undefined) {
      category.image = imageUrl?.trim() || undefined
    }

    // Order
    if (order !== undefined) {
      category.order = order || 0
    }

    // isActive
    if (isActive !== undefined) {
      category.isActive = isActive
    }

    await category.save()

    return successResponse(category, 'Kategori başarıyla güncellendi')
  } catch (error: any) {
    logger.error('Error updating category:', error)
    
    if (error.code === 11000) {
      return badRequestResponse('Bu slug zaten kullanılıyor')
    }
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e: any) => e.message)
      return validationErrorResponse(messages)
    }

    return errorResponse(
      'Kategori güncellenirken bir hata oluştu',
      error.message || 'Bilinmeyen bir hata oluştu',
      500
    )
  }
}

// DELETE - Admin only: Kategori sil
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await verifyAdmin(request)
    if (!admin) {
      return unauthorizedResponse('Bu işlem için admin yetkisi gereklidir')
    }

    await connectDB()

    const category = await Category.findById(params.id)

    if (!category) {
      return notFoundResponse('Kategori bulunamadı')
    }

    // Kategoriye bağlı ürün var mı kontrol et
    const Product = (await import('@/models/Product')).default
    const productCount = await Product.countDocuments({ category: category.slug })
    
    if (productCount > 0) {
      return badRequestResponse(
        `Bu kategori silinemez. ${productCount} ürün bu kategoriye bağlı. Önce ürünleri başka bir kategoriye taşıyın veya silin.`
      )
    }

    await Category.findByIdAndDelete(params.id)

    return successResponse(null, 'Kategori başarıyla silindi')
  } catch (error: any) {
    logger.error('Error deleting category:', error)
    return errorResponse(
      'Kategori silinirken bir hata oluştu',
      error.message || 'Bilinmeyen bir hata oluştu',
      500
    )
  }
}


