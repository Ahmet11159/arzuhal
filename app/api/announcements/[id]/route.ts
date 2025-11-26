import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Announcement from '@/models/Announcement'
import { verifyAdmin } from '@/lib/auth'

// GET - Public endpoint, get single announcement
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB()

    const announcement = await Announcement.findById(params.id).lean()

    if (!announcement) {
      return NextResponse.json(
        {
          success: false,
          error: 'Duyuru bulunamadı',
          message: 'Belirtilen ID ile bir duyuru bulunamadı',
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: announcement,
    })
  } catch (error: any) {
    console.error('Error fetching announcement:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Duyuru yüklenirken bir hata oluştu',
        message: error.message || 'Bilinmeyen bir hata oluştu',
      },
      { status: 500 }
    )
  }
}

// PUT - Admin only, update announcement
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await verifyAdmin(request)
    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          error: 'Yetkisiz erişim',
          message: 'Bu işlem için admin yetkisi gereklidir',
        },
        { status: 401 }
      )
    }

    await connectDB()

    const body = await request.json()
    const { title, message, type, link, linkText, isActive, startDate, endDate } = body

    if (endDate && startDate && new Date(endDate) < new Date(startDate)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Geçersiz tarih',
          message: 'Bitiş tarihi başlangıç tarihinden önce olamaz',
        },
        { status: 400 }
      )
    }

    const announcement = await Announcement.findById(params.id)

    if (!announcement) {
      return NextResponse.json(
        {
          success: false,
          error: 'Duyuru bulunamadı',
          message: 'Belirtilen ID ile bir duyuru bulunamadı',
        },
        { status: 404 }
      )
    }

    if (title !== undefined) announcement.title = title.trim()
    if (message !== undefined) announcement.message = message.trim()
    if (type !== undefined) announcement.type = type
    if (link !== undefined) announcement.link = link?.trim() || undefined
    if (linkText !== undefined) announcement.linkText = linkText?.trim() || undefined
    if (isActive !== undefined) announcement.isActive = isActive
    if (startDate !== undefined) announcement.startDate = startDate ? new Date(startDate) : undefined
    if (endDate !== undefined) announcement.endDate = endDate ? new Date(endDate) : undefined

    await announcement.save()

    return NextResponse.json({
      success: true,
      data: announcement,
      message: 'Duyuru başarıyla güncellendi',
    })
  } catch (error: any) {
    console.error('Error updating announcement:', error)
    
    if (error.name === 'ValidationError') {
      return NextResponse.json(
        {
          success: false,
          error: 'Doğrulama hatası',
          message: Object.values(error.errors).map((e: any) => e.message).join(', '),
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Duyuru güncellenirken bir hata oluştu',
        message: error.message || 'Bilinmeyen bir hata oluştu',
      },
      { status: 500 }
    )
  }
}

// DELETE - Admin only, delete announcement
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await verifyAdmin(request)
    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          error: 'Yetkisiz erişim',
          message: 'Bu işlem için admin yetkisi gereklidir',
        },
        { status: 401 }
      )
    }

    await connectDB()

    const announcement = await Announcement.findByIdAndDelete(params.id)

    if (!announcement) {
      return NextResponse.json(
        {
          success: false,
          error: 'Duyuru bulunamadı',
          message: 'Belirtilen ID ile bir duyuru bulunamadı',
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Duyuru başarıyla silindi',
    })
  } catch (error: any) {
    console.error('Error deleting announcement:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Duyuru silinirken bir hata oluştu',
        message: error.message || 'Bilinmeyen bir hata oluştu',
      },
      { status: 500 }
    )
  }
}

