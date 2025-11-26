import mongoose, { Schema, Document } from 'mongoose'

export interface IBusinessInfo extends Document {
  businessName: string // İşletme adı
  address: string // Tam adres
  city: string // Şehir
  district?: string // İlçe
  postalCode?: string // Posta kodu
  country: string // Ülke (varsayılan: Türkiye)
  phone?: string // Telefon
  email: string // E-posta
  googleMapsLink?: string // Google Maps linki
  appleMapsLink?: string // Apple Maps linki
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

const BusinessInfoSchema = new Schema<IBusinessInfo>(
  {
    businessName: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    district: {
      type: String,
      trim: true,
    },
    postalCode: {
      type: String,
      trim: true,
    },
    country: {
      type: String,
      default: 'Türkiye',
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
    },
    googleMapsLink: {
      type: String,
      trim: true,
    },
    appleMapsLink: {
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

// Sadece bir tane aktif işletme bilgisi olabilir
BusinessInfoSchema.index({ isActive: 1 }, { unique: true, partialFilterExpression: { isActive: true } })

// Model cache'ini temizle
if (mongoose.models.BusinessInfo) {
  delete mongoose.models.BusinessInfo
}

export default mongoose.model<IBusinessInfo>('BusinessInfo', BusinessInfoSchema)


