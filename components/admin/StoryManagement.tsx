'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2 } from 'lucide-react'
import StoryForm from './StoryForm'
import { useToast } from '@/hooks/useToast'
import type { Story } from '@/types'
import { logger } from '@/lib/logger-client'

export default function StoryManagement() {
  const [stories, setStories] = useState<Story[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingStory, setEditingStory] = useState<Story | null>(null)
  const { error: showError } = useToast()

  useEffect(() => {
    fetchStories()
  }, [])

  const fetchStories = async () => {
    try {
      const res = await fetch('/api/stories')
      const data = await res.json()
      // Yeni standardize edilmiş API formatı
      if (data.success === false || data.error) {
        logger.error('API Error:', data.error)
        setStories([])
      } else {
        // Yeni format: { success: true, data: [...] } veya eski format: [...]
        setStories(data.data || data)
      }
    } catch (error) {
      logger.error('Error fetching stories:', error)
      setStories([])
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Bu hikayeyi silmek istediğinizden emin misiniz?')) return

    try {
      const token = localStorage.getItem('admin_token')
      const res = await fetch(`/api/stories/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (res.ok) {
        fetchStories()
      }
    } catch (error) {
      logger.error('Error deleting story:', error)
    }
  }

  const handleEdit = async (story: Story) => {
    try {
      // Tam story verisini çek (chapters dahil)
      const res = await fetch(`/api/stories/${story._id}`)
      if (res.ok) {
        const data = await res.json()
        // Yeni standardize edilmiş API formatı
        if (data.success === false || data.error) {
          showError(data.error || 'Hikaye yüklenirken bir hata oluştu')
        } else {
          // Yeni format: { success: true, data: {...} } veya eski format: {...}
          const fullStory = data.data || data
          setEditingStory(fullStory)
          setShowForm(true)
        }
      } else {
        showError('Hikaye yüklenirken bir hata oluştu')
      }
    } catch (error) {
      logger.error('Error fetching story:', error)
      showError('Hikaye yüklenirken bir hata oluştu')
    }
  }

  const handleFormClose = () => {
    setShowForm(false)
    setEditingStory(null)
    fetchStories()
    // Ürün listesini de yenile (fiyatlar güncellenmiş olabilir)
    // Bu sayfa ProductManagement'i içermiyor, ama window.location.reload() yapabiliriz
    // Veya daha iyi: parent component'e event gönderebiliriz
    // Şimdilik sadece stories'i yeniliyoruz
  }

  if (loading) {
    return <div className="text-center py-12">Yükleniyor...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-serif font-semibold text-charcoal-900">
          Hikaye Yönetimi
        </h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-charcoal-900 text-cream-50 rounded-lg premium-transition hover:bg-gold-500 hover:text-charcoal-900"
        >
          <Plus size={18} />
          Yeni Hikaye
        </button>
      </div>

      {showForm && (
        <StoryForm
          story={editingStory}
          onClose={handleFormClose}
          onSave={handleFormClose}
        />
      )}

      <div className="bg-white rounded-lg border border-charcoal-900/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-cream-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-charcoal-900 uppercase">
                  Başlık
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-charcoal-900 uppercase">
                  Bölüm Sayısı
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-charcoal-900 uppercase">
                  Durum
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-charcoal-900 uppercase">
                  İşlemler
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-charcoal-900/10">
              {stories.map((story) => (
                <tr key={story._id} className="hover:bg-cream-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-charcoal-900">
                      {story.title}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-charcoal-600">
                      {story.totalChapters || 0}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        story.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {story.isActive ? 'Aktif' : 'Pasif'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleEdit(story)}
                        className="text-gold-600 hover:text-gold-700"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(story._id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

