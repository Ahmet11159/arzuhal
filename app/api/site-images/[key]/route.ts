import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import SiteImage from '@/models/SiteImage'
import { verifyToken } from '@/lib/auth'

// Belirli bir key'e göre görsel getir
export async function GET(
  request: NextRequest,
  { params }: { params: { key: string } }
) {
  try {
    await connectDB()
    
    const siteImage = await SiteImage.findOne({ key: params.key })
    
    if (!siteImage) {
      return NextResponse.json(
        { success: false, error: 'Site image not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      data: siteImage,
    })
  } catch (error: any) {
    console.error('Error fetching site image:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch site image',
        message: error.message || 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// Site görselini güncelle
export async function PUT(
  request: NextRequest,
  { params }: { params: { key: string } }
) {
  try {
    // Admin kontrolü
    const user = verifyToken(request)
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    await connectDB()
    const body = await request.json()
    
    const siteImage = await SiteImage.findOne({ key: params.key })
    
    if (!siteImage) {
      return NextResponse.json(
        { success: false, error: 'Site image not found' },
        { status: 404 }
      )
    }
    
    // Güncellenecek alanlar
    if (body.imageUrl !== undefined) {
      siteImage.imageUrl = body.imageUrl.trim()
    }
    if (body.location !== undefined) {
      siteImage.location = body.location.trim()
    }
    if (body.description !== undefined) {
      siteImage.description = body.description?.trim() || undefined
    }
    if (body.altText !== undefined) {
      siteImage.altText = body.altText?.trim() || undefined
    }
    if (body.isActive !== undefined) {
      siteImage.isActive = body.isActive
    }
    
    await siteImage.save()
    
    return NextResponse.json({
      success: true,
      data: siteImage,
    })
  } catch (error: any) {
    console.error('Error updating site image:', error)
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err: any) => err.message)
      return NextResponse.json(
        { success: false, error: messages.join(', ') },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update site image',
        message: error.message || 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// Site görselini sil
export async function DELETE(
  request: NextRequest,
  { params }: { params: { key: string } }
) {
  try {
    // Admin kontrolü
    const user = verifyToken(request)
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    await connectDB()
    
    const siteImage = await SiteImage.findOneAndDelete({ key: params.key })
    
    if (!siteImage) {
      return NextResponse.json(
        { success: false, error: 'Site image not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      message: 'Site image deleted successfully',
    })
  } catch (error: any) {
    console.error('Error deleting site image:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete site image',
        message: error.message || 'Unknown error',
      },
      { status: 500 }
    )
  }
}
