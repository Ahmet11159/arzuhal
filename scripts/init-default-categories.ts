/**
 * Varsayılan kategorileri oluştur
 * "Klasik" ve "Konsept" kategorilerini veritabanına ekler
 */

import mongoose from 'mongoose'
import Category from '../models/Category'
import connectDB from '../lib/mongodb'

async function initDefaultCategories() {
  try {
    await connectDB()

    const defaultCategories = [
      {
        name: 'Klasik',
        slug: 'klasik',
        description: 'Klasik Türk kahve fincanları',
        isActive: true,
        order: 0,
      },
      {
        name: 'Konsept',
        slug: 'konsept',
        description: 'Hikaye konseptli fincanlar',
        isActive: true,
        order: 1,
      },
    ]

    for (const categoryData of defaultCategories) {
      const existing = await Category.findOne({ slug: categoryData.slug })
      
      if (!existing) {
        const category = new Category(categoryData)
        await category.save()
        console.log(`✅ Kategori oluşturuldu: ${categoryData.name}`)
      } else {
        console.log(`ℹ️  Kategori zaten mevcut: ${categoryData.name}`)
      }
    }

    console.log('✅ Varsayılan kategoriler kontrol edildi')
    process.exit(0)
  } catch (error) {
    console.error('❌ Hata:', error)
    process.exit(1)
  }
}

initDefaultCategories()


