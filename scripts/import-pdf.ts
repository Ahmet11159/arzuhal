import fs from 'fs'
import path from 'path'
import pdfParse from 'pdf-parse'
import connectDB from '../lib/mongodb'
import Product from '../models/Product'

interface ProductData {
  name: string
  description: string
  price?: number
  material?: string
  dimensions?: {
    height?: number
    width?: number
    depth?: number
    unit: string
  }
  images: string[]
  collectionTags: string[]
}

async function extractProductsFromPDF(pdfPath: string): Promise<ProductData[]> {
  const dataBuffer = fs.readFileSync(pdfPath)
  const data = await pdfParse(dataBuffer)
  
  // PDF içeriğini analiz et
  const text = data.text
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0)
  
  const products: ProductData[] = []
  let currentProduct: Partial<ProductData> | null = null
  
  // Basit parsing - PDF formatına göre özelleştirilebilir
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    
    // Ürün adı genellikle büyük harflerle veya özel formatla başlar
    // Fiyat genellikle sayısal değerlerle biter (₺ veya TL)
    const priceMatch = line.match(/(\d+[.,]\d+|\d+)\s*(₺|TL|TRY)/i)
    
    if (priceMatch) {
      // Yeni ürün bulundu
      if (currentProduct && currentProduct.name) {
        products.push({
          name: currentProduct.name,
          description: currentProduct.description || currentProduct.name,
          price: parseFloat(priceMatch[1].replace(',', '.')),
          material: currentProduct.material || 'Porselen',
          dimensions: currentProduct.dimensions || { unit: 'cm' },
          images: currentProduct.images || [],
          collectionTags: ['Klasik'],
        } as ProductData)
      }
      
      // Ürün adını bul (fiyattan önceki satırlar)
      const productName = lines[i - 1] || lines[i - 2] || 'Ürün'
      
      currentProduct = {
        name: productName,
        description: productName,
        price: parseFloat(priceMatch[1].replace(',', '.')),
        images: [],
      }
    } else if (currentProduct && !currentProduct.name) {
      // Ürün adı henüz bulunamadıysa
      if (line.length > 3 && line.length < 100) {
        currentProduct.name = line
        currentProduct.description = line
      }
    }
  }
  
  // Son ürünü ekle
  if (currentProduct && currentProduct.name) {
    products.push({
      name: currentProduct.name,
      description: currentProduct.description || currentProduct.name,
      price: currentProduct.price,
      material: currentProduct.material || 'Porselen',
      dimensions: currentProduct.dimensions || { unit: 'cm' },
      images: currentProduct.images || [],
      collectionTags: ['Klasik'],
    } as ProductData)
  }
  
  return products
}

async function importProducts() {
  try {
    await connectDB()
    
    const pdfPath = path.join(process.cwd(), 'Arzuhal Züccaciye Fiyatlı Ürün Listesi - 22.10.2025.pdf')
    
    if (!fs.existsSync(pdfPath)) {
      console.error('PDF dosyası bulunamadı:', pdfPath)
      process.exit(1)
    }
    
    console.log('PDF dosyası okunuyor...')
    const products = await extractProductsFromPDF(pdfPath)
    
    console.log(`${products.length} ürün bulundu`)
    
    // Ürünleri veritabanına ekle
    let imported = 0
    let skipped = 0
    
    for (const productData of products) {
      // Aynı isimde ürün var mı kontrol et
      const existing = await Product.findOne({ name: productData.name })
      
      if (existing) {
        console.log(`Ürün zaten mevcut: ${productData.name}`)
        skipped++
        continue
      }
      
      const product = new Product({
        ...productData,
        category: 'klasik',
        isActive: true,
      })
      
      await product.save()
      imported++
      console.log(`✓ İçe aktarıldı: ${productData.name}`)
    }
    
    console.log(`\nİçe aktarma tamamlandı!`)
    console.log(`- İçe aktarılan: ${imported}`)
    console.log(`- Atlanan: ${skipped}`)
    console.log(`- Toplam: ${products.length}`)
    
    process.exit(0)
  } catch (error) {
    console.error('Hata:', error)
    process.exit(1)
  }
}

// Script çalıştırılıyor
importProducts()




