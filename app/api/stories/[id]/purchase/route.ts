import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import UserProgress from '@/models/UserProgress'
import Story from '@/models/Story'
import Product from '@/models/Product'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB()
    
    const { userId, productId, chapterNumber } = await request.json()

    // Validasyon
    if (!userId || !productId || chapterNumber === undefined || chapterNumber === null) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: userId, productId, chapterNumber' },
        { status: 400 }
      )
    }

    // Story'nin var olduğunu kontrol et
    const story = await Story.findById(params.id)
    if (!story) {
      return NextResponse.json(
        { success: false, error: 'Story not found' },
        { status: 404 }
      )
    }

    // Product'ın var olduğunu kontrol et
    const product = await Product.findById(productId)
    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      )
    }

    // Chapter number'ın geçerli olduğunu kontrol et
    if (typeof chapterNumber !== 'number' || chapterNumber < 1) {
      return NextResponse.json(
        { success: false, error: 'Invalid chapter number' },
        { status: 400 }
      )
    }

    // İlerlemeyi bul veya oluştur
    let progress = await UserProgress.findOne({
      userId,
      storyId: params.id,
    })

    if (!progress) {
      progress = new UserProgress({
        userId,
        storyId: params.id,
        purchasedProducts: [],
        unlockedChapters: [],
      })
    }

    // Ürünü satın alınanlar listesine ekle (tekrar ekleme)
    if (!progress.purchasedProducts.includes(productId)) {
      progress.purchasedProducts.push(productId)
    }

    // Bölümü açılanlar listesine ekle (tekrar ekleme)
    if (!progress.unlockedChapters.includes(chapterNumber)) {
      progress.unlockedChapters.push(chapterNumber)
      progress.unlockedChapters.sort((a: number, b: number) => a - b) // Sıralı tut
    }

    // Tüm bölümler açıldıysa tamamlama tarihini ekle
    const totalChapters = story.totalChapters || story.chapters?.length || 0
    if (totalChapters > 0 && progress.unlockedChapters.length >= totalChapters) {
      progress.completedAt = new Date()
    }

    await progress.save()

    return NextResponse.json({
      success: true,
      data: {
        unlockedChapters: progress.unlockedChapters,
        purchasedProducts: progress.purchasedProducts.map((id: any) => id.toString()),
        completedAt: progress.completedAt || null,
      },
    })
  } catch (error: any) {
    console.error('Error processing purchase:', error)
    
    // MongoDB bağlantı hatası
    if (error.name === 'MongooseServerSelectionError') {
      return NextResponse.json(
        { success: false, error: 'Database connection failed' },
        { status: 503 }
      )
    }
    
    // Validation hatası
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err: any) => err.message)
      return NextResponse.json(
        { success: false, error: messages.join(', ') },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process purchase' },
      { status: 500 }
    )
  }
}



