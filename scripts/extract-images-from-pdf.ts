/**
 * PDF'den görselleri çıkarmak için yardımcı script
 * 
 * Not: Bu script PDF'den görselleri çıkarmak için pdfjs-dist kullanır.
 * Görselleri public/uploads klasörüne kaydeder.
 */

import fs from 'fs'
import path from 'path'
import { getDocument } from 'pdfjs-dist'

async function extractImagesFromPDF() {
  const pdfPath = path.join(process.cwd(), 'Arzuhal Züccaciye Fiyatlı Ürün Listesi - 22.10.2025.pdf')
  const outputDir = path.join(process.cwd(), 'public', 'uploads', 'products')
  
  // Output dizinini oluştur
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }
  
  try {
    const data = fs.readFileSync(pdfPath)
    const pdf = await getDocument({ data }).promise
    
    console.log(`PDF yüklendi. Toplam sayfa: ${pdf.numPages}`)
    
    let imageCount = 0
    
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum)
      const operatorList = await page.getOperatorList()
      
      // Görselleri bul ve çıkar
      for (let i = 0; i < operatorList.fnArray.length; i++) {
        if (operatorList.fnArray[i] === 'Do') {
          const imageName = operatorList.argsArray[i][0]
          const image = page.objs.get(imageName)
          
          if (image) {
            const imageData = await image
            if (imageData.data) {
              const imagePath = path.join(outputDir, `page-${pageNum}-img-${imageCount}.png`)
              fs.writeFileSync(imagePath, imageData.data)
              console.log(`Görsel kaydedildi: ${imagePath}`)
              imageCount++
            }
          }
        }
      }
    }
    
    console.log(`\nToplam ${imageCount} görsel çıkarıldı.`)
  } catch (error) {
    console.error('Hata:', error)
  }
}

// extractImagesFromPDF()




