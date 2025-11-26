/**
 * JSON dosyasından ürünleri toplu olarak içe aktarır
 * 
 * Kullanım:
 * 1. Ürün bilgilerini products.json dosyasına ekleyin
 * 2. npm run import:json komutunu çalıştırın
 */

import fs from 'fs'
import path from 'path'
import connectDB from '../lib/mongodb'
import Product from '../models/Product'

interface ProductData {
  name: string
  description: string
  category: 'klasik' | 'konsept'
  price?: number
  material: string
  dimensions?: {
    height?: number
    width?: number
    depth?: number
    unit: string
  }
  images: string[]
  collectionTags: string[]
  isActive?: boolean
}

async function importFromJSON() {
  try {
    await connectDB()
    
    const jsonPath = path.join(process.cwd(), 'scripts', 'products.json')
    
    if (!fs.existsSync(jsonPath)) {
      console.error('products.json dosyası bulunamadı:', jsonPath)
      console.log('Lütfen önce products.json dosyasını oluşturun.')
      process.exit(1)
    }
    
    const jsonData = fs.readFileSync(jsonPath, 'utf-8')
    const products: ProductData[] = JSON.parse(jsonData)
    
    console.log(`${products.length} ürün bulundu`)
    
    let imported = 0
    let skipped = 0
    let errors = 0
    
    for (const productData of products) {
      try {
        // Aynı isimde ürün var mı kontrol et
        const existing = await Product.findOne({ name: productData.name })
        
        if (existing) {
          console.log(`⚠ Ürün zaten mevcut: ${productData.name}`)
          skipped++
          continue
        }
        
        const product = new Product({
          ...productData,
          category: productData.category || 'klasik',
          isActive: productData.isActive !== undefined ? productData.isActive : true,
        })
        
        await product.save()
        imported++
        console.log(`✓ İçe aktarıldı: ${productData.name}`)
      } catch (error) {
        console.error(`✗ Hata (${productData.name}):`, error)
        errors++
      }
    }
    
    console.log(`\nİçe aktarma tamamlandı!`)
    console.log(`- İçe aktarılan: ${imported}`)
    console.log(`- Atlanan: ${skipped}`)
    console.log(`- Hatalar: ${errors}`)
    console.log(`- Toplam: ${products.length}`)
    
    process.exit(0)
  } catch (error) {
    console.error('Hata:', error)
    process.exit(1)
  }
}

importFromJSON()




