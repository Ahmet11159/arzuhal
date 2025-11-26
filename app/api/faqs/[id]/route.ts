import { NextRequest } from 'next/server'
import connectDB from '@/lib/mongodb'
import FAQ from '@/models/FAQ'
import { verifyAdmin } from '@/lib/auth'
import { successResponse, errorResponse, unauthorizedResponse, notFoundResponse, validationErrorResponse } from '@/lib/api-response'
import { logger } from '@/lib/logger'

// GET - Public endpoint, get single FAQ
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB()

    const faq = await FAQ.findById(params.id).lean()

    if (!faq) {
      return notFoundResponse('Belirtilen ID ile bir SSS bulunamadı')
    }

    return successResponse(faq)
  } catch (error: any) {
    logger.error('Error fetching FAQ:', error)
    return errorResponse(
      'SSS yüklenirken bir hata oluştu',
      error.message || 'Bilinmeyen bir hata oluştu',
      500
    )
  }
}

// PUT - Admin only, update FAQ
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
    const { question, answer, category, order, isActive } = body

    const faq = await FAQ.findById(params.id)

    if (!faq) {
      return notFoundResponse('Belirtilen ID ile bir SSS bulunamadı')
    }

    if (question !== undefined) faq.question = question.trim()
    if (answer !== undefined) faq.answer = answer.trim()
    if (category !== undefined) faq.category = category?.trim() || undefined
    if (order !== undefined) faq.order = order
    if (isActive !== undefined) faq.isActive = isActive

    await faq.save()

    return successResponse(faq, 'SSS başarıyla güncellendi')
  } catch (error: any) {
    logger.error('Error updating FAQ:', error)
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e: any) => e.message)
      return validationErrorResponse(messages)
    }

    return errorResponse(
      'SSS güncellenirken bir hata oluştu',
      error.message || 'Bilinmeyen bir hata oluştu',
      500
    )
  }
}

// DELETE - Admin only, delete FAQ
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

    const faq = await FAQ.findByIdAndDelete(params.id)

    if (!faq) {
      return notFoundResponse('Belirtilen ID ile bir SSS bulunamadı')
    }

    return successResponse(null, 'SSS başarıyla silindi')
  } catch (error: any) {
    logger.error('Error deleting FAQ:', error)
    return errorResponse(
      'SSS silinirken bir hata oluştu',
      error.message || 'Bilinmeyen bir hata oluştu',
      500
    )
  }
}

