import mongoose, { Schema, Document } from 'mongoose'

export interface ITestimonial extends Document {
  name: string
  title?: string
  content: string
  rating: number
  imageUrl?: string
  isActive: boolean
  order: number
  createdAt: Date
  updatedAt: Date
}

const TestimonialSchema = new Schema<ITestimonial>(
  {
    name: {
      type: String,
      required: [true, 'İsim gereklidir'],
      trim: true,
      maxlength: [100, 'İsim en fazla 100 karakter olabilir'],
    },
    title: {
      type: String,
      trim: true,
      maxlength: [200, 'Başlık en fazla 200 karakter olabilir'],
    },
    content: {
      type: String,
      required: [true, 'İçerik gereklidir'],
      trim: true,
      maxlength: [1000, 'İçerik en fazla 1000 karakter olabilir'],
    },
    rating: {
      type: Number,
      required: [true, 'Değerlendirme puanı gereklidir'],
      min: [1, 'Değerlendirme en az 1 olmalıdır'],
      max: [5, 'Değerlendirme en fazla 5 olmalıdır'],
    },
    imageUrl: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    order: {
      type: Number,
      default: 0,
      min: [0, 'Sıra 0 veya daha büyük olmalıdır'],
    },
  },
  {
    timestamps: true,
  }
)

// Index for efficient queries
TestimonialSchema.index({ isActive: 1, order: 1 })

// Prevent model re-compilation during development
const Testimonial = mongoose.models.Testimonial || mongoose.model<ITestimonial>('Testimonial', TestimonialSchema)

export default Testimonial

