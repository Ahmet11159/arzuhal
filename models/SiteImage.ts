import mongoose, { Schema, Document } from 'mongoose'

export interface ISiteImage extends Document {
  key: string // Benzersiz anahtar (örn: 'concept-hikaye-kapak', 'concept-fincan-kardesligi-kapak')
  imageUrl: string // Görsel URL'i (local veya external)
  location: string // Görselin kullanıldığı yer (örn: 'concepts-page', 'landing-hero', 'about-section', 'background')
  page?: string // Sayfa adı (background için: 'home', 'about', 'contact', vb.)
  section?: string // Bölüm adı (background için: 'hero', 'brand-message', 'categories', 'concepts', vb.)
  description?: string // Açıklama
  altText?: string // SEO için alt text
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

const SiteImageSchema = new Schema<ISiteImage>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    imageUrl: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    page: {
      type: String,
      trim: true,
      index: true,
    },
    section: {
      type: String,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
    },
    altText: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
)

// Model cache'ini temizle
if (mongoose.models.SiteImage) {
  delete mongoose.models.SiteImage
}

export default mongoose.model<ISiteImage>('SiteImage', SiteImageSchema)
