import mongoose, { Schema, Document } from 'mongoose'

export interface IProduct extends Document {
  name: string
  description: string
  category: string // Kategori slug (örn: 'klasik', 'konsept', 'lekeli-fincanlar')
  price?: number // Tek fincan fiyatı
  setPrice?: number // 6'lı takım fiyatı
  images: string[]
  material: string
  dimensions: {
    height?: number
    width?: number
    depth?: number
    unit: string
  }
  collectionTags: string[]
  suggestedPairings: mongoose.Types.ObjectId[]
  trendyolLink?: string
  isActive: boolean
  seoTitle?: string
  seoDescription?: string
  // Konsept ürünler için hikaye ve bölüm referansları
  storyId?: mongoose.Types.ObjectId // Hangi hikayeye ait
  chapterNumber?: number // Hangi bölüm numarası
  chapterTitle?: string // Bölüm başlığı (ör: "Gölgelerin Fısıltısı")
  createdAt: Date
  updatedAt: Date
}

const ProductSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String, required: true }, // Kategori slug
    price: { type: Number }, // Tek fincan fiyatı
    setPrice: { type: Number }, // 6'lı takım fiyatı
    images: [{ type: String }],
    material: { type: String, required: true },
    dimensions: {
      height: Number,
      width: Number,
      depth: Number,
      unit: { type: String, default: 'cm' },
    },
    collectionTags: [{ type: String }],
    suggestedPairings: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
    trendyolLink: String,
    isActive: { type: Boolean, default: true },
    seoTitle: String,
    seoDescription: String,
    // Konsept ürünler için hikaye ve bölüm referansları
    storyId: { type: Schema.Types.ObjectId, ref: 'Story' },
    chapterNumber: Number,
    chapterTitle: String, // Bölüm başlığı
  },
  {
    timestamps: true,
  }
)

// Model cache'ini temizle ve yeni şemayı kullan
if (mongoose.models.Product) {
  delete mongoose.models.Product
}

export default mongoose.model<IProduct>('Product', ProductSchema)

