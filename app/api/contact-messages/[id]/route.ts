import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import ContactMessage from '@/models/ContactMessage'
import { verifyAdmin } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { successResponse, errorResponse, unauthorizedResponse, notFoundResponse, badRequestResponse, validationErrorResponse } from '@/lib/api-response'

// GET - Admin only, get single contact message
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await verifyAdmin(request)
    if (!admin) {
      return unauthorizedResponse('Bu işlem için admin yetkisi gereklidir')
    }

    await connectDB()

    const message = await ContactMessage.findById(params.id).lean()

    if (!message) {
      return notFoundResponse('Belirtilen ID ile bir mesaj bulunamadı')
    }

    return successResponse(message)
  } catch (error: any) {
    logger.error('Error fetching contact message:', error)
    return errorResponse(
      'Mesaj yüklenirken bir hata oluştu',
      error.message || 'Bilinmeyen bir hata oluştu',
      500
    )
  }
}

// PUT - Admin only, update contact message (status, notes)
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
    const { status, adminNotes, tags } = body

    const message = await ContactMessage.findById(params.id)

    if (!message) {
      return notFoundResponse('Belirtilen ID ile bir mesaj bulunamadı')
    }

    if (status !== undefined) {
      const validStatuses = ['pending', 'read', 'replied', 'archived']
      if (!validStatuses.includes(status)) {
        return badRequestResponse('Durum geçerli bir değer olmalıdır')
      }
      message.status = status
    }

    if (adminNotes !== undefined) {
      message.adminNotes = adminNotes.trim() || undefined
    }

    if (tags !== undefined) {
      // Etiketleri validate et
      const validTags = ['acil', 'onemsiz', 'satis', 'destek', 'sikayet']
      if (Array.isArray(tags)) {
        message.tags = tags.filter(tag => validTags.includes(tag))
      } else {
        message.tags = []
      }
    }

    await message.save()

    return successResponse(message, 'Mesaj başarıyla güncellendi')
  } catch (error: any) {
    logger.error('Error updating contact message:', error)
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e: any) => e.message)
      return validationErrorResponse(messages)
    }

    return errorResponse(
      'Mesaj güncellenirken bir hata oluştu',
      error.message || 'Bilinmeyen bir hata oluştu',
      500
    )
  }
}

// DELETE - Admin only, delete contact message
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

    const message = await ContactMessage.findByIdAndDelete(params.id)

    if (!message) {
      return notFoundResponse('Belirtilen ID ile bir mesaj bulunamadı')
    }

    return successResponse(null, 'Mesaj başarıyla silindi', 200)
  } catch (error: any) {
    logger.error('Error deleting contact message:', error)
    return errorResponse(
      'Mesaj silinirken bir hata oluştu',
      error.message || 'Bilinmeyen bir hata oluştu',
      500
    )
  }
}

