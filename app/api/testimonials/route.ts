import { NextRequest } from 'next/server'
import connectDB from '@/lib/mongodb'
import Testimonial from '@/models/Testimonial'
import { verifyAdmin } from '@/lib/auth'
import { successResponse, errorResponse, unauthorizedResponse, badRequestResponse, validationErrorResponse } from '@/lib/api-response'
import { logger } from '@/lib/logger'

// GET - Public endpoint, returns active testimonials
export async function GET(request: NextRequest) {
  try {
    await connectDB()

    const searchParams = request.nextUrl.searchParams
    const includeInactive = searchParams.get('includeInactive') === 'true'

    const query: any = {}
    
    if (!includeInactive) {
      query.isActive = true
    }

    const testimonials = await Testimonial.find(query)
      .sort({ order: 1, createdAt: -1 })
      .lean()

    return successResponse(testimonials, undefined, 200, testimonials.length)
  } catch (error: any) {
    logger.error('Error fetching testimonials:', error)
    return errorResponse(
      'Referanslar yüklenirken bir hata oluştu',
      error.message || 'Bilinmeyen bir hata oluştu',
      500
    )
  }
}

// POST - Admin only, create new testimonial
export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request)
    if (!admin) {
      return unauthorizedResponse('Bu işlem için admin yetkisi gereklidir')
    }

    await connectDB()

    const body = await request.json()
    const { name, title, content, rating, imageUrl, order, isActive } = body

    if (!name || !content || !rating) {
      return badRequestResponse('İsim, içerik ve değerlendirme puanı gereklidir')
    }

    if (rating < 1 || rating > 5) {
      return badRequestResponse('Değerlendirme puanı 1-5 arasında olmalıdır')
    }

    const testimonial = new Testimonial({
      name: name.trim(),
      title: title?.trim() || undefined,
      content: content.trim(),
      rating: rating,
      imageUrl: imageUrl?.trim() || undefined,
      order: order || 0,
      isActive: isActive !== undefined ? isActive : true,
    })

    await testimonial.save()

    return successResponse(testimonial, 'Referans başarıyla oluşturuldu', 201)
  } catch (error: any) {
    logger.error('Error creating testimonial:', error)
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e: any) => e.message)
      return validationErrorResponse(messages)
    }

    return errorResponse(
      'Referans oluşturulurken bir hata oluştu',
      error.message || 'Bilinmeyen bir hata oluştu',
      500
    )
  }
}

