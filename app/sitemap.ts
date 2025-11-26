import { MetadataRoute } from 'next'
import connectDB from '@/lib/mongodb'
import Product from '@/models/Product'
import Story from '@/models/Story'
import Category from '@/models/Category'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connectDB()
  
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://arzuhal.com'
  
  // Statik sayfalar
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/urunler`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/konseptler`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/konseptler/hikayeler`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/konseptler/fincan-kardesligi`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/hakkimizda`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/iletisim`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/sss`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.6,
    },
  ]

  try {
    // Aktif ürünler
    const products = await Product.find({ isActive: true }).select('_id updatedAt').lean()
    const productPages: MetadataRoute.Sitemap = products.map((product) => ({
      url: `${baseUrl}/urunler/${product._id}`,
      lastModified: product.updatedAt ? new Date(product.updatedAt) : new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }))

    // Aktif hikayeler
    const stories = await Story.find({ isActive: true }).select('_id updatedAt').lean()
    const storyPages: MetadataRoute.Sitemap = stories.map((story) => ({
      url: `${baseUrl}/konseptler/hikayeler/${story._id}`,
      lastModified: story.updatedAt ? new Date(story.updatedAt) : new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }))

    // Aktif kategoriler
    const categories = await Category.find({ isActive: true }).select('slug updatedAt').lean()
    const categoryPages: MetadataRoute.Sitemap = categories.map((category) => ({
      url: `${baseUrl}/urunler?kategori=${category.slug}`,
      lastModified: category.updatedAt ? new Date(category.updatedAt) : new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }))

    return [...staticPages, ...productPages, ...storyPages, ...categoryPages]
  } catch (error) {
    console.error('Sitemap generation error:', error)
    // Hata durumunda sadece statik sayfaları döndür
    return staticPages
  }
}


