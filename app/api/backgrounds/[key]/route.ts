import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import SiteImage from '@/models/SiteImage'
import { verifyToken } from '@/lib/auth'

// Belirli bir key'e göre arka plan getir
export async function GET(
  request: NextRequest,
  { params }: { params: { key: string } }
) {
  try {
    await connectDB()
    
    const background = await SiteImage.findOne({ key: params.key, location: 'background' })
    
    if (!background) {
      return NextResponse.json(
        { success: false, error: 'Background not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      data: background,
    })
  } catch (error: any) {
    console.error('Error fetching background:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch background',
        message: error.message || 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// Arka plan görselini güncelle
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
    
    const background = await SiteImage.findOne({ key: params.key, location: 'background' })
    
    if (!background) {
      return NextResponse.json(
        { success: false, error: 'Background not found' },
        { status: 404 }
      )
    }
    
    // Güncellenecek alanlar
    if (body.imageUrl !== undefined) {
      background.imageUrl = body.imageUrl.trim()
    }
    if (body.page !== undefined) {
      background.page = body.page?.trim() || undefined
    }
    if (body.section !== undefined) {
      background.section = body.section?.trim() || undefined
    }
    if (body.description !== undefined) {
      background.description = body.description?.trim() || undefined
    }
    if (body.altText !== undefined) {
      background.altText = body.altText?.trim() || undefined
    }
    if (body.isActive !== undefined) {
      background.isActive = body.isActive
    }
    
    await background.save()
    
    return NextResponse.json({
      success: true,
      data: background,
    })
  } catch (error: any) {
    console.error('Error updating background:', error)
    
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
        error: 'Failed to update background',
        message: error.message || 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// Arka plan görselini sil
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
    
    const background = await SiteImage.findOneAndDelete({ key: params.key, location: 'background' })
    
    if (!background) {
      return NextResponse.json(
        { success: false, error: 'Background not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      message: 'Background deleted successfully',
    })
  } catch (error: any) {
    console.error('Error deleting background:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete background',
        message: error.message || 'Unknown error',
      },
      { status: 500 }
    )
  }
}


