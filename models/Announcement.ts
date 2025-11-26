import mongoose, { Schema, Document } from 'mongoose'

export interface IAnnouncement extends Document {
  title: string
  message: string
  type: 'info' | 'warning' | 'success' | 'promotion'
  link?: string
  linkText?: string
  isActive: boolean
  startDate?: Date
  endDate?: Date
  createdAt: Date
  updatedAt: Date
}

const AnnouncementSchema = new Schema<IAnnouncement>(
  {
    title: {
      type: String,
      required: [true, 'Başlık gereklidir'],
      trim: true,
      maxlength: [200, 'Başlık en fazla 200 karakter olabilir'],
    },
    message: {
      type: String,
      required: [true, 'Mesaj gereklidir'],
      trim: true,
      maxlength: [500, 'Mesaj en fazla 500 karakter olabilir'],
    },
    type: {
      type: String,
      enum: {
        values: ['info', 'warning', 'success', 'promotion'],
        message: 'Tip geçerli bir değer olmalıdır (info, warning, success, promotion)',
      },
      default: 'info',
    },
    link: {
      type: String,
      trim: true,
    },
    linkText: {
      type: String,
      trim: true,
      maxlength: [50, 'Link metni en fazla 50 karakter olabilir'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
      validate: {
        validator: function (this: IAnnouncement, value: Date) {
          if (!this.startDate || !value) return true
          return value >= this.startDate
        },
        message: 'Bitiş tarihi başlangıç tarihinden önce olamaz',
      },
    },
  },
  {
    timestamps: true,
  }
)

// Index for efficient queries
AnnouncementSchema.index({ isActive: 1, startDate: 1, endDate: 1 })

// Prevent model re-compilation during development
const Announcement = mongoose.models.Announcement || mongoose.model<IAnnouncement>('Announcement', AnnouncementSchema)

export default Announcement

