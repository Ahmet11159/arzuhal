import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Story from '@/models/Story'

// Bir hikayenin tüm chapter'larını getir
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB()
    const story = await Story.findById(params.id).populate({
      path: 'chapters.productId',
      model: 'Product',
      select: 'name images description price setPrice material dimensions collectionTags trendyolLink isActive',
    })

    if (!story) {
      return NextResponse.json(
        { success: false, error: 'Story not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: story.chapters,
    })
  } catch (error: any) {
    console.error('Error fetching chapters:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch chapters',
      },
      { status: 500 }
    )
  }
}



