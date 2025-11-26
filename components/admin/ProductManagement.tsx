'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2 } from 'lucide-react'
import ProductForm from './ProductForm'
import { useToast } from '@/hooks/useToast'
import type { Product } from '@/types'
import { logger } from '@/lib/logger-client'

export default function ProductManagement() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const { error: showError, success: showSuccess } = useToast()

  useEffect(() => {
    fetchProducts()
    
    // Story kaydedildiğinde ürünleri yenile
    const handleProductsUpdated = () => {
      logger.log('📢 ProductManagement yenileme eventi alındı')
      fetchProducts()
    }
    
    window.addEventListener('productsUpdated', handleProductsUpdated)
    
    return () => {
      window.removeEventListener('productsUpdated', handleProductsUpdated)
    }
  }, [])

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('admin_token')
      
      // Timeout ile fetch - 15 saniye sonra timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000)
      
      // Cache'i bypass et - her zaman güncel veriyi al
      const res = await fetch('/api/products', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        signal: controller.signal,
        cache: 'no-store', // Cache'i bypass et
      })
      
      clearTimeout(timeoutId)
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`)
      }
      
      const data = await res.json()
      
      // Yeni standardize edilmiş API formatı
      if (data.success === false || data.error) {
        logger.error('API Error:', data.error)
        setProducts([])
      } else {
        // Yeni format: { success: true, data: [...] } veya eski format: [...]
        setProducts(Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []))
      }
    } catch (error: any) {
      logger.error('Error fetching products:', error)
      setProducts([])
      if (error.name === 'AbortError') {
        showError('İstek zaman aşımına uğradı. Veritabanı bağlantısı kontrol ediliyor. MongoDB Atlas IP whitelist ayarlarınızı ve .env.local dosyasını kontrol edin.')
      } else if (error.message) {
        logger.error('Hata detayı:', error.message)
        if (error.message.includes('Veritabanı') || error.message.includes('MongoDB')) {
          showError(`Veritabanı Hatası: ${error.message}`)
        }
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Bu ürünü silmek istediğinizden emin misiniz?')) return

    try {
      const token = localStorage.getItem('admin_token')
      const res = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (res.ok) {
        showSuccess('Ürün başarıyla silindi')
        fetchProducts()
      } else {
        const data = await res.json()
        showError(data.error || 'Ürün silinirken bir hata oluştu')
      }
    } catch (error) {
      logger.error('Error deleting product:', error)
      showError('Ürün silinirken bir hata oluştu')
    }
  }

  const handleEdit = async (product: Product) => {
    try {
      // Güncel ürün verisini API'den çek
      const token = localStorage.getItem('admin_token')
      const res = await fetch(`/api/products/${product._id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      
      if (res.ok) {
        const data = await res.json()
        // Yeni standardize edilmiş API formatı
        if (data.success === false || data.error) {
          logger.warn('Güncel ürün verisi alınamadı, mevcut veri kullanılıyor:', data.error)
          setEditingProduct(product)
          setShowForm(true)
        } else {
          // Yeni format: { success: true, data: {...} } veya eski format: {...}
          const fullProduct = data.data || data
          setEditingProduct(fullProduct)
          setShowForm(true)
        }
      } else {
        // API'den çekilemezse mevcut veriyi kullan
        logger.warn('Güncel ürün verisi alınamadı, mevcut veri kullanılıyor')
        setEditingProduct(product)
        setShowForm(true)
      }
    } catch (error) {
      logger.error('Error fetching product:', error)
      // Hata durumunda mevcut veriyi kullan
      setEditingProduct(product)
      setShowForm(true)
    }
  }

  const handleFormClose = () => {
    setShowForm(false)
    setEditingProduct(null)
    fetchProducts()
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gold-500 mb-4"></div>
        <p className="text-charcoal-600">Yükleniyor...</p>
        <p className="text-sm text-charcoal-400 mt-2">Veritabanına bağlanılıyor...</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-serif font-semibold text-charcoal-900">
          Ürün Yönetimi
        </h2>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              if (!confirm('Duplicate (tekrarlanan) ürünleri temizlemek istediğinize emin misiniz? En eski olanlar tutulacak, diğerleri silinecek.')) {
                return
              }
              try {
                const token = localStorage.getItem('admin_token')
                const res = await fetch('/api/products/cleanup-duplicates', {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                })
                const data = await res.json()
                if (res.ok && data.success) {
                  if (data.deletedCount > 0) {
                    let message = `${data.deletedCount} duplicate ürün temizlendi`
                    if (data.duplicateGroups && data.duplicateGroups.length > 0) {
                      const groupsInfo = data.duplicateGroups.map((group: any) => 
                        `${group.name}: ${group.count - 1} adet silindi`
                      ).join(', ')
                      message += ` (${groupsInfo})`
                    }
                    showSuccess(message)
                  } else {
                    showSuccess('Duplicate ürün bulunamadı. Tüm ürünler benzersiz görünüyor.')
                  }
                  fetchProducts()
                } else {
                  showError(data.error || 'Temizleme başarısız')
                }
              } catch (error) {
                logger.error('Error cleaning duplicates:', error)
                showError('Temizleme sırasında bir hata oluştu')
              }
            }}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg premium-transition hover:bg-yellow-700 text-sm"
          >
            Duplicate Temizle
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-charcoal-900 text-cream-50 rounded-lg premium-transition hover:bg-gold-500 hover:text-charcoal-900"
          >
            <Plus size={18} />
            Yeni Ürün
          </button>
        </div>
      </div>

      {showForm && (
        <ProductForm
          product={editingProduct}
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
                  Ad
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-charcoal-900 uppercase">
                  Kategori
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-charcoal-900 uppercase">
                  Fiyat
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
              {Array.isArray(products) && products.length > 0 ? (
                products.map((product) => (
                <tr key={product._id} className="hover:bg-cream-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-charcoal-900">
                      {product.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-charcoal-600 capitalize">
                      {product.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-charcoal-600">
                      {product.category === 'konsept' && product.setPrice ? (
                        <div>
                          <div className="font-medium">{product.setPrice.toLocaleString('tr-TR')} ₺</div>
                          <div className="text-xs text-charcoal-400">6'lı Takım</div>
                        </div>
                      ) : product.price ? (
                        <div>
                          <div className="font-medium">{product.price.toLocaleString('tr-TR')} ₺</div>
                          <div className="text-xs text-charcoal-400">Tek Fincan</div>
                        </div>
                      ) : (
                        '-'
                      )}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        product.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {product.isActive ? 'Aktif' : 'Pasif'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleEdit(product)}
                        className="text-gold-600 hover:text-gold-700"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(product._id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-charcoal-600">
                    Henüz ürün bulunmamaktadır
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

