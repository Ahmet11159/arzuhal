import { NextRequest } from 'next/server'
import connectDB from '@/lib/mongodb'
import Product from '@/models/Product'
import { verifyToken } from '@/lib/auth'
import { successResponse, errorResponse, unauthorizedResponse, notFoundResponse, validationErrorResponse } from '@/lib/api-response'
import { logger } from '@/lib/logger'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB()
    
    const product = await Product.findById(params.id)
      .populate('suggestedPairings')
      .populate({
        path: 'storyId',
        model: 'Story',
        select: 'title description',
      })
    
    if (!product) {
      return notFoundResponse('Ürün bulunamadı')
    }
    
    // Admin kontrolü - admin ise pasif ürünleri de göster
    const user = verifyToken(request)
    const isAdmin = user && user.role === 'admin'
    
    if (!isAdmin && !product.isActive) {
      return notFoundResponse('Ürün bulunamadı')
    }
    
    return successResponse(product)
  } catch (error: any) {
    logger.error('Error fetching product:', error)
    return errorResponse(
      'Ürün yüklenirken bir hata oluştu',
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
    
    const product = await Product.findByIdAndUpdate(
      params.id,
      body,
      { new: true, runValidators: true }
    )
    
    if (!product) {
      return notFoundResponse('Ürün bulunamadı')
    }
    
    // Populate ile hikaye bilgisini ekle
    await product.populate({
      path: 'storyId',
      model: 'Story',
      select: 'title description',
    })
    
    return successResponse(product, 'Ürün başarıyla güncellendi')
  } catch (error: any) {
    logger.error('Error updating product:', error)
    
    // Mongoose validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err: any) => err.message)
      return validationErrorResponse(messages)
    }
    
    return errorResponse(
      'Ürün güncellenirken bir hata oluştu',
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
    const product = await Product.findByIdAndDelete(params.id)
    
    if (!product) {
      return notFoundResponse('Ürün bulunamadı')
    }
    
    return successResponse(null, 'Ürün başarıyla silindi')
  } catch (error: any) {
    logger.error('Error deleting product:', error)
    return errorResponse(
      'Ürün silinirken bir hata oluştu',
      error.message || 'Bilinmeyen bir hata oluştu',
      500
    )
  }
}
