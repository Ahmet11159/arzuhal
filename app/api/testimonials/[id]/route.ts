import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Testimonial from '@/models/Testimonial'
import { verifyAdmin } from '@/lib/auth'

// GET - Public endpoint, get single testimonial
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB()

    const testimonial = await Testimonial.findById(params.id).lean()

    if (!testimonial) {
      return NextResponse.json(
        {
          success: false,
          error: 'Referans bulunamadı',
          message: 'Belirtilen ID ile bir referans bulunamadı',
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: testimonial,
    })
  } catch (error: any) {
    console.error('Error fetching testimonial:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Referans yüklenirken bir hata oluştu',
        message: error.message || 'Bilinmeyen bir hata oluştu',
      },
      { status: 500 }
    )
  }
}

// PUT - Admin only, update testimonial
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
    const { name, title, content, rating, imageUrl, order, isActive } = body

    if (rating !== undefined && (rating < 1 || rating > 5)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Geçersiz değerlendirme',
          message: 'Değerlendirme puanı 1-5 arasında olmalıdır',
        },
        { status: 400 }
      )
    }

    const testimonial = await Testimonial.findById(params.id)

    if (!testimonial) {
      return NextResponse.json(
        {
          success: false,
          error: 'Referans bulunamadı',
          message: 'Belirtilen ID ile bir referans bulunamadı',
        },
        { status: 404 }
      )
    }

    if (name !== undefined) testimonial.name = name.trim()
    if (title !== undefined) testimonial.title = title?.trim() || undefined
    if (content !== undefined) testimonial.content = content.trim()
    if (rating !== undefined) testimonial.rating = rating
    if (imageUrl !== undefined) testimonial.imageUrl = imageUrl?.trim() || undefined
    if (order !== undefined) testimonial.order = order
    if (isActive !== undefined) testimonial.isActive = isActive

    await testimonial.save()

    return NextResponse.json({
      success: true,
      data: testimonial,
      message: 'Referans başarıyla güncellendi',
    })
  } catch (error: any) {
    console.error('Error updating testimonial:', error)
    
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
        error: 'Referans güncellenirken bir hata oluştu',
        message: error.message || 'Bilinmeyen bir hata oluştu',
      },
      { status: 500 }
    )
  }
}

// DELETE - Admin only, delete testimonial
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

    const testimonial = await Testimonial.findByIdAndDelete(params.id)

    if (!testimonial) {
      return NextResponse.json(
        {
          success: false,
          error: 'Referans bulunamadı',
          message: 'Belirtilen ID ile bir referans bulunamadı',
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Referans başarıyla silindi',
    })
  } catch (error: any) {
    console.error('Error deleting testimonial:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Referans silinirken bir hata oluştu',
        message: error.message || 'Bilinmeyen bir hata oluştu',
      },
      { status: 500 }
    )
  }
}

