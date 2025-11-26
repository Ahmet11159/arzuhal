import { redirect } from 'next/navigation'

export default function OldStoryDetailPage({ params }: { params: { id: string } }) {
  redirect(`/konseptler/hikayeler/${params.id}`)
}
