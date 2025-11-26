import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Story from '@/models/Story'
import { verifyToken } from '@/lib/auth'

// Chapter'ı güncelle (productId değişimi dahil)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    // Story'yi bul ve chapter'ı güncelle
    const story = await Story.findById(params.id)
    if (!story) {
      return NextResponse.json(
        { success: false, error: 'Story not found' },
        { status: 404 }
      )
    }

    const { chapterIndex, updates } = body

    if (chapterIndex === undefined || !story.chapters[chapterIndex]) {
      return NextResponse.json(
        { success: false, error: 'Chapter not found' },
        { status: 404 }
      )
    }

    // Chapter'ı güncelle
    if (updates.productId !== undefined) {
      story.chapters[chapterIndex].productId = updates.productId || null
    }

    await story.save()

    // Populate ile güncellenmiş story'yi döndür
    await story.populate({
      path: 'chapters.productId',
      model: 'Product',
      select: 'name images description price setPrice material dimensions collectionTags trendyolLink isActive',
    })

    return NextResponse.json({
      success: true,
      data: story,
    })
  } catch (error: any) {
    console.error('Error updating chapter:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update chapter',
      },
      { status: 500 }
    )
  }
}


