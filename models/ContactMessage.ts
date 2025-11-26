import mongoose, { Schema, Document } from 'mongoose'

export interface IContactMessage extends Document {
  name: string
  email: string
  phone?: string
  subject: string
  message: string
  category?: 'soru' | 'oneri' | 'destek' | 'siparis' | 'sikayet'
  tags?: string[] // Etiketler: 'acil', 'onemsiz', 'satis', 'destek', 'sikayet'
  status: 'pending' | 'read' | 'replied' | 'archived'
  adminNotes?: string
  createdAt: Date
  updatedAt: Date
}

const ContactMessageSchema = new Schema<IContactMessage>(
  {
    name: {
      type: String,
      required: [true, 'İsim gereklidir'],
      trim: true,
      maxlength: [100, 'İsim en fazla 100 karakter olabilir'],
    },
    email: {
      type: String,
      required: [true, 'E-posta gereklidir'],
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Geçerli bir e-posta adresi giriniz'],
    },
    phone: {
      type: String,
      trim: true,
      maxlength: [20, 'Telefon en fazla 20 karakter olabilir'],
    },
    subject: {
      type: String,
      required: [true, 'Konu gereklidir'],
      trim: true,
      maxlength: [200, 'Konu en fazla 200 karakter olabilir'],
    },
    message: {
      type: String,
      required: [true, 'Mesaj gereklidir'],
      trim: true,
      maxlength: [2000, 'Mesaj en fazla 2000 karakter olabilir'],
    },
    category: {
      type: String,
      enum: {
        values: ['soru', 'oneri', 'destek', 'siparis', 'sikayet'],
        message: 'Kategori geçerli bir değer olmalıdır',
      },
      trim: true,
    },
    tags: {
      type: [String],
      default: [],
      validate: {
        validator: function(tags: string[]) {
          const validTags = ['acil', 'onemsiz', 'satis', 'destek', 'sikayet']
          return tags.every(tag => validTags.includes(tag))
        },
        message: 'Etiketler geçerli değerler olmalıdır',
      },
    },
    status: {
      type: String,
      enum: {
        values: ['pending', 'read', 'replied', 'archived'],
        message: 'Durum geçerli bir değer olmalıdır',
      },
      default: 'pending',
    },
    adminNotes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Notlar en fazla 1000 karakter olabilir'],
    },
  },
  {
    timestamps: true,
  }
)

// Index for efficient queries
ContactMessageSchema.index({ status: 1, createdAt: -1 })
ContactMessageSchema.index({ email: 1 })
ContactMessageSchema.index({ category: 1 })
ContactMessageSchema.index({ tags: 1 })
ContactMessageSchema.index({ subject: 'text', message: 'text', name: 'text' }) // Text search index

// Prevent model re-compilation during development
const ContactMessage = mongoose.models.ContactMessage || mongoose.model<IContactMessage>('ContactMessage', ContactMessageSchema)

export default ContactMessage

