import mongoose, { Schema, Document } from 'mongoose'

export interface IStoryChapter {
  chapterNumber: number
  title: string
  content: string
  productId: mongoose.Types.ObjectId // Bu bölümle ilgili fincan
  image?: string
  trendyolLink?: string // Bu bölümün fincanı için Trendyol linki
}

export interface IStory extends Document {
  title: string
  description: string
  introContent: string // İlk açılışta gösterilecek içerik
  coverImage: string
  chapters: IStoryChapter[] // Hikaye bölümleri
  totalChapters: number // Toplam bölüm sayısı
  fullSetTrendyolLink?: string // Tüm hikaye takımı için Trendyol linki (6 bölüm + 1 hediye fincan)
  fullSetPrice?: number // Tüm hikaye takımı fiyatı (6 bölüm + 1 hediye fincan = 7 fincan)
  isActive: boolean
  seoTitle?: string
  seoDescription?: string
  createdAt: Date
  updatedAt: Date
}

const StoryChapterSchema = new Schema<IStoryChapter>({
  chapterNumber: { type: Number, required: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: false }, // Yeni ürün oluşturulurken geçici olarak null olabilir
  image: String,
  trendyolLink: String, // Bu bölümün fincanı için Trendyol linki
})

const StorySchema = new Schema<IStory>(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    introContent: { type: String, required: true }, // İlk bölüm - ücretsiz
    coverImage: { type: String, required: true },
    chapters: [StoryChapterSchema],
    totalChapters: { type: Number, default: 0 },
    fullSetTrendyolLink: String, // Tüm hikaye takımı için Trendyol linki
    fullSetPrice: Number, // Tüm hikaye takımı fiyatı (6 bölüm + 1 hediye fincan = 7 fincan)
    isActive: { type: Boolean, default: true },
    seoTitle: String,
    seoDescription: String,
  },
  {
    timestamps: true,
  }
)

// Toplam bölüm sayısını otomatik hesapla
StorySchema.pre('save', function (next) {
  if (this.chapters && this.chapters.length > 0) {
    this.totalChapters = this.chapters.length
  }
  next()
})

// Model cache'ini temizle ve yeni şemayı kullan
if (mongoose.models.Story) {
  delete mongoose.models.Story
}

export default mongoose.model<IStory>('Story', StorySchema)

