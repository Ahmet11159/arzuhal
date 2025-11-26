import mongoose, { Schema, Document } from 'mongoose'

export interface IUserProgress extends Document {
  userId: string // E-posta veya session ID
  storyId: mongoose.Types.ObjectId
  purchasedProducts: mongoose.Types.ObjectId[] // Satın alınan fincanlar
  unlockedChapters: number[] // Açılan bölüm numaraları
  completedAt?: Date // Hikayeyi tamamlama tarihi
  createdAt: Date
  updatedAt: Date
}

const UserProgressSchema = new Schema<IUserProgress>(
  {
    userId: { type: String, required: true },
    storyId: { type: Schema.Types.ObjectId, ref: 'Story', required: true },
    purchasedProducts: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
    unlockedChapters: [{ type: Number }],
    completedAt: Date,
  },
  {
    timestamps: true,
  }
)

// Kullanıcı ve hikaye kombinasyonu için unique index
UserProgressSchema.index({ userId: 1, storyId: 1 }, { unique: true })

export default mongoose.models.UserProgress || mongoose.model<IUserProgress>('UserProgress', UserProgressSchema)




