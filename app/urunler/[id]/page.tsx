import { notFound } from 'next/navigation'
import ProductDetail from '@/components/products/ProductDetail'
import connectDB from '@/lib/mongodb'
import Product from '@/models/Product'
// Story modelini import et - populate için gerekli (model kaydı için)
import '@/models/Story'

export async function generateMetadata({ params }: { params: { id: string } }) {
  await connectDB()
  const product = await Product.findById(params.id)

  if (!product) {
    return {
      title: 'Ürün Bulunamadı - ARZUHAL',
    }
  }

  return {
    title: `${product.name} - ARZUHAL`,
    description: product.seoDescription || product.description,
    openGraph: {
      title: `${product.name} - ARZUHAL`,
      description: product.seoDescription || product.description,
      images: product.images && product.images.length > 0 ? [product.images[0]] : [],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${product.name} - ARZUHAL`,
      description: product.seoDescription || product.description,
      images: product.images && product.images.length > 0 ? [product.images[0]] : [],
    },
  }
}

export default async function ProductPage({ params }: { params: { id: string } }) {
  await connectDB()
  const product = await Product.findById(params.id)
    .populate('suggestedPairings')
    .populate({
      path: 'storyId',
      model: 'Story',
      select: 'title description',
    })

  if (!product || !product.isActive) {
    notFound()
  }

  // Mongoose document'ini JSON'a çevir
  const productData = JSON.parse(JSON.stringify(product))

  return <ProductDetail product={productData} />
}


