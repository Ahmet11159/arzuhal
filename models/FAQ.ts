import mongoose, { Schema, Document } from 'mongoose'

export interface IFAQ extends Document {
  question: string
  answer: string
  category?: string
  order: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

const FAQSchema = new Schema<IFAQ>(
  {
    question: {
      type: String,
      required: [true, 'Soru gereklidir'],
      trim: true,
      maxlength: [500, 'Soru en fazla 500 karakter olabilir'],
    },
    answer: {
      type: String,
      required: [true, 'Cevap gereklidir'],
      trim: true,
      maxlength: [2000, 'Cevap en fazla 2000 karakter olabilir'],
    },
    category: {
      type: String,
      trim: true,
      maxlength: [100, 'Kategori en fazla 100 karakter olabilir'],
    },
    order: {
      type: Number,
      default: 0,
      min: [0, 'Sıra 0 veya daha büyük olmalıdır'],
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

// Index for efficient queries
FAQSchema.index({ isActive: 1, order: 1 })
FAQSchema.index({ category: 1, isActive: 1 })

// Prevent model re-compilation during development
const FAQ = mongoose.models.FAQ || mongoose.model<IFAQ>('FAQ', FAQSchema)

export default FAQ

