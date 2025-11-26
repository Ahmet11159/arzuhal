import { NextRequest } from 'next/server'
import connectDB from '@/lib/mongodb'
import ContactMessage from '@/models/ContactMessage'
import { verifyAdmin } from '@/lib/auth'
import { successResponse, errorResponse, unauthorizedResponse, notFoundResponse, badRequestResponse } from '@/lib/api-response'
import { logger } from '@/lib/logger'
import { sanitizeInput } from '@/lib/utils'

// POST - Admin only, send reply email to contact message
export async function POST(
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
    const { replyMessage, replySubject } = body

    if (!replyMessage || !replyMessage.trim()) {
      return badRequestResponse('Yanıt mesajı gereklidir')
    }

    const message = await ContactMessage.findById(params.id)

    if (!message) {
      return notFoundResponse('Mesaj bulunamadı')
    }

    // Sanitize reply message
    const sanitizedReply = sanitizeInput(replyMessage.trim())
    const sanitizedSubject = replySubject ? sanitizeInput(replySubject.trim()) : `Yanıt: ${message.subject}`

    // E-posta gönderme
    const { sendReplyEmail } = await import('@/lib/email-helper')
    const emailSent = await sendReplyEmail(
      message.email,
      sanitizedSubject,
      sanitizedReply,
      message.subject
    )

    // Mesaj durumunu "replied" olarak güncelle
    message.status = 'replied'
    await message.save()

    if (emailSent) {
      return successResponse(
        { sent: true },
        'Yanıt mesajı başarıyla gönderildi'
      )
    } else {
      // Email gönderilemedi ama mesaj durumu güncellendi
      logger.warn('Email could not be sent, but message status updated:', {
        messageId: params.id,
        email: message.email,
      })
      return successResponse(
        { sent: false },
        'Mesaj durumu güncellendi ancak e-posta gönderilemedi. Lütfen e-posta ayarlarını kontrol edin.'
      )
    }
  } catch (error: any) {
    logger.error('Error sending reply:', error)
    return errorResponse(
      'Yanıt gönderilirken bir hata oluştu',
      error.message || 'Bilinmeyen bir hata oluştu',
      500
    )
  }
}

