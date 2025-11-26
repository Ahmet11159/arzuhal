import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Product from '@/models/Product'
import { verifyToken } from '@/lib/auth'

/**
 * PDF'den ürün içe aktarma endpoint'i
 * 
 * Bu endpoint, admin panelinden PDF dosyası yüklenmesi ve
 * ürünlerin otomatik olarak içe aktarılması için kullanılabilir.
 * 
 * Şimdilik manuel import scripti kullanılacak.
 */
export async function POST(request: NextRequest) {
  try {
    // Auth kontrolü
    const user = verifyToken(request)
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Yetkisiz erişim' },
        { status: 401 }
      )
    }

    await connectDB()
    
    // Form data'dan PDF dosyasını al
    const formData = await request.formData()
    const file = formData.get('pdf') as File
    
    if (!file) {
      return NextResponse.json(
        { error: 'PDF dosyası gerekli' },
        { status: 400 }
      )
    }
    
    // PDF'i parse et ve ürünleri çıkar
    // Bu kısım daha sonra geliştirilebilir
    
    return NextResponse.json({ 
      message: 'PDF içe aktarma özelliği yakında eklenecek. Şimdilik manuel import scripti kullanın.',
      script: 'npm run import:pdf'
    })
  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json(
      { error: 'İçe aktarma sırasında bir hata oluştu' },
      { status: 500 }
    )
  }
}




