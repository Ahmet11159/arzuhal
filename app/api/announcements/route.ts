import { NextRequest } from 'next/server'
import connectDB from '@/lib/mongodb'
import Announcement from '@/models/Announcement'
import { verifyAdmin } from '@/lib/auth'
import { successResponse, errorResponse, unauthorizedResponse, badRequestResponse, validationErrorResponse } from '@/lib/api-response'
import { logger } from '@/lib/logger'

// GET - Public endpoint, returns active announcements
export async function GET(request: NextRequest) {
  try {
    await connectDB()

    const searchParams = request.nextUrl.searchParams
    const includeInactive = searchParams.get('includeInactive') === 'true'

    const now = new Date()
    const query: any = {}
    
    if (!includeInactive) {
      query.isActive = true
      query.$or = [
        { startDate: { $exists: false } },
        { startDate: { $lte: now } },
      ]
      query.$and = [
        {
          $or: [
            { endDate: { $exists: false } },
            { endDate: { $gte: now } },
          ],
        },
      ]
    }

    const announcements = await Announcement.find(query)
      .sort({ createdAt: -1 })
      .lean()

    return successResponse(announcements, undefined, 200, announcements.length)
  } catch (error: any) {
    logger.error('Error fetching announcements:', error)
    return errorResponse(
      'Duyurular yüklenirken bir hata oluştu',
      error.message || 'Bilinmeyen bir hata oluştu',
      500
    )
  }
}

// POST - Admin only, create new announcement
export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request)
    if (!admin) {
      return unauthorizedResponse('Bu işlem için admin yetkisi gereklidir')
    }

    await connectDB()

    const body = await request.json()
    const { title, message, type, link, linkText, isActive, startDate, endDate } = body

    if (!title || !message) {
      return badRequestResponse('Başlık ve mesaj alanları gereklidir')
    }

    if (endDate && startDate && new Date(endDate) < new Date(startDate)) {
      return badRequestResponse('Bitiş tarihi başlangıç tarihinden önce olamaz')
    }

    const announcement = new Announcement({
      title: title.trim(),
      message: message.trim(),
      type: type || 'info',
      link: link?.trim() || undefined,
      linkText: linkText?.trim() || undefined,
      isActive: isActive !== undefined ? isActive : true,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    })

    await announcement.save()

    return successResponse(announcement, 'Duyuru başarıyla oluşturuldu', 201)
  } catch (error: any) {
    logger.error('Error creating announcement:', error)
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e: any) => e.message)
      return validationErrorResponse(messages)
    }

    return errorResponse(
      'Duyuru oluşturulurken bir hata oluştu',
      error.message || 'Bilinmeyen bir hata oluştu',
      500
    )
  }
}

