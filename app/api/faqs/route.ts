import { NextRequest } from 'next/server'
import connectDB from '@/lib/mongodb'
import FAQ from '@/models/FAQ'
import { verifyAdmin } from '@/lib/auth'
import { successResponse, errorResponse, unauthorizedResponse, badRequestResponse, validationErrorResponse } from '@/lib/api-response'
import { logger } from '@/lib/logger'

// GET - Public endpoint, returns active FAQs
export async function GET(request: NextRequest) {
  try {
    await connectDB()

    const searchParams = request.nextUrl.searchParams
    const category = searchParams.get('category')
    const includeInactive = searchParams.get('includeInactive') === 'true'

    const query: any = {}
    
    if (!includeInactive) {
      query.isActive = true
    }
    
    if (category) {
      query.category = category
    }

    const faqs = await FAQ.find(query)
      .sort({ order: 1, createdAt: -1 })
      .lean()

    return successResponse(faqs, undefined, 200, faqs.length)
  } catch (error: any) {
    logger.error('Error fetching FAQs:', error)
    return errorResponse(
      'SSS\'ler yüklenirken bir hata oluştu',
      error.message || 'Bilinmeyen bir hata oluştu',
      500
    )
  }
}

// POST - Admin only, create new FAQ
export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request)
    if (!admin) {
      return unauthorizedResponse('Bu işlem için admin yetkisi gereklidir')
    }

    await connectDB()

    const body = await request.json()
    const { question, answer, category, order, isActive } = body

    if (!question || !answer) {
      return badRequestResponse('Soru ve cevap alanları gereklidir')
    }

    const faq = new FAQ({
      question: question.trim(),
      answer: answer.trim(),
      category: category?.trim() || undefined,
      order: order || 0,
      isActive: isActive !== undefined ? isActive : true,
    })

    await faq.save()

    return successResponse(faq, 'SSS başarıyla oluşturuldu', 201)
  } catch (error: any) {
    logger.error('Error creating FAQ:', error)
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e: any) => e.message)
      return validationErrorResponse(messages)
    }

    return errorResponse(
      'SSS oluşturulurken bir hata oluştu',
      error.message || 'Bilinmeyen bir hata oluştu',
      500
    )
  }
}

