'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Plus, Trash2, Upload, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { useToast } from '@/hooks/useToast'
import { sanitizeInput, isValidUrl } from '@/lib/utils'
import type { Story, StoryChapter } from '@/types'

interface Chapter extends StoryChapter {
  image?: string
  trendyolLink?: string
  // Fincan fiyatları
  setPrice?: number // 6'lı takım fiyatı (sadece bu bölümün 6 fincanı)
  // Yeni fincan oluşturma
  createNewProduct?: boolean // Yeni ürün oluşturulacak mı?
  newProductName?: string // Yeni ürün adı
  newProductDescription?: string // Yeni ürün açıklaması
  newProductMaterial?: string // Yeni ürün materyal
}

export default function StoryForm({
  story,
  onClose,
  onSave,
}: {
  story?: Story | null
  onClose: () => void
  onSave: () => void
}) {
  const [formData, setFormData] = useState<Partial<Story> & { title: string; description: string; introContent: string; chapters: Chapter[]; isActive: boolean }>({
    title: '',
    description: '',
    introContent: '',
    coverImage: undefined,
    chapters: [],
    fullSetTrendyolLink: undefined,
    fullSetPrice: undefined,
    isActive: true,
  })
  const [loading, setLoading] = useState(false)
  const [products, setProducts] = useState<any[]>([])
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [uploadingChapters, setUploadingChapters] = useState<{ [key: number]: boolean }>({})
  const [uploadingCover, setUploadingCover] = useState(false)
  const chapterFileInputsRef = useRef<{ [key: number]: HTMLInputElement | null }>({})
  const coverFileInputRef = useRef<HTMLInputElement>(null)
  
  // Fincan değiştirme/kaldırma için state'ler
  const [selectedChapterIndex, setSelectedChapterIndex] = useState<number | null>(null)
  const [showProductModal, setShowProductModal] = useState(false)
  const [isUpdatingProduct, setIsUpdatingProduct] = useState(false)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const { error: showError, success: showSuccess, warning: showWarning } = useToast()
  
  // Form validation errors
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (story) {
      console.log('Story yüklendi:', JSON.stringify(story, null, 2))
      
      // Chapters'daki productId'leri string'e çevir (populate edilmişse _id'yi al)
      const processedChapters = (story.chapters || []).map((chapter: any) => {
        const productId = typeof chapter.productId === 'object' && chapter.productId?._id 
          ? chapter.productId._id.toString() 
          : (chapter.productId?.toString() || '')
        
        // Eğer productId populate edilmişse fiyatları al
        let setPrice
        if (typeof chapter.productId === 'object' && chapter.productId) {
          setPrice = chapter.productId.setPrice
        }
        
        return {
          chapterNumber: chapter.chapterNumber || 0,
          chapterTitle: chapter.chapterTitle || chapter.title || '',
          chapterContent: chapter.chapterContent || chapter.content || '',
          productId,
          image: (chapter as Chapter).image || '',
          trendyolLink: (chapter as Chapter).trendyolLink || '',
          setPrice,
          createNewProduct: false,
        } as Chapter
      })
      
      setFormData({
        title: story.title || '',
        description: story.description || '',
        introContent: story.introContent || '',
        coverImage: story.coverImage || undefined,
        chapters: processedChapters,
        fullSetTrendyolLink: story.fullSetTrendyolLink || undefined,
        fullSetPrice: story.fullSetPrice,
        isActive: story.isActive !== undefined ? story.isActive : true,
        _id: story._id,
      })
    } else {
      // Yeni hikaye için formu sıfırla
      setFormData({
        title: '',
        description: '',
        introContent: '',
        coverImage: undefined,
        chapters: [],
        fullSetTrendyolLink: undefined,
        fullSetPrice: undefined,
        isActive: true,
      })
    }
    fetchProducts()
  }, [story])

  const fetchProducts = async () => {
    setLoadingProducts(true)
    try {
      const token = localStorage.getItem('admin_token')
      const res = await fetch('/api/products', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const data = await res.json()
      
      // Yeni standardize edilmiş API formatı
      if (data.success === false || data.error) {
        console.error('API Error:', data.error)
        setProducts([])
      } else {
        // Yeni format: { success: true, data: [...] } veya eski format: [...]
        setProducts(Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []))
      }
    } catch (error) {
      console.error('Error fetching products:', error)
      setProducts([])
    } finally {
      setLoadingProducts(false)
    }
  }
  
  // Bildirim göster
  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 3000)
  }
  
  // Kaldır butonu - Fincanı bölümden kaldır
  const handleRemoveProduct = async (chapterIndex: number) => {
    const chapter = formData.chapters[chapterIndex]
    const productIdStr = typeof chapter.productId === 'string' ? chapter.productId : (chapter.productId as any)?._id?.toString() || ''
    if (!productIdStr || productIdStr.trim() === '') {
      return
    }
    
    const confirmed = window.confirm('Bu bölümden fincan bağlantısını kaldırmak istediğinize emin misiniz?')
    if (!confirmed) {
      return
    }
    
    setIsUpdatingProduct(true)
    try {
      const token = localStorage.getItem('admin_token')
      if (!token) {
        showNotification('error', 'Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.')
        return
      }
      
      // Eğer hikaye kaydedilmişse API'ye gönder, değilse sadece local state'i güncelle
      if (story?._id) {
        const res = await fetch(`/api/chapters/${story._id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            chapterIndex,
            updates: {
              productId: null,
              setPrice: undefined,
            },
          }),
        })
        
        const data = await res.json()
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Fincan kaldırılamadı')
        }
        
        // API'den gelen güncellenmiş story'yi kullan
        if (data.data) {
          setFormData((prev) => ({
            ...prev,
            chapters: data.data.chapters,
          }))
        }
      } else {
        // Henüz kaydedilmemiş hikaye - sadece local state'i güncelle
        updateChapter(chapterIndex, 'productId', '')
        updateChapter(chapterIndex, 'setPrice', undefined)
        updateChapter(chapterIndex, 'createNewProduct', false)
      }
      
      showNotification('success', 'Fincan bağlantısı kaldırıldı')
    } catch (error: any) {
      console.error('Error removing product:', error)
      showNotification('error', error.message || 'Fincan güncellenirken bir sorun oluştu.')
    } finally {
      setIsUpdatingProduct(false)
    }
  }
  
  // Değiştir butonu - Modal aç
  const handleChangeProduct = (chapterIndex: number) => {
    setSelectedChapterIndex(chapterIndex)
    setShowProductModal(true)
  }
  
  // Modal'dan fincan seç
  const handleSelectProduct = async (productId: string) => {
    if (selectedChapterIndex !== null && selectedChapterIndex !== undefined) {
      const chapterIndex = selectedChapterIndex
      const chapter = formData.chapters[chapterIndex]
      
      // Validasyon: Bu fincan başka bir bölümde kullanılıyor mu?
      const isProductUsedInOtherChapter = formData.chapters.some((ch, idx) => 
        idx !== chapterIndex && ch.productId === productId && ch.productId.trim() !== ''
      )
      
      if (isProductUsedInOtherChapter) {
        showNotification('error', 'Bu fincan zaten başka bir bölümde kullanılıyor.')
        return
      }
      
      setIsUpdatingProduct(true)
      try {
        const selectedProduct = Array.isArray(products) ? products.find(p => p._id === productId) : undefined
        if (!selectedProduct) {
          showNotification('error', 'Seçilen fincan bulunamadı.')
          return
        }
        
        // Validasyon: Sadece konsept tipindeki ve ilgili hikayeye bağlı ürünler
        if (selectedProduct.category !== 'konsept') {
          showNotification('error', 'Sadece konsept tipindeki fincanlar seçilebilir.')
          return
        }
        
        if (story?._id && selectedProduct.storyId) {
          const productStoryId = typeof selectedProduct.storyId === 'object' 
            ? selectedProduct.storyId._id?.toString() 
            : selectedProduct.storyId.toString()
          
          if (productStoryId !== story._id.toString()) {
            showNotification('error', 'Bu fincan farklı bir hikayeye bağlı.')
            return
          }
        }
        
        // Eğer hikaye kaydedilmişse API'ye gönder, değilse sadece local state'i güncelle
        if (story?._id) {
          const token = localStorage.getItem('admin_token')
          if (!token) {
            showNotification('error', 'Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.')
            return
          }
          
          const res = await fetch(`/api/chapters/${story._id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              chapterIndex,
              updates: {
                productId: productId,
                setPrice: selectedProduct.setPrice,
              },
            }),
          })
          
          const data = await res.json()
          if (!res.ok || !data.success) {
            throw new Error(data.error || 'Fincan güncellenemedi')
          }
          
          // API'den gelen güncellenmiş story'yi kullan
          if (data.data) {
            setFormData((prev) => ({
              ...prev,
              chapters: data.data.chapters,
            }))
          }
        } else {
          // Henüz kaydedilmemiş hikaye - sadece local state'i güncelle
          updateChapter(chapterIndex, 'productId', productId)
          updateChapter(chapterIndex, 'setPrice', selectedProduct.setPrice)
          updateChapter(chapterIndex, 'createNewProduct', false)
        }
        
        showNotification('success', 'Fincan başarıyla güncellendi')
        setShowProductModal(false)
        setSelectedChapterIndex(null)
      } catch (error: any) {
        console.error('Error updating product:', error)
        showNotification('error', 'Fincan güncellenirken bir sorun oluştu.')
      } finally {
        setIsUpdatingProduct(false)
      }
    }
  }
  
  // Modal için uygun fincanları filtrele
  const getAvailableProducts = () => {
    // products array kontrolü
    if (!Array.isArray(products) || products.length === 0) {
      return []
    }
    
    if (!story?._id) {
      // Yeni hikaye ise tüm konsept ürünlerini göster
      return products.filter(p => p.category === 'konsept')
    }
    
    // Mevcut hikaye ise sadece bu hikayeye bağlı konsept ürünlerini göster
    return products.filter(p => {
      if (p.category !== 'konsept') return false
      
      if (p.storyId) {
        const productStoryId = typeof p.storyId === 'object' 
          ? p.storyId._id?.toString() 
          : p.storyId.toString()
        return story._id ? productStoryId === story._id.toString() : false
      }
      
      return false
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation errors'ı temizle
    const newErrors: Record<string, string> = {}
    
    // Form validasyonu
    if (!formData.title || formData.title.trim() === '') {
      newErrors.title = 'Lütfen hikaye başlığı girin'
    }
    
    if (!formData.description || formData.description.trim() === '') {
      newErrors.description = 'Lütfen hikaye açıklaması girin'
    }
    
    if (!formData.introContent || formData.introContent.trim() === '') {
      newErrors.introContent = 'Lütfen giriş içeriği girin'
    }
    
    if (!formData.coverImage || formData.coverImage.trim() === '') {
      newErrors.coverImage = 'Lütfen kapak görseli yükleyin veya URL girin'
    }
    
    // Tüm hikaye takımı fiyatı validasyonu
    if (!formData.fullSetPrice || formData.fullSetPrice <= 0) {
      newErrors.fullSetPrice = 'Lütfen tüm hikaye takımı fiyatını girin (6 bölüm + 1 hediye fincan)'
    }
    
    // Bölüm validasyonu
    for (let i = 0; i < formData.chapters.length; i++) {
      const chapter = formData.chapters[i]
      const chapterKey = `chapter_${i}`
      
      const chapterTitle = (chapter as any).chapterTitle || (chapter as any).title || ''
      const chapterContent = (chapter as any).chapterContent || (chapter as any).content || ''
      
      if (!chapterTitle || chapterTitle.trim() === '') {
        newErrors[`${chapterKey}_title`] = 'Başlık gerekli'
      }
      if (!chapterContent || chapterContent.trim() === '') {
        newErrors[`${chapterKey}_content`] = 'İçerik gerekli'
      }
      if ((chapter as Chapter).createNewProduct) {
        // Yeni ürün oluşturulacaksa validasyon
        if (!(chapter as Chapter).newProductName || (chapter as Chapter).newProductName!.trim() === '') {
          newErrors[`${chapterKey}_newProductName`] = 'Fincan adı gerekli'
        }
        if (!(chapter as Chapter).newProductDescription || (chapter as Chapter).newProductDescription!.trim() === '') {
          newErrors[`${chapterKey}_newProductDescription`] = 'Fincan açıklaması gerekli'
        }
        if (!(chapter as Chapter).newProductMaterial || (chapter as Chapter).newProductMaterial!.trim() === '') {
          newErrors[`${chapterKey}_newProductMaterial`] = 'Materyal gerekli'
        }
        if (!(chapter as Chapter).setPrice || (chapter as Chapter).setPrice! <= 0) {
          newErrors[`${chapterKey}_setPrice`] = '6\'lı takım fiyatı gerekli'
        }
      } else {
        // Mevcut ürün seçildiyse validasyon
        const productIdStr15 = typeof chapter.productId === 'string' ? chapter.productId : (chapter.productId as any)?._id?.toString() || ''
        if (!productIdStr15 || productIdStr15.trim() === '') {
          newErrors[`${chapterKey}_productId`] = 'Fincan seçilmedi veya oluşturulmadı'
        }
        if (!(chapter as Chapter).setPrice || (chapter as Chapter).setPrice! <= 0) {
          newErrors[`${chapterKey}_setPrice`] = '6\'lı takım fiyatı gerekli'
        }
      }
      
      // Genel kontrol: Her bölüm için fincan olmalı
      const productIdStr2 = typeof chapter.productId === 'string' ? chapter.productId : (chapter.productId as any)?._id?.toString() || ''
      if (!productIdStr2 || productIdStr2.trim() === '') {
        if (!(chapter as Chapter).createNewProduct) {
          newErrors[`${chapterKey}_productId`] = 'Fincan seçilmedi veya oluşturulmadı'
        }
      }
    }
    
    // Eğer hata varsa, state'i güncelle ve ilk hataya scroll yap
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      showError('Lütfen formdaki hataları düzeltin')
      // İlk hataya scroll yap
      const firstErrorKey = Object.keys(newErrors)[0]
      const firstErrorElement = document.querySelector(`[data-field="${firstErrorKey}"]`)
      if (firstErrorElement) {
        firstErrorElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
      return
    }
    
    // Hata yoksa errors'ı temizle
    setErrors({})
    
    setLoading(true)

    try {
      const token = localStorage.getItem('admin_token')
      if (!token) {
        showError('Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.')
        setLoading(false)
        return
      }
      
      // Yeni hikaye oluşturuluyorsa önce hikayeyi oluştur, sonra ürünleri bağla
      let storyId = story?._id
      
      if (!storyId) {
        // Yeni hikaye oluştur (geçici olarak boş chapters ile)
        const tempPayload = {
          ...formData,
          isActive: formData.isActive !== undefined ? formData.isActive : true,
          chapters: [],
          fullSetTrendyolLink: formData.fullSetTrendyolLink?.trim() || undefined,
        }
        
        const tempRes = await fetch('/api/stories', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(tempPayload),
        })
        
        if (!tempRes.ok) {
          const errorData = await tempRes.json()
          throw new Error(`Hikaye oluşturulamadı: ${errorData.error || errorData.message || 'Bilinmeyen hata'}`)
        }
        
        const createdStory = await tempRes.json()
        storyId = createdStory._id
      }
      
      // Önce yeni ürünleri oluştur
      const processedChapters = await Promise.all(
        (formData.chapters || []).map(async (chapter: Chapter) => {
          if ((chapter as Chapter).createNewProduct) {
            // Eğer zaten productId varsa, yeni ürün oluşturma - mevcut ürünü kullan
            const productIdStr16 = typeof chapter.productId === 'string' ? chapter.productId : (chapter.productId as any)?._id?.toString() || ''
            if (productIdStr16 && productIdStr16.trim() !== '') {
              console.warn(`Bölüm ${chapter.chapterNumber} için zaten productId var (${productIdStr16}), yeni ürün oluşturulmayacak`)
              return {
                ...chapter,
                productId: productIdStr16.trim(),
                trendyolLink: (chapter as Chapter).trendyolLink?.trim() || undefined,
                createNewProduct: false, // Artık yeni ürün değil
              }
            }
            
            // Yeni ürün oluştur
            const newProduct = {
              name: (chapter as Chapter).newProductName!.trim(),
              description: (chapter as Chapter).newProductDescription!.trim(),
              category: 'konsept',
              setPrice: (chapter as Chapter).setPrice, // Sadece 6'lı takım fiyatı
              material: (chapter as Chapter).newProductMaterial!.trim(),
              images: (chapter as Chapter).image ? [(chapter as Chapter).image!] : [],
              dimensions: {
                unit: 'cm',
              },
              collectionTags: [formData.title],
              isActive: true,
              storyId: storyId, // Hikaye ID'si artık var
              chapterNumber: chapter.chapterNumber,
              chapterTitle: (chapter as any).chapterTitle || (chapter as any).title || '',
              trendyolLink: (chapter as Chapter).trendyolLink?.trim() || null,
            }

            const productRes = await fetch('/api/products', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify(newProduct),
            })

            if (!productRes.ok) {
              const errorData = await productRes.json()
              throw new Error(`Ürün oluşturulamadı: ${errorData.error || errorData.message || 'Bilinmeyen hata'}`)
            }

            const productResponse = await productRes.json()
            // Yeni standardize edilmiş API formatı
            const createdProduct = productResponse.success === false || productResponse.error
              ? null
              : (productResponse.data || productResponse)
            
            if (!createdProduct || !createdProduct._id) {
              throw new Error(`Ürün oluşturuldu ama ID alınamadı`)
            }
            
            console.log(`Yeni ürün oluşturuldu: ${createdProduct._id} - ${createdProduct.name}`)
            
            return {
              ...chapter,
              productId: createdProduct._id.toString(),
              trendyolLink: (chapter as Chapter).trendyolLink?.trim() || undefined,
              createNewProduct: false, // Artık yeni ürün değil, mevcut ürün
            }
          } else {
            // Mevcut ürünü güncelle (6'lı takım fiyatı)
            // setPrice her zaman güncellenmeli (null, 0, veya pozitif sayı)
            const productIdStr17 = typeof chapter.productId === 'string' ? chapter.productId : (chapter.productId as any)?._id?.toString() || ''
            if (productIdStr17 && productIdStr17.trim() !== '') {
              const updateProduct: any = {}
              
              // setPrice her zaman gönder (undefined, null, 0, veya pozitif sayı)
              // Backend'de undefined/null/0 kontrolü yapılacak
              if (chapter.setPrice !== undefined && chapter.setPrice !== null) {
                // Number olarak gönder (0 dahil)
                updateProduct.setPrice = typeof chapter.setPrice === 'number' 
                  ? chapter.setPrice 
                  : parseFloat(chapter.setPrice) || 0
              } else {
                // setPrice undefined/null ise undefined gönder (backend'de temizlenecek)
                updateProduct.setPrice = undefined
              }

              console.log(`🔄 Ürün güncelleniyor: ${productIdStr17}`)
              console.log(`💰 setPrice değeri: ${updateProduct.setPrice} (tip: ${typeof updateProduct.setPrice})`)

              // Her zaman güncelleme yap (setPrice undefined olsa bile)
              const updateRes = await fetch(`/api/products/${productIdStr17}`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(updateProduct),
              })

              if (!updateRes.ok) {
                const errorData = await updateRes.json()
                console.error(`❌ Ürün güncelleme hatası:`, errorData)
                throw new Error(`Ürün güncellenemedi (${productIdStr17}): ${errorData.error || errorData.message || 'Bilinmeyen hata'}`)
              }

              const updatedProductData = await updateRes.json()
              const updatedProduct = updatedProductData.success === false || updatedProductData.error
                ? null
                : (updatedProductData.data || updatedProductData)

              if (updatedProduct) {
                console.log(`✅ Ürün başarıyla güncellendi: ${productIdStr17}`)
                console.log(`💰 Güncellenmiş setPrice: ${updatedProduct.setPrice}`)
              } else {
                console.warn(`⚠️ Ürün güncellendi ama response alınamadı: ${productIdStr17}`)
              }
            }

            // productId boş string ise null yap
            const productId = productIdStr17 && productIdStr17.trim() !== '' 
              ? productIdStr17.trim() 
              : null
            
            return {
              ...chapter,
              productId: productId, // null veya string
              trendyolLink: (chapter as Chapter).trendyolLink?.trim() || undefined,
            }
          }
        })
      )

      // FormData'yı hazırla - isActive ve chapters'ı kontrol et
      const cleanedChapters = processedChapters.map((chapter) => {
        // productId boş string ise null yap, yoksa string olarak gönder
        const productIdStr12 = typeof chapter.productId === 'string' ? chapter.productId : (chapter.productId as any)?._id?.toString() || ''
        const productId = productIdStr12 && productIdStr12.trim() !== '' 
          ? productIdStr12.trim() 
          : null
        
        return {
          chapterNumber: chapter.chapterNumber,
          chapterTitle: (chapter as any).chapterTitle || (chapter as any).title || '',
          chapterContent: (chapter as any).chapterContent || (chapter as any).content || '',
          productId: productId, // null veya string
          image: (chapter as Chapter).image || undefined,
          trendyolLink: (chapter as Chapter).trendyolLink,
        }
      })
      
      const payload = {
        ...formData,
        isActive: formData.isActive !== undefined ? formData.isActive : true,
        chapters: cleanedChapters,
        fullSetTrendyolLink: formData.fullSetTrendyolLink?.trim() || undefined,
        fullSetPrice: formData.fullSetPrice,
      }
      
      console.log('Gönderilen veri:', JSON.stringify(payload, null, 2))
      
      const url = `/api/stories/${storyId}`
      const method = 'PUT'

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      const responseData = await res.json()
      
      console.log('📥 Story API Yanıtı:', JSON.stringify(responseData, null, 2))

      if (res.ok && responseData.success !== false) {
        console.log('✅ Hikaye başarıyla kaydedildi')
        // onSave callback'ini çağır - bu sayfa yenileme veya liste güncelleme yapacak
        onSave()
        // ProductManagement'i yenilemek için custom event fırlat
        window.dispatchEvent(new CustomEvent('productsUpdated'))
        console.log('📢 ProductManagement yenileme eventi fırlatıldı')
        // Kısa bir gecikme sonrası modal'ı kapat (eğer varsa)
        setTimeout(() => {
          console.log('🔄 Sayfa yenileniyor...')
        }, 500)
      } else {
        console.error('❌ Story API Error:', JSON.stringify(responseData, null, 2))
        const errorMessage = responseData.error || responseData.message || 'Bir hata oluştu. Konsolu kontrol edin.'
        console.error('❌ Hata Mesajı:', errorMessage)
        showError(`Hikaye kaydedilemedi: ${errorMessage}`)
      }
    } catch (error: any) {
      console.error('Error saving story:', error)
      showError(`Bir hata oluştu: ${error.message || 'Bilinmeyen hata'}`)
    } finally {
      setLoading(false)
    }
  }

  const addChapter = () => {
    const newChapterNumber = formData.chapters.length + 1
    setFormData({
      ...formData,
      chapters: [
        ...formData.chapters,
        {
          chapterNumber: newChapterNumber,
          chapterTitle: '',
          chapterContent: '',
          productId: '',
          image: '',
          trendyolLink: '',
          setPrice: undefined,
          createNewProduct: false,
          newProductName: '',
          newProductDescription: '',
          newProductMaterial: 'Seramik',
        } as Chapter,
      ],
    })
  }

  const removeChapter = (index: number) => {
    const newChapters = formData.chapters.filter((_, i) => i !== index)
    // Bölüm numaralarını yeniden düzenle
    const renumberedChapters = newChapters.map((ch, i) => ({
      ...ch,
      chapterNumber: i + 1,
    }))
    setFormData({
      ...formData,
      chapters: renumberedChapters,
    })
  }

  const updateChapter = (index: number, field: keyof Chapter, value: any) => {
    setFormData((prev) => {
      const newChapters = [...prev.chapters]
      if (newChapters[index]) {
        newChapters[index] = {
          ...newChapters[index],
          [field]: value,
        }
      }
      return {
        ...prev,
        chapters: newChapters,
      }
    })
  }

  const handleCoverImageUpload = async (file: File) => {
    // Dosya tipi kontrolü
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      showError('Sadece JPG, PNG ve WebP formatları desteklenir')
      return
    }

    // Dosya boyutu kontrolü (max 5MB)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      showError('Dosya boyutu 5MB\'dan küçük olmalıdır')
      return
    }

    const token = localStorage.getItem('admin_token')
    if (!token) {
      showError('Lütfen önce giriş yapın')
      return
    }

    setUploadingCover(true)

    try {
      const uploadFormData = new FormData()
      uploadFormData.append('file', file)

      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: uploadFormData,
      })

      const data = await res.json()

      if (res.ok && data.url) {
        setFormData({ ...formData, coverImage: data.url })
        showSuccess('Kapak görseli başarıyla yüklendi')
      } else {
        showError(data.error || 'Yükleme başarısız')
      }
    } catch (error) {
      console.error('Upload error:', error)
      showError('Yükleme sırasında bir hata oluştu')
    } finally {
      setUploadingCover(false)
      if (coverFileInputRef.current) {
        coverFileInputRef.current.value = ''
      }
    }
  }

  const handleChapterImageUpload = async (file: File, chapterIndex: number) => {
    // Dosya tipi kontrolü
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      showError('Sadece JPG, PNG ve WebP formatları desteklenir')
      return
    }

    // Dosya boyutu kontrolü (max 5MB)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      showError('Dosya boyutu 5MB\'dan küçük olmalıdır')
      return
    }

    const token = localStorage.getItem('admin_token')
    if (!token) {
      showError('Lütfen önce giriş yapın')
      return
    }

    setUploadingChapters((prev) => ({ ...prev, [chapterIndex]: true }))

    try {
      const uploadFormData = new FormData()
      uploadFormData.append('file', file)

      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: uploadFormData,
      })

      const data = await res.json()

      if (res.ok && data.url) {
        // Görseli bölüme ekle
        updateChapter(chapterIndex, 'image', data.url)
        showSuccess('Bölüm görseli başarıyla yüklendi')
      } else {
        showError(data.error || 'Yükleme başarısız')
      }
    } catch (error) {
      console.error('Upload error:', error)
      showError('Yükleme sırasında bir hata oluştu')
    } finally {
      setUploadingChapters((prev) => ({ ...prev, [chapterIndex]: false }))
      // Input'u temizle
      const input = chapterFileInputsRef.current[chapterIndex]
      if (input) input.value = ''
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-charcoal-900/10 px-6 py-4 flex justify-between items-center">
          <h3 className="text-2xl font-serif font-semibold text-charcoal-900">
            {story ? 'Hikaye Düzenle' : 'Yeni Hikaye'}
          </h3>
          <button onClick={onClose} className="text-charcoal-600 hover:text-charcoal-900">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div data-field="title">
            <label className="block text-sm font-medium text-charcoal-900 mb-2">
              Başlık *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => {
                const sanitized = sanitizeInput(e.target.value)
                setFormData({ ...formData, title: sanitized })
                if (errors.title) {
                  setErrors(prev => ({ ...prev, title: '' }))
                }
              }}
              required
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                errors.title 
                  ? 'border-red-500 focus:ring-red-500' 
                  : 'border-charcoal-900/20 focus:ring-gold-500'
              }`}
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-600">{errors.title}</p>
            )}
          </div>

          <div data-field="description">
            <label className="block text-sm font-medium text-charcoal-900 mb-2">
              Açıklama (Kısa) *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => {
                const sanitized = sanitizeInput(e.target.value)
                setFormData({ ...formData, description: sanitized })
                if (errors.description) {
                  setErrors(prev => ({ ...prev, description: '' }))
                }
              }}
              required
              rows={3}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                errors.description 
                  ? 'border-red-500 focus:ring-red-500' 
                  : 'border-charcoal-900/20 focus:ring-gold-500'
              }`}
              placeholder="Hikayenin kısa açıklaması (liste sayfasında görünecek)"
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">{errors.description}</p>
            )}
          </div>

          <div data-field="introContent">
            <label className="block text-sm font-medium text-charcoal-900 mb-2">
              Giriş İçeriği (İlk Bölüm - Ücretsiz) *
            </label>
            <textarea
              value={formData.introContent}
              onChange={(e) => {
                const sanitized = sanitizeInput(e.target.value)
                setFormData({ ...formData, introContent: sanitized })
                if (errors.introContent) {
                  setErrors(prev => ({ ...prev, introContent: '' }))
                }
              }}
              required
              rows={6}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                errors.introContent 
                  ? 'border-red-500 focus:ring-red-500' 
                  : 'border-charcoal-900/20 focus:ring-gold-500'
              }`}
              placeholder="Hikayenin başlangıcı - Herkes görebilir"
            />
            {errors.introContent && (
              <p className="mt-1 text-sm text-red-600">{errors.introContent}</p>
            )}
          </div>

          <div data-field="coverImage">
            <label className="block text-sm font-medium text-charcoal-900 mb-2">
              Kapak Görseli *
            </label>
            
            {/* Dosya Yükleme Alanı */}
            <div
              onDragOver={(e) => {
                e.preventDefault()
                e.stopPropagation()
              }}
              onDrop={async (e) => {
                e.preventDefault()
                e.stopPropagation()
                const files = e.dataTransfer.files
                if (files && files[0]) {
                  await handleCoverImageUpload(files[0])
                }
              }}
              onClick={() => coverFileInputRef.current?.click()}
              className="border-2 border-dashed border-charcoal-900/20 rounded-lg p-6 mb-2 bg-cream-50 hover:border-gold-400 premium-transition cursor-pointer"
            >
              <input
                ref={coverFileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    handleCoverImageUpload(file)
                  }
                }}
                className="hidden"
              />
              <div className="text-center">
                <Upload size={40} className="mx-auto text-charcoal-400 mb-2" />
                <p className="text-sm text-charcoal-600 mb-1">
                  Kapak görselini sürükleyip bırakın veya tıklayın
                </p>
                <p className="text-xs text-charcoal-500">
                  JPG, PNG, WebP (Max 5MB)
                </p>
                {uploadingCover && (
                  <div className="mt-2 flex items-center justify-center gap-2">
                    <Loader2 size={20} className="animate-spin text-gold-600" />
                    <span className="text-sm text-charcoal-600">Yükleniyor...</span>
                  </div>
                )}
              </div>
            </div>

            {/* URL ile Ekleme (Opsiyonel) */}
            <input
              type="text"
              value={formData.coverImage}
              onChange={(e) => {
                // URL için sanitizeInput kullan (URL'lerde < > karakterleri olmamalı)
                const sanitized = sanitizeInput(e.target.value)
                setFormData({ ...formData, coverImage: sanitized })
                if (errors.coverImage) {
                  setErrors(prev => ({ ...prev, coverImage: '' }))
                }
              }}
              placeholder="Veya görsel URL'si ekle (opsiyonel)"
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                errors.coverImage 
                  ? 'border-red-500 focus:ring-red-500' 
                  : 'border-charcoal-900/20 focus:ring-gold-500'
              }`}
              onClick={(e) => e.stopPropagation()}
            />
            {errors.coverImage && (
              <p className="mt-1 text-sm text-red-600">{errors.coverImage}</p>
            )}
            {formData.coverImage && (
              <div className="mt-3 relative w-48 h-48 bg-cream-200 rounded-lg overflow-hidden">
                <img
                  src={formData.coverImage}
                  alt="Kapak görseli"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              </div>
            )}
          </div>

          {/* Bölümler */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="block text-sm font-medium text-charcoal-900">
                Hikaye Bölümleri
              </label>
              <button
                type="button"
                onClick={addChapter}
                className="flex items-center gap-2 px-4 py-2 bg-charcoal-900 text-cream-50 rounded-lg hover:bg-gold-500 premium-transition text-sm"
              >
                <Plus size={16} />
                Bölüm Ekle
              </button>
            </div>

            {formData.chapters.length === 0 && (
              <div className="text-center py-8 border-2 border-dashed border-charcoal-900/20 rounded-lg bg-cream-50">
                <p className="text-sm text-charcoal-600">
                  Henüz bölüm eklenmedi. Her bölüm bir fincan ile ilişkilendirilir.
                </p>
              </div>
            )}

            <div className="space-y-4">
              {formData.chapters.map((chapter, index) => (
                <div
                  key={index}
                  className="border border-charcoal-900/10 rounded-lg p-4 bg-cream-50"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-serif font-semibold text-charcoal-900">
                      Bölüm {chapter.chapterNumber}
                    </h4>
                    <button
                      type="button"
                      onClick={() => removeChapter(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div data-field={`chapter_${index}_title`}>
                      <label className="block text-xs font-medium text-charcoal-900 mb-1">
                        Bölüm Başlığı *
                      </label>
                      <input
                        type="text"
                        value={(chapter as any).chapterTitle || (chapter as any).title || ''}
                        onChange={(e) => {
                          const sanitized = sanitizeInput(e.target.value)
                          updateChapter(index, 'chapterTitle', sanitized)
                          if (errors[`chapter_${index}_title`]) {
                            setErrors(prev => {
                              const newErrors = { ...prev }
                              delete newErrors[`chapter_${index}_title`]
                              return newErrors
                            })
                          }
                        }}
                        required
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 text-sm ${
                          errors[`chapter_${index}_title`] 
                            ? 'border-red-500 focus:ring-red-500' 
                            : 'border-charcoal-900/20 focus:ring-gold-500'
                        }`}
                        placeholder="Bölüm başlığı"
                      />
                      {errors[`chapter_${index}_title`] && (
                        <p className="mt-1 text-xs text-red-600">{errors[`chapter_${index}_title`]}</p>
                      )}
                    </div>

                    <div data-field={`chapter_${index}_content`}>
                      <label className="block text-xs font-medium text-charcoal-900 mb-1">
                        Bölüm İçeriği *
                      </label>
                      <textarea
                        value={(chapter as any).chapterContent || (chapter as any).content || ''}
                        onChange={(e) => {
                          const sanitized = sanitizeInput(e.target.value)
                          updateChapter(index, 'chapterContent', sanitized)
                          if (errors[`chapter_${index}_content`]) {
                            setErrors(prev => {
                              const newErrors = { ...prev }
                              delete newErrors[`chapter_${index}_content`]
                              return newErrors
                            })
                          }
                        }}
                        required
                        rows={4}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 text-sm ${
                          errors[`chapter_${index}_content`] 
                            ? 'border-red-500 focus:ring-red-500' 
                            : 'border-charcoal-900/20 focus:ring-gold-500'
                        }`}
                        placeholder="Bölüm içeriği..."
                      />
                      {errors[`chapter_${index}_content`] && (
                        <p className="mt-1 text-xs text-red-600">{errors[`chapter_${index}_content`]}</p>
                      )}
                    </div>

                    <div data-field={`chapter_${index}_productId`}>
                      <label className="block text-xs font-medium text-charcoal-900 mb-1">
                        Gerekli Fincan *
                      </label>
                      {loadingProducts ? (
                        <p className="text-xs text-charcoal-600">Yükleniyor...</p>
                      ) : (
                        <>
                          {(() => {
                            const productIdStr19 = typeof chapter.productId === 'string' ? chapter.productId : (chapter.productId as any)?._id?.toString() || ''
                            return productIdStr19 && productIdStr19.trim() !== ''
                          })() ? (
                            // Mevcut fincan varsa - değiştir/kaldır seçenekleri
                            <div className="space-y-2">
                              <div className="flex items-center justify-between p-3 bg-cream-100 rounded-lg border border-charcoal-900/10">
                                <div className="flex-1">
                                  <p className="text-xs font-medium text-charcoal-700 mb-1">Mevcut Fincan:</p>
                                  <p className="text-sm font-semibold text-charcoal-900">
                                    {Array.isArray(products) ? (products.find(p => {
                                      const productIdStr7 = typeof chapter.productId === 'string' ? chapter.productId : (chapter.productId as any)?._id?.toString() || ''
                                      return p._id === productIdStr7
                                    })?.name || 'Fincan yükleniyor...') : 'Fincan yükleniyor...'}
                                  </p>
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleChangeProduct(index)}
                                    disabled={isUpdatingProduct}
                                    className="px-3 py-1.5 text-xs bg-charcoal-900 text-cream-50 rounded hover:bg-gold-500 premium-transition disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    {isUpdatingProduct ? 'Güncelleniyor...' : 'Değiştir'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveProduct(index)}
                                    disabled={isUpdatingProduct}
                                    className="px-3 py-1.5 text-xs bg-red-600 text-white rounded hover:bg-red-700 premium-transition disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    {isUpdatingProduct ? 'Kaldırılıyor...' : 'Kaldır'}
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            // Mevcut fincan yoksa - yeni oluştur veya seç
                            <>
                              <div className="flex items-center gap-2 mb-2">
                                <input
                                  type="checkbox"
                                  id={`createNew-${index}`}
                                  checked={!!(chapter as Chapter).createNewProduct}
                                  onChange={(e) => {
                                    const isChecked = e.target.checked
                                    console.log('Checkbox değişti:', isChecked, 'Bölüm:', index)
                                    updateChapter(index, 'createNewProduct', isChecked)
                                    if (isChecked) {
                                      // Yeni ürün oluşturulacaksa productId'yi temizle
                                      updateChapter(index, 'productId', '')
                                      updateChapter(index, 'newProductName', '')
                                      updateChapter(index, 'newProductDescription', '')
                                      updateChapter(index, 'newProductMaterial', 'Seramik')
                                    } else {
                                      // Checkbox kapatıldığında yeni ürün alanlarını temizle
                                      updateChapter(index, 'newProductName', '')
                                      updateChapter(index, 'newProductDescription', '')
                                      updateChapter(index, 'newProductMaterial', 'Seramik')
                                    }
                                  }}
                                  className="w-4 h-4 text-gold-600 border-charcoal-300 rounded focus:ring-gold-500 cursor-pointer"
                                />
                                <label htmlFor={`createNew-${index}`} className="text-xs text-charcoal-700 cursor-pointer">
                                  Yeni fincan oluştur (otomatik ürün olarak eklenecek)
                                </label>
                              </div>
                              
                              {(chapter as Chapter).createNewProduct ? (
                                <div className="space-y-3 mb-3 p-3 bg-gold-50 rounded-lg border border-gold-200">
                                  <div data-field={`chapter_${index}_newProductName`}>
                                    <label className="block text-xs font-medium text-charcoal-900 mb-1">
                                      Fincan Adı *
                                    </label>
                                    <input
                                      type="text"
                                      value={(chapter as Chapter).newProductName || ''}
                                      onChange={(e) => {
                                        const sanitized = sanitizeInput(e.target.value)
                                        updateChapter(index, 'newProductName', sanitized)
                                        if (errors[`chapter_${index}_newProductName`]) {
                                          setErrors(prev => {
                                            const newErrors = { ...prev }
                                            delete newErrors[`chapter_${index}_newProductName`]
                                            return newErrors
                                          })
                                        }
                                      }}
                                      placeholder="Örn: Gölgelerin Fısıltısı Fincanı"
                                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 text-sm ${
                                        errors[`chapter_${index}_newProductName`] 
                                          ? 'border-red-500 focus:ring-red-500' 
                                          : 'border-charcoal-900/20 focus:ring-gold-500'
                                      }`}
                                    />
                                    {errors[`chapter_${index}_newProductName`] && (
                                      <p className="mt-1 text-xs text-red-600">{errors[`chapter_${index}_newProductName`]}</p>
                                    )}
                                  </div>
                                  <div data-field={`chapter_${index}_newProductDescription`}>
                                    <label className="block text-xs font-medium text-charcoal-900 mb-1">
                                      Fincan Açıklaması *
                                    </label>
                                    <textarea
                                      value={(chapter as Chapter).newProductDescription || ''}
                                      onChange={(e) => {
                                        const sanitized = sanitizeInput(e.target.value)
                                        updateChapter(index, 'newProductDescription', sanitized)
                                        if (errors[`chapter_${index}_newProductDescription`]) {
                                          setErrors(prev => {
                                            const newErrors = { ...prev }
                                            delete newErrors[`chapter_${index}_newProductDescription`]
                                            return newErrors
                                          })
                                        }
                                      }}
                                      placeholder="Fincan açıklaması..."
                                      rows={2}
                                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 text-sm ${
                                        errors[`chapter_${index}_newProductDescription`] 
                                          ? 'border-red-500 focus:ring-red-500' 
                                          : 'border-charcoal-900/20 focus:ring-gold-500'
                                      }`}
                                    />
                                    {errors[`chapter_${index}_newProductDescription`] && (
                                      <p className="mt-1 text-xs text-red-600">{errors[`chapter_${index}_newProductDescription`]}</p>
                                    )}
                                  </div>
                                  <div data-field={`chapter_${index}_newProductMaterial`}>
                                    <label className="block text-xs font-medium text-charcoal-900 mb-1">
                                      Materyal *
                                    </label>
                                    <input
                                      type="text"
                                      value={(chapter as Chapter).newProductMaterial || 'Seramik'}
                                      onChange={(e) => {
                                        const sanitized = sanitizeInput(e.target.value)
                                        updateChapter(index, 'newProductMaterial', sanitized)
                                        if (errors[`chapter_${index}_newProductMaterial`]) {
                                          setErrors(prev => {
                                            const newErrors = { ...prev }
                                            delete newErrors[`chapter_${index}_newProductMaterial`]
                                            return newErrors
                                          })
                                        }
                                      }}
                                      placeholder="Seramik"
                                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 text-sm ${
                                        errors[`chapter_${index}_newProductMaterial`] 
                                          ? 'border-red-500 focus:ring-red-500' 
                                          : 'border-charcoal-900/20 focus:ring-gold-500'
                                      }`}
                                    />
                                    {errors[`chapter_${index}_newProductMaterial`] && (
                                      <p className="mt-1 text-xs text-red-600">{errors[`chapter_${index}_newProductMaterial`]}</p>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div>
                                  {loadingProducts ? (
                                    <p className="text-xs text-charcoal-600 py-2">Fincanlar yükleniyor...</p>
                                  ) : Array.isArray(products) && products.length > 0 ? (
                                    <select
                                      value={typeof chapter.productId === 'string' ? chapter.productId : (chapter.productId as any)?._id?.toString() || ''}
                                      onChange={(e) => {
                                        const selectedValue = e.target.value
                                        console.log('Fincan seçildi:', selectedValue, 'Bölüm:', index)
                                        updateChapter(index, 'productId', selectedValue)
                                        // Seçilen ürünün 6'lı takım fiyatını yükle
                                        const selectedProduct = products.find(p => p._id === selectedValue)
                                        if (selectedProduct) {
                                          updateChapter(index, 'setPrice', selectedProduct.setPrice)
                                        }
                                      }}
                                      className="w-full px-3 py-2 border border-charcoal-900/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 text-sm"
                                    >
                                      <option value="">Fincan seçin...</option>
                                      {products
                                        .filter(p => p.category === 'konsept')
                                        .map((product) => (
                                          <option key={product._id} value={product._id}>
                                            {product.name}
                                          </option>
                                        ))}
                                    </select>
                                  ) : (
                                    <p className="text-xs text-charcoal-600 py-2">
                                      {!Array.isArray(products) || products.length === 0 
                                        ? 'Henüz fincan bulunmamaktadır. Yeni fincan oluşturmayı seçebilirsiniz.' 
                                        : 'Fincanlar yükleniyor...'}
                                    </p>
                                  )}
                                </div>
                              )}
                            </>
                          )}
                        </>
                      )}
                      {errors[`chapter_${index}_productId`] && (
                        <p className="mt-1 text-xs text-red-600">{errors[`chapter_${index}_productId`]}</p>
                      )}
                    </div>

                    {/* 6'lı Takım Fiyatı - Fincan seçildiğinde göster */}
                    {((typeof chapter.productId === 'string' ? chapter.productId : (chapter.productId as any)?._id?.toString() || '') || (chapter as Chapter).createNewProduct) && (
                      <div data-field={`chapter_${index}_setPrice`}>
                        <label className="block text-xs font-medium text-charcoal-900 mb-1">
                          6'lı Takım Fiyatı (₺) * (Bu bölümün 6 fincanı)
                        </label>
                        <input
                          type="number"
                                      value={(chapter as Chapter).setPrice || ''}
                          onChange={(e) => {
                            updateChapter(index, 'setPrice', e.target.value ? parseFloat(e.target.value) : undefined)
                            if (errors[`chapter_${index}_setPrice`]) {
                              setErrors(prev => {
                                const newErrors = { ...prev }
                                delete newErrors[`chapter_${index}_setPrice`]
                                return newErrors
                              })
                            }
                          }}
                          placeholder="0"
                          min="0"
                          step="0.01"
                          required
                          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 text-sm ${
                            errors[`chapter_${index}_setPrice`] 
                              ? 'border-red-500 focus:ring-red-500' 
                              : 'border-charcoal-900/20 focus:ring-gold-500'
                          }`}
                        />
                        {errors[`chapter_${index}_setPrice`] && (
                          <p className="mt-1 text-xs text-red-600">{errors[`chapter_${index}_setPrice`]}</p>
                        )}
                        <p className="text-xs text-charcoal-500 mt-1">
                          Bu bölümün fincanından 6 adet satış fiyatı
                        </p>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-medium text-charcoal-900 mb-1">
                        Bölüm Görseli (Opsiyonel)
                      </label>
                      
                      {/* Dosya Yükleme Alanı */}
                      <div
                        onDragOver={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                        }}
                        onDrop={async (e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          const files = e.dataTransfer.files
                          if (files && files[0]) {
                            await handleChapterImageUpload(files[0], index)
                          }
                        }}
                        onClick={() => {
                          const input = chapterFileInputsRef.current[index]
                          if (input) input.click()
                        }}
                        className="border-2 border-dashed border-charcoal-900/20 rounded-lg p-4 mb-2 bg-cream-50 hover:border-gold-400 premium-transition cursor-pointer"
                      >
                        <input
                          ref={(el) => {
                            chapterFileInputsRef.current[index] = el
                          }}
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,image/webp"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              handleChapterImageUpload(file, index)
                            }
                          }}
                          className="hidden"
                        />
                        <div className="text-center">
                          <Upload size={32} className="mx-auto text-charcoal-400 mb-2" />
                          <p className="text-xs text-charcoal-600 mb-1">
                            Görseli sürükleyip bırakın veya tıklayın
                          </p>
                          <p className="text-xs text-charcoal-500">
                            JPG, PNG, WebP (Max 5MB)
                          </p>
                          {uploadingChapters[index] && (
                            <div className="mt-2 flex items-center justify-center gap-2">
                              <Loader2 size={16} className="animate-spin text-gold-600" />
                              <span className="text-xs text-charcoal-600">Yükleniyor...</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* URL ile Ekleme (Opsiyonel) */}
                      <input
                        type="text"
                         value={(chapter as Chapter).image || ''}
                        onChange={(e) => updateChapter(index, 'image', e.target.value)}
                        placeholder="Veya görsel URL'si ekle (opsiyonel)"
                        className="w-full px-3 py-2 border border-charcoal-900/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 text-sm"
                        onClick={(e) => e.stopPropagation()}
                      />
                      {(chapter as Chapter).image && (
                        <div className="mt-2 relative w-32 h-32 bg-cream-200 rounded overflow-hidden">
                          <img
                             src={(chapter as Chapter).image || ''}
                            alt="Bölüm görseli"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                            }}
                          />
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-charcoal-900 mb-1">
                        Trendyol Linki (Opsiyonel)
                      </label>
                      <input
                        type="url"
                        value={(chapter as Chapter).trendyolLink || ''}
                        onChange={(e) => {
                          const sanitized = sanitizeInput(e.target.value)
                          updateChapter(index, 'trendyolLink', sanitized)
                        }}
                        placeholder="https://www.trendyol.com/..."
                        className="w-full px-3 py-2 border border-charcoal-900/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 text-sm"
                      />
                      <p className="text-xs text-charcoal-500 mt-1">
                        Bu bölümün fincanı için Trendyol satış linki
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tüm Hikaye Takımı Fiyatı ve Trendyol Linki */}
          <div className="space-y-4">
            <div data-field="fullSetPrice">
              <label className="block text-sm font-medium text-charcoal-900 mb-2">
                Tüm Hikaye Takımı Fiyatı (₺) * (6 bölüm + 1 hediye fincan = 7 fincan)
              </label>
              <input
                type="number"
                value={formData.fullSetPrice || ''}
                onChange={(e) => {
                  setFormData({ ...formData, fullSetPrice: e.target.value ? parseFloat(e.target.value) : undefined })
                  if (errors.fullSetPrice) {
                    setErrors(prev => ({ ...prev, fullSetPrice: '' }))
                  }
                }}
                placeholder="0"
                min="0"
                step="0.01"
                required
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  errors.fullSetPrice 
                    ? 'border-red-500 focus:ring-red-500' 
                    : 'border-charcoal-900/20 focus:ring-gold-500'
                }`}
              />
              {errors.fullSetPrice && (
                <p className="mt-1 text-sm text-red-600">{errors.fullSetPrice}</p>
              )}
              <p className="text-xs text-charcoal-500 mt-1">
                6 bölümün fincanları (her birinden 6 adet) + 1 hediye fincan (kapak fotoğrafındaki) için toplam satış fiyatı
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-charcoal-900 mb-2">
                Tüm Hikaye Takımı Trendyol Linki (Opsiyonel)
              </label>
              <input
                type="url"
                value={formData.fullSetTrendyolLink || ''}
                onChange={(e) => {
                  const sanitized = sanitizeInput(e.target.value)
                  setFormData({ ...formData, fullSetTrendyolLink: sanitized })
                }}
                placeholder="https://www.trendyol.com/..."
                className="w-full px-4 py-2 border border-charcoal-900/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
              <p className="text-xs text-charcoal-500 mt-1">
                6 bölümün fincanları + 1 hediye fincan (kapak fotoğrafındaki) için Trendyol satış linki
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-4 h-4"
            />
            <label htmlFor="isActive" className="text-sm text-charcoal-900">
              Aktif
            </label>
          </div>

          <div className="flex justify-end gap-4 pt-4 border-t border-charcoal-900/10">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-charcoal-900/20 text-charcoal-900 rounded-lg hover:bg-cream-100 premium-transition"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-charcoal-900 text-cream-50 rounded-lg hover:bg-gold-500 premium-transition disabled:opacity-50"
            >
              {loading ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>

      {/* Bildirim */}
      {notification && (
        <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-5">
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg ${
              notification.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle size={20} className="text-green-600" />
            ) : (
              <AlertCircle size={20} className="text-red-600" />
            )}
            <p className="text-sm font-medium">{notification.message}</p>
            <button
              onClick={() => setNotification(null)}
              className="ml-2 text-charcoal-400 hover:text-charcoal-900"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Fincan Seçim Modal'ı */}
      {showProductModal && selectedChapterIndex !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-charcoal-900/10">
              <h3 className="text-lg font-serif font-semibold text-charcoal-900">
                Bu bölüme hangi fincan atanacak?
              </h3>
              <button
                onClick={() => {
                  setShowProductModal(false)
                  setSelectedChapterIndex(null)
                }}
                className="text-charcoal-400 hover:text-charcoal-900 premium-transition"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {loadingProducts ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={24} className="animate-spin text-gold-600" />
                  <span className="ml-2 text-charcoal-600">Yükleniyor...</span>
                </div>
              ) : (
                <>
                  {getAvailableProducts().length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-charcoal-600 mb-2">Uygun fincan bulunamadı.</p>
                      <p className="text-sm text-charcoal-500">
                        Bu hikaye için konsept tipinde fincan bulunmuyor.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {getAvailableProducts().map((product) => {
                        const isUsedInOtherChapter = formData.chapters.some(
                          (ch, idx) =>
                            idx !== selectedChapterIndex &&
                            (typeof ch.productId === 'string' ? ch.productId : (ch.productId as any)?._id?.toString() || '') === product._id &&
                            (typeof ch.productId === 'string' ? ch.productId : (ch.productId as any)?._id?.toString() || '').trim() !== ''
                        )
                        
                        return (
                          <button
                            key={product._id}
                            onClick={() => !isUsedInOtherChapter && handleSelectProduct(product._id)}
                            disabled={isUsedInOtherChapter || isUpdatingProduct}
                            className={`w-full text-left p-4 rounded-lg border-2 premium-transition ${
                              isUsedInOtherChapter
                                ? 'border-charcoal-200 bg-cream-50 opacity-50 cursor-not-allowed'
                                : 'border-charcoal-900/10 bg-white hover:border-gold-400 hover:bg-gold-50 cursor-pointer'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <p className="font-semibold text-charcoal-900">{product.name}</p>
                                {product.description && (
                                  <p className="text-sm text-charcoal-600 mt-1 line-clamp-2">
                                    {product.description}
                                  </p>
                                )}
                                {product.setPrice && (
                                  <p className="text-xs text-charcoal-500 mt-1">
                                    6'lı Takım: {product.setPrice.toLocaleString('tr-TR')} ₺
                                  </p>
                                )}
                              </div>
                              {isUsedInOtherChapter && (
                                <span className="text-xs text-red-600 font-medium ml-2">
                                  Başka bölümde kullanılıyor
                                </span>
                              )}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="p-6 border-t border-charcoal-900/10">
              <button
                onClick={() => {
                  setShowProductModal(false)
                  setSelectedChapterIndex(null)
                }}
                className="w-full px-4 py-2 bg-charcoal-900 text-cream-50 rounded-lg hover:bg-gold-500 premium-transition"
              >
                İptal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
