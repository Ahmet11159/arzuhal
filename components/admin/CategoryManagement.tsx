'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Edit2, Trash2, Loader2, X, CheckCircle2, Package } from 'lucide-react'
import { useToast } from '@/hooks/useToast'
import type { Category } from '@/types'
import { logger } from '@/lib/logger-client'
import { generateSlug } from '@/lib/slug'

const categorySchema = z.object({
  name: z.string().min(2, 'Kategori adı en az 2 karakter olmalıdır').max(50, 'Kategori adı en fazla 50 karakter olabilir'),
  slug: z.string().min(2, 'Slug en az 2 karakter olmalıdır').max(50, 'Slug en fazla 50 karakter olabilir').regex(/^[a-z0-9-]+$/, 'Slug sadece küçük harf, rakam ve tire içerebilir'),
  description: z.string().max(500, 'Açıklama en fazla 500 karakter olabilir').optional(),
  imageUrl: z.union([
    z.string().url('Geçerli bir URL giriniz'),
    z.literal(''),
    z.undefined(),
  ]).optional(),
  order: z.number().min(0, 'Sıra 0 veya daha büyük olmalıdır').default(0),
  isActive: z.boolean().default(true),
})

type CategoryFormData = z.infer<typeof categorySchema>

interface CategoryWithCount extends Category {
  productCount?: number
}

export default function CategoryManagement() {
  const [categories, setCategories] = useState<CategoryWithCount[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const { success, error: showError } = useToast()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch,
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
      slug: '',
      description: '',
      imageUrl: '',
      order: 0,
      isActive: true,
    },
  })

  const watchedName = watch('name')

  // Name değiştiğinde slug'ı otomatik üret (sadece slug boşsa veya yeni kategori ekleniyorsa)
  useEffect(() => {
    if (watchedName && !editingCategory) {
      const autoSlug = generateSlug(watchedName)
      setValue('slug', autoSlug)
    }
  }, [watchedName, editingCategory, setValue])

  useEffect(() => {
    fetchCategories()
    // İlk yüklemede varsayılan kategorileri kontrol et
    checkDefaultCategories()
  }, [])

  const checkDefaultCategories = async () => {
    try {
      const token = localStorage.getItem('admin_token')
      if (!token) return

      // Varsayılan kategorileri kontrol et ve yoksa oluştur
      const res = await fetch('/api/categories?includeInactive=true', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const data = await res.json()
      
      if (data.success) {
        const categories = data.data || []
        const hasKlasik = categories.some((cat: Category) => cat.slug === 'klasik')
        const hasKonsept = categories.some((cat: Category) => cat.slug === 'konsept')

        // Varsayılan kategorileri oluştur
        const defaultCategories = []
        if (!hasKlasik) {
          defaultCategories.push({
            name: 'Klasik',
            slug: 'klasik',
            description: 'Klasik Türk kahve fincanları',
            isActive: true,
            order: 0,
          })
        }
        if (!hasKonsept) {
          defaultCategories.push({
            name: 'Konsept',
            slug: 'konsept',
            description: 'Hikaye konseptli fincanlar',
            isActive: true,
            order: 1,
          })
        }

        // Varsayılan kategorileri oluştur
        for (const catData of defaultCategories) {
          try {
            await fetch('/api/categories', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify(catData),
            })
          } catch (err) {
            logger.error('Error creating default category:', err)
          }
        }

        // Kategorileri yeniden yükle
        if (defaultCategories.length > 0) {
          setTimeout(() => fetchCategories(), 500)
        }
      }
    } catch (err) {
      logger.error('Error checking default categories:', err)
    }
  }

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('admin_token')
      const res = await fetch('/api/categories?includeInactive=true', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: 'no-store',
      })
      const data = await res.json()
      
      if (data.success) {
        const categoriesData = data.data || []
        
        // Her kategori için ürün sayısını al
        const categoriesWithCount = await Promise.all(
          categoriesData.map(async (cat: Category) => {
            try {
              const productsRes = await fetch(`/api/products?category=${cat.slug}`, {
                cache: 'no-store',
              })
              const productsData = await productsRes.json()
              const productCount = productsData.success ? (productsData.data?.length || 0) : 0
              return { ...cat, productCount }
            } catch {
              return { ...cat, productCount: 0 }
            }
          })
        )
        
        setCategories(categoriesWithCount)
      }
    } catch (err) {
      logger.error('Error fetching categories:', err)
      showError('Kategoriler yüklenirken bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data: CategoryFormData) => {
    try {
      const url = editingCategory ? `/api/categories/${editingCategory._id}` : '/api/categories'
      const method = editingCategory ? 'PUT' : 'POST'

      const token = localStorage.getItem('admin_token')
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...data,
          imageUrl: data.imageUrl || undefined,
        }),
      })

      const result = await res.json()

      if (result.success) {
        success(editingCategory ? 'Kategori başarıyla güncellendi' : 'Kategori başarıyla oluşturuldu')
        setSuccessMessage(editingCategory ? 'Kategori başarıyla güncellendi' : 'Kategori başarıyla oluşturuldu')
        setTimeout(() => setSuccessMessage(null), 3000)
        reset()
        setShowForm(false)
        setEditingCategory(null)
        fetchCategories()
      } else {
        showError(result.error || result.message || 'Bir hata oluştu')
      }
    } catch (err) {
      logger.error('Error saving category:', err)
      showError('Kategori kaydedilirken bir hata oluştu')
    }
  }

  const handleEdit = (category: Category) => {
    setEditingCategory(category)
    setValue('name', category.name)
    setValue('slug', category.slug)
    setValue('description', category.description || '')
    setValue('imageUrl', category.imageUrl || '')
    setValue('order', category.order)
    setValue('isActive', category.isActive)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Bu kategoriyi silmek istediğinizden emin misiniz? Bu kategoriye bağlı ürünler varsa silme işlemi başarısız olacaktır.')) {
      return
    }

    try {
      const token = localStorage.getItem('admin_token')
      const res = await fetch(`/api/categories/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const result = await res.json()

      if (result.success) {
        success('Kategori başarıyla silindi')
        fetchCategories()
      } else {
        showError(result.error || result.message || 'Kategori silinirken bir hata oluştu')
      }
    } catch (err) {
      logger.error('Error deleting category:', err)
      showError('Kategori silinirken bir hata oluştu')
    }
  }

  const handleNew = () => {
    reset()
    setEditingCategory(null)
    setShowForm(true)
  }

  const handleClose = () => {
    setShowForm(false)
    setEditingCategory(null)
    reset()
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="animate-spin text-gold-500 mx-auto mb-4" size={32} />
        <p className="text-charcoal-600">Yükleniyor...</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-serif font-semibold text-charcoal-900">
            Kategori Yönetimi
          </h2>
          <p className="text-sm text-charcoal-600 mt-1">
            Ürün kategorilerini yönetin. Kategoriler ürünleri organize etmek için kullanılır.
          </p>
        </div>
        <button
          onClick={handleNew}
          className="flex items-center gap-2 px-4 py-2 bg-charcoal-900 text-cream-50 rounded-lg premium-transition hover:bg-gold-500 hover:text-charcoal-900"
        >
          <Plus size={18} />
          Yeni Kategori
        </button>
      </div>

      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
          <CheckCircle2 className="text-green-600" size={20} />
          <p className="text-green-700 text-sm">{successMessage}</p>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-serif font-semibold text-charcoal-900">
                {editingCategory ? 'Kategori Düzenle' : 'Yeni Kategori Ekle'}
              </h3>
              <button
                onClick={handleClose}
                className="text-charcoal-400 hover:text-charcoal-900 premium-transition"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-charcoal-900 mb-2">
                  Kategori Adı *
                </label>
                <input
                  type="text"
                  {...register('name')}
                  className="w-full px-4 py-2 border border-charcoal-900/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500"
                  placeholder="Örn: Klasik Modeller"
                />
                {errors.name && (
                  <p className="text-red-600 text-xs mt-1">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-charcoal-900 mb-2">
                  Slug *
                  <span className="text-xs text-charcoal-500 ml-2">
                    (URL-friendly: küçük harf, rakam, tire)
                  </span>
                </label>
                <input
                  type="text"
                  {...register('slug')}
                  className="w-full px-4 py-2 border border-charcoal-900/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500"
                  placeholder="ornek-kategori"
                />
                {errors.slug && (
                  <p className="text-red-600 text-xs mt-1">{errors.slug.message}</p>
                )}
                {!editingCategory && (
                  <p className="text-xs text-charcoal-500 mt-1">
                    Slug otomatik olarak kategori adından üretilir, isterseniz düzenleyebilirsiniz.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-charcoal-900 mb-2">
                  Açıklama
                </label>
                <textarea
                  {...register('description')}
                  rows={3}
                  className="w-full px-4 py-2 border border-charcoal-900/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500"
                  placeholder="Kategori hakkında açıklama..."
                />
                {errors.description && (
                  <p className="text-red-600 text-xs mt-1">{errors.description.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-charcoal-900 mb-2">
                  Görsel URL
                </label>
                <input
                  type="url"
                  {...register('imageUrl')}
                  className="w-full px-4 py-2 border border-charcoal-900/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500"
                  placeholder="https://example.com/image.jpg"
                />
                {errors.imageUrl && (
                  <p className="text-red-600 text-xs mt-1">{errors.imageUrl.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-charcoal-900 mb-2">
                    Sıra (Order)
                  </label>
                  <input
                    type="number"
                    {...register('order', { valueAsNumber: true })}
                    min="0"
                    className="w-full px-4 py-2 border border-charcoal-900/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500"
                  />
                  {errors.order && (
                    <p className="text-red-600 text-xs mt-1">{errors.order.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-charcoal-900 mb-2">
                    Durum
                  </label>
                  <select
                    {...register('isActive', { valueAsNumber: false })}
                    className="w-full px-4 py-2 border border-charcoal-900/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500"
                  >
                    <option value="true">Aktif</option>
                    <option value="false">Pasif</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-6 py-3 bg-charcoal-900 text-cream-50 rounded-lg hover:bg-gold-500 hover:text-charcoal-900 premium-transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      Kaydediliyor...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={18} />
                      {editingCategory ? 'Güncelle' : 'Oluştur'}
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-6 py-3 bg-charcoal-100 text-charcoal-900 rounded-lg hover:bg-charcoal-200 premium-transition"
                >
                  İptal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Categories Table */}
      <div className="bg-white rounded-lg border border-charcoal-900/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-cream-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-charcoal-900 uppercase">
                  Kategori Adı
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-charcoal-900 uppercase">
                  Slug
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-charcoal-900 uppercase">
                  Ürün Sayısı
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-charcoal-900 uppercase">
                  Sıra
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
              {categories.length > 0 ? (
                categories.map((category) => (
                  <tr key={category._id} className="hover:bg-cream-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-charcoal-900">
                        {category.name}
                      </div>
                      {category.description && (
                        <div className="text-xs text-charcoal-500 mt-1 line-clamp-1">
                          {category.description}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <code className="text-xs text-charcoal-600 bg-cream-100 px-2 py-1 rounded">
                        {category.slug}
                      </code>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Package size={16} className="text-charcoal-400" />
                        <span className="text-sm text-charcoal-600">
                          {category.productCount || 0}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-charcoal-600">
                        {category.order}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          category.isActive
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {category.isActive ? 'Aktif' : 'Pasif'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleEdit(category)}
                          className="text-gold-600 hover:text-gold-700 premium-transition"
                          title="Düzenle"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(category._id)}
                          className="text-red-600 hover:text-red-700 premium-transition"
                          title="Sil"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-charcoal-600">
                    <div className="flex flex-col items-center gap-3">
                      <Package size={48} className="text-charcoal-300" />
                      <p>Henüz kategori bulunmamaktadır</p>
                      <button
                        onClick={handleNew}
                        className="text-sm text-gold-600 hover:text-gold-700 premium-transition"
                      >
                        İlk kategoriyi oluşturun
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
