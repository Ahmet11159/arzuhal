import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Product from '@/models/Product'
import { verifyToken } from '@/lib/auth'

// Duplicate ürünleri temizle (sadece admin)
export async function POST(request: NextRequest) {
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

    // Tüm ürünleri al
    const allProducts = await Product.find({}).lean()
    
    // İki farklı duplicate kontrolü:
    // 1. Tam eşleşme: isim + storyId + chapterNumber (konsept) veya isim + kategori (klasik)
    // 2. Sadece isim bazında (konsept ürünler için - aynı isimde birden fazla varsa)
    
    const productMap = new Map<string, any[]>()
    const nameOnlyMap = new Map<string, any[]>() // Sadece isim bazında (konsept ürünler için)
    
    allProducts.forEach((product: any) => {
      // İsmi normalize et (trim, lowercase, boşlukları temizle)
      const normalizedName = (product.name || '').trim().toLowerCase().replace(/\s+/g, ' ')
      
      // Tam eşleşme için key
      const storyId = product.storyId ? product.storyId.toString() : 'no-story'
      const chapterNumber = product.chapterNumber || 'no-chapter'
      const key = product.category === 'konsept' 
        ? `${normalizedName}_${storyId}_${chapterNumber}`
        : `${normalizedName}_${product.category || 'klasik'}`
      
      if (!productMap.has(key)) {
        productMap.set(key, [])
      }
      productMap.get(key)!.push(product)
      
      // Konsept ürünler için sadece isim bazında da kontrol et
      if (product.category === 'konsept') {
        const nameKey = `${normalizedName}_konsept`
        if (!nameOnlyMap.has(nameKey)) {
          nameOnlyMap.set(nameKey, [])
        }
        nameOnlyMap.get(nameKey)!.push(product)
      }
    })

    // Duplicate'leri bul ve sil
    let deletedCount = 0
    const deletedIds: string[] = []
    const duplicateGroups: Array<{ name: string; count: number; kept: string; deleted: string[] }> = []
    const processedIds = new Set<string>() // Zaten işlenmiş ID'leri takip et

    // Önce tam eşleşme duplicate'lerini temizle
    for (const [key, products] of productMap.entries()) {
      if (products.length > 1) {
        // En eski olanı tut, diğerlerini sil
        const sorted = products.sort((a, b) => {
          const aDate = a.createdAt ? new Date(a.createdAt) : new Date(0)
          const bDate = b.createdAt ? new Date(b.createdAt) : new Date(0)
          return aDate.getTime() - bDate.getTime()
        })

        const kept = sorted[0]._id.toString()
        const deleted: string[] = []

        // İlkini tut, diğerlerini sil
        for (let i = 1; i < sorted.length; i++) {
          const id = sorted[i]._id.toString()
          if (!processedIds.has(id)) {
            await Product.findByIdAndDelete(sorted[i]._id)
            deletedIds.push(id)
            deleted.push(id)
            deletedCount++
            processedIds.add(id)
          }
        }

        if (deleted.length > 0) {
          duplicateGroups.push({
            name: sorted[0].name,
            count: sorted.length,
            kept,
            deleted,
          })
        }
      }
    }

    // Konsept ürünler için sadece isim bazında duplicate kontrolü
    // (Aynı isimde ama farklı storyId/chapterNumber'a sahip olanlar)
    for (const [nameKey, products] of nameOnlyMap.entries()) {
      if (products.length > 1) {
        // Zaten işlenmemiş olanları kontrol et
        const unprocessed = products.filter(p => !processedIds.has(p._id.toString()))
        
        if (unprocessed.length > 1) {
          // En eski olanı tut, diğerlerini sil
          const sorted = unprocessed.sort((a, b) => {
            const aDate = a.createdAt ? new Date(a.createdAt) : new Date(0)
            const bDate = b.createdAt ? new Date(b.createdAt) : new Date(0)
            return aDate.getTime() - bDate.getTime()
          })

          const kept = sorted[0]._id.toString()
          const deleted: string[] = []

          // İlkini tut, diğerlerini sil
          for (let i = 1; i < sorted.length; i++) {
            const id = sorted[i]._id.toString()
            if (!processedIds.has(id)) {
              await Product.findByIdAndDelete(sorted[i]._id)
              deletedIds.push(id)
              deleted.push(id)
              deletedCount++
              processedIds.add(id)
            }
          }

          if (deleted.length > 0) {
            duplicateGroups.push({
              name: sorted[0].name,
              count: sorted.length,
              kept,
              deleted,
            })
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `${deletedCount} duplicate ürün silindi`,
      deletedCount,
      deletedIds,
      duplicateGroups,
    })
  } catch (error: any) {
    console.error('Error cleaning up duplicates:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to cleanup duplicates',
      },
      { status: 500 }
    )
  }
}

