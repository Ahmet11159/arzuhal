require('dotenv').config({ path: '.env.local' })

const mongoose = require('mongoose')
const connectDB = require('../lib/mongodb').default
const Product = require('../models/Product').default
const Story = require('../models/Story').default

async function fixTrendyolLinks() {
  try {
    await connectDB()
    console.log('✅ Veritabanına bağlandı\n')

    // Ürünlerdeki Trendyol linklerini düzelt
    console.log('📦 Ürünlerdeki Trendyol linkleri kontrol ediliyor...')
    const products = await Product.find({})
    let fixedProducts = 0

    for (const product of products) {
      let needsUpdate = false
      const updateData: any = {}

      if (product.trendyolLink) {
        const trimmed = product.trendyolLink.trim()
        if (trimmed === '' || trimmed !== product.trendyolLink) {
          updateData.trendyolLink = trimmed || undefined
          needsUpdate = true
        }
      }

      if (needsUpdate) {
        await Product.findByIdAndUpdate(product._id, updateData)
        console.log(`   ✓ ${product.name}: Trendyol linki düzeltildi`)
        fixedProducts++
      }
    }

    console.log(`✅ ${fixedProducts} ürün düzeltildi\n`)

    // Hikayelerdeki Trendyol linklerini düzelt
    console.log('📚 Hikayelerdeki Trendyol linkleri kontrol ediliyor...')
    const stories = await Story.find({})
    let fixedStories = 0

    for (const story of stories) {
      let needsUpdate = false
      const updateData: any = {}

      // fullSetTrendyolLink kontrolü
      if (story.fullSetTrendyolLink) {
        const trimmed = story.fullSetTrendyolLink.trim()
        if (trimmed === '' || trimmed !== story.fullSetTrendyolLink) {
          updateData.fullSetTrendyolLink = trimmed || undefined
          needsUpdate = true
        }
      }

      // Chapters içindeki trendyolLink kontrolü
      if (story.chapters && story.chapters.length > 0) {
        const updatedChapters = story.chapters.map((chapter: any) => {
          if (chapter.trendyolLink) {
            const trimmed = chapter.trendyolLink.trim()
            if (trimmed === '' || trimmed !== chapter.trendyolLink) {
              return { ...chapter.toObject(), trendyolLink: trimmed || undefined }
            }
          }
          return chapter.toObject()
        })

        // Değişiklik var mı kontrol et
        const hasChanges = updatedChapters.some((ch: any, idx: number) => {
          const original = story.chapters[idx]
          return ch.trendyolLink !== original.trendyolLink
        })

        if (hasChanges) {
          updateData.chapters = updatedChapters
          needsUpdate = true
        }
      }

      if (needsUpdate) {
        await Story.findByIdAndUpdate(story._id, updateData)
        console.log(`   ✓ ${story.title}: Trendyol linkleri düzeltildi`)
        fixedStories++
      }
    }

    console.log(`✅ ${fixedStories} hikaye düzeltildi\n`)

    // Özet
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📊 Özet:')
    console.log(`   • Düzeltilen ürün sayısı: ${fixedProducts}`)
    console.log(`   • Düzeltilen hikaye sayısı: ${fixedStories}`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    await mongoose.disconnect()
    console.log('\n✅ İşlem tamamlandı!')
    process.exit(0)
  } catch (error: any) {
    console.error('❌ Hata:', error)
    process.exit(1)
  }
}

fixTrendyolLinks()




