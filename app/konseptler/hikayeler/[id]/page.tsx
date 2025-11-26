import { notFound } from 'next/navigation'
import StoryReader from '@/components/stories/StoryReader'
import connectDB from '@/lib/mongodb'
import Story from '@/models/Story'

export async function generateMetadata({ params }: { params: { id: string } }) {
  await connectDB()
  const story = await Story.findById(params.id)

  if (!story) {
    return {
      title: 'Hikaye Bulunamadı - ARZUHAL',
    }
  }

  return {
    title: `${story.title} - ARZUHAL`,
    description: story.seoDescription || story.description,
    openGraph: {
      title: `${story.title} - ARZUHAL`,
      description: story.seoDescription || story.description,
      images: story.coverImage ? [story.coverImage] : [],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${story.title} - ARZUHAL`,
      description: story.seoDescription || story.description,
      images: story.coverImage ? [story.coverImage] : [],
    },
  }
}

export default async function StoryPage({ params }: { params: { id: string } }) {
  await connectDB()
  const story = await Story.findById(params.id).populate({
    path: 'chapters.productId',
    model: 'Product',
    select: 'name images description price setPrice category material dimensions collectionTags trendyolLink isActive', // setPrice ve category dahil
  })

  if (!story || !story.isActive) {
    notFound()
  }

  // Mongoose document'ini JSON'a çevir (sonsuz döngüyü önlemek için)
  const storyData = JSON.parse(JSON.stringify(story))

  return <StoryReader story={storyData} />
}
