import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import UserProgress from '@/models/UserProgress'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB()
    
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID required' },
        { status: 400 }
      )
    }

    const progress = await UserProgress.findOne({
      userId,
      storyId: params.id,
    })

    if (!progress) {
      // Yeni ilerleme oluştur
      return NextResponse.json({
        success: true,
        data: {
          unlockedChapters: [],
          purchasedProducts: [],
        },
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        unlockedChapters: progress.unlockedChapters,
        purchasedProducts: progress.purchasedProducts.map((id: any) => id.toString()),
      },
    })
  } catch (error) {
    console.error('Error fetching progress:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch progress' },
      { status: 500 }
    )
  }
}


