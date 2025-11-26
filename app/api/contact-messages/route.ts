import { NextRequest } from 'next/server'
import connectDB from '@/lib/mongodb'
import ContactMessage from '@/models/ContactMessage'
import { verifyAdmin } from '@/lib/auth'
import { successResponse, errorResponse, unauthorizedResponse, badRequestResponse, validationErrorResponse } from '@/lib/api-response'
import { logger } from '@/lib/logger'
import { sanitizeInput } from '@/lib/utils'
import { checkRateLimit } from '@/lib/rate-limit'

// GET - Admin only, get all contact messages
export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request)
    if (!admin) {
      return unauthorizedResponse('Bu işlem için admin yetkisi gereklidir')
    }

    await connectDB()

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const tag = searchParams.get('tag')
    const limit = parseInt(searchParams.get('limit') || '50')
    const page = parseInt(searchParams.get('page') || '1')

    const query: any = {}
    if (status) {
      query.status = status
    }
    if (category) {
      query.category = category
    }
    if (tag) {
      query.tags = tag
    }
    if (search) {
      // Text search için regex kullan (MongoDB text index varsa daha iyi performans)
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
        { message: { $regex: search, $options: 'i' } },
      ]
    }

    const skip = (page - 1) * limit

    const [messages, total] = await Promise.all([
      ContactMessage.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ContactMessage.countDocuments(query),
    ])

    return successResponse({
      messages,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error: any) {
    logger.error('Error fetching contact messages:', error)
    return errorResponse(
      'Mesajlar yüklenirken bir hata oluştu',
      error.message || 'Bilinmeyen bir hata oluştu',
      500
    )
  }
}

// POST - Public endpoint, create new contact message
export async function POST(request: NextRequest) {
  try {
    await connectDB()

    const body = await request.json()
    const { name, email, phone, subject, message, category } = body

    if (!name || !email || !subject || !message) {
      return badRequestResponse('İsim, e-posta, konu ve mesaj alanları gereklidir')
    }

    // Email validation
    const emailRegex = /^\S+@\S+\.\S+$/
    if (!emailRegex.test(email)) {
      return badRequestResponse('Lütfen geçerli bir e-posta adresi giriniz')
    }

    // Input sanitization
    const sanitizedName = sanitizeInput(name.trim())
    const sanitizedSubject = sanitizeInput(subject.trim())
    const sanitizedMessage = sanitizeInput(message.trim())
    
    // Rate limiting check - IP ve email bazlı
    const clientIP = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown'
    const rateLimitKey = `contact_${clientIP}_${email.trim().toLowerCase()}`
    
    if (!checkRateLimit(rateLimitKey, 3, 5 * 60 * 1000)) {
      return badRequestResponse(
        'Çok fazla mesaj gönderdiniz. Lütfen 5 dakika sonra tekrar deneyin.'
      )
    }
    
    // Spam kontrolü - aynı mesaj içeriği kontrolü (basit)
    const recentMessages = await ContactMessage.find({
      email: email.trim().toLowerCase(),
      createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) }, // Son 1 saat
    }).limit(5)
    
    // Aynı mesaj içeriği varsa spam olabilir
    const duplicateMessage = recentMessages.find(
      msg => msg.message.trim().toLowerCase() === sanitizedMessage.toLowerCase()
    )
    if (duplicateMessage) {
      return badRequestResponse(
        'Bu mesaj daha önce gönderilmiş. Lütfen farklı bir mesaj yazın.'
      )
    }
    
    const contactMessage = new ContactMessage({
      name: sanitizedName,
      email: email.trim().toLowerCase(),
      phone: phone?.trim() || undefined,
      subject: sanitizedSubject,
      message: sanitizedMessage,
      category: category || undefined,
      status: 'pending',
    })

    await contactMessage.save()

    // Otomatik yanıt e-postası gönder (async, hata durumunda mesaj kaydı etkilenmez)
    try {
      const { sendAutoReply } = await import('@/lib/email-helper')
      await sendAutoReply(contactMessage.email, sanitizedName)
    } catch (emailError: any) {
      logger.error('Auto-reply email could not be sent:', emailError)
      // Email hatası mesaj kaydını etkilemez
    }

    return successResponse(
      contactMessage,
      'Mesajınız başarıyla gönderildi. En kısa sürede size dönüş yapacağız.',
      201
    )
  } catch (error: any) {
    logger.error('Error creating contact message:', error)
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e: any) => e.message)
      return validationErrorResponse(messages)
    }

    return errorResponse(
      'Mesaj gönderilirken bir hata oluştu',
      error.message || 'Bilinmeyen bir hata oluştu',
      500
    )
  }
}

