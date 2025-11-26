'use client'

import { useState, useEffect } from 'react'
import { Loader2, Mail, Eye, Archive, Trash2, MessageSquare, CheckCircle2, Clock, X, Search, Filter, Tag, Calendar, Send, Download } from 'lucide-react'
import { useToast } from '@/hooks/useToast'
import { logger as loggerClient } from '@/lib/logger-client'
import { exportData as exportDataUtil, formatDateForExport } from '@/lib/export'

interface ContactMessage {
  _id: string
  name: string
  email: string
  phone?: string
  subject: string
  message: string
  category?: 'soru' | 'oneri' | 'destek' | 'siparis' | 'sikayet'
  tags?: string[]
  status: 'pending' | 'read' | 'replied' | 'archived'
  adminNotes?: string
  createdAt: string
  updatedAt: string
}

const categoryConfig = {
  soru: { label: 'Soru', color: 'bg-blue-100 text-blue-800' },
  oneri: { label: 'Öneri', color: 'bg-purple-100 text-purple-800' },
  destek: { label: 'Destek', color: 'bg-green-100 text-green-800' },
  siparis: { label: 'Sipariş', color: 'bg-gold-100 text-gold-800' },
  sikayet: { label: 'Şikayet', color: 'bg-red-100 text-red-800' },
}

const tagConfig = {
  acil: { label: 'Acil', color: 'bg-red-100 text-red-800' },
  onemsiz: { label: 'Önemsiz', color: 'bg-gray-100 text-gray-800' },
  satis: { label: 'Satış', color: 'bg-green-100 text-green-800' },
  destek: { label: 'Destek', color: 'bg-blue-100 text-blue-800' },
  sikayet: { label: 'Şikayet', color: 'bg-orange-100 text-orange-800' },
}

const statusConfig = {
  pending: { label: 'Beklemede', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  read: { label: 'Okundu', color: 'bg-blue-100 text-blue-800', icon: Eye },
  replied: { label: 'Yanıtlandı', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
  archived: { label: 'Arşivlendi', color: 'bg-charcoal-100 text-charcoal-800', icon: Archive },
}

export default function ContactMessageManagement() {
  const [messages, setMessages] = useState<ContactMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'read' | 'replied' | 'archived'>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [tagFilter, setTagFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all')
  const [adminNotes, setAdminNotes] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')
  const [replyMessage, setReplyMessage] = useState('')
  const [replySubject, setReplySubject] = useState('')
  const [sendingReply, setSendingReply] = useState(false)
  const { success, error: showError } = useToast()


  const fetchMessages = async () => {
    try {
      const token = localStorage.getItem('admin_token')
      
      // Query parametrelerini oluştur
      const params = new URLSearchParams()
      if (filter !== 'all') params.append('status', filter)
      if (categoryFilter !== 'all') params.append('category', categoryFilter)
      if (tagFilter !== 'all') params.append('tag', tagFilter)
      if (searchQuery.trim()) params.append('search', searchQuery.trim())
      
      const res = await fetch(`/api/contact-messages?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: 'no-store',
      })
      const data = await res.json()
      
      if (data.success) {
        // API response formatı: { success: true, data: { messages: [...], pagination: {...} } }
        let messagesArray = data.data?.messages || data.data || []
        
        // Tarih filtresini client-side'da uygula
        if (dateFilter !== 'all' && Array.isArray(messagesArray)) {
          const now = new Date()
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
          const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
          
          messagesArray = messagesArray.filter((msg: ContactMessage) => {
            const msgDate = new Date(msg.createdAt)
            switch (dateFilter) {
              case 'today':
                return msgDate >= today
              case 'week':
                return msgDate >= weekAgo
              case 'month':
                return msgDate >= monthAgo
              default:
                return true
            }
          })
        }
        
        setMessages(Array.isArray(messagesArray) ? messagesArray : [])
      } else {
        setMessages([])
      }
    } catch (err) {
      loggerClient.error('Error fetching messages:', err)
      showError('Mesajlar yüklenirken bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }
  
  useEffect(() => {
    fetchMessages()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, categoryFilter, tagFilter, dateFilter])
  
  // Search için debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMessages()
    }, 500)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery])

  const updateStatus = async (id: string, status: ContactMessage['status']) => {
    try {
      const token = localStorage.getItem('admin_token')
      const res = await fetch(`/api/contact-messages/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      })

      const result = await res.json()

      if (result.success) {
        success('Durum başarıyla güncellendi')
        fetchMessages()
        if (selectedMessage?._id === id) {
          setSelectedMessage({ ...selectedMessage, status })
        }
      } else {
        showError(result.message || 'Bir hata oluştu')
      }
    } catch (err: any) {
      loggerClient.error('Error updating status:', err)
      showError('Durum güncellenirken bir hata oluştu')
    }
  }

  const updateNotes = async (id: string) => {
    try {
      const token = localStorage.getItem('admin_token')
      const res = await fetch(`/api/contact-messages/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ adminNotes: adminNotes.trim() || undefined }),
      })

      const result = await res.json()

      if (result.success) {
        success('Notlar başarıyla güncellendi')
        fetchMessages()
        if (selectedMessage?._id === id) {
          setSelectedMessage({ ...selectedMessage, adminNotes: adminNotes.trim() || undefined })
        }
        setAdminNotes('')
      } else {
        showError(result.message || 'Bir hata oluştu')
      }
    } catch (err: any) {
      loggerClient.error('Error updating notes:', err)
      showError('Notlar güncellenirken bir hata oluştu')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Bu mesajı silmek istediğinizden emin misiniz?')) return

    try {
      const token = localStorage.getItem('admin_token')
      const res = await fetch(`/api/contact-messages/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const result = await res.json()

      if (result.success) {
        success('Mesaj başarıyla silindi')
        fetchMessages()
        if (selectedMessage?._id === id) {
          setSelectedMessage(null)
        }
      } else {
        showError(result.message || 'Bir hata oluştu')
      }
    } catch (err: any) {
      loggerClient.error('Error deleting message:', err)
      showError('Mesaj silinirken bir hata oluştu')
    }
  }

  const updateTags = async (id: string, tags: string[]) => {
    try {
      const token = localStorage.getItem('admin_token')
      const res = await fetch(`/api/contact-messages/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tags }),
      })

      const result = await res.json()

      if (result.success) {
        success('Etiketler başarıyla güncellendi')
        fetchMessages()
        if (selectedMessage?._id === id) {
          setSelectedMessage({ ...selectedMessage, tags })
        }
      } else {
        showError(result.message || 'Bir hata oluştu')
      }
    } catch (err: any) {
      loggerClient.error('Error updating tags:', err)
      showError('Etiketler güncellenirken bir hata oluştu')
    }
  }

  const toggleTag = (tag: string) => {
    if (!selectedMessage) return
    const currentTags = selectedMessage.tags || []
    const newTags = currentTags.includes(tag)
      ? currentTags.filter(t => t !== tag)
      : [...currentTags, tag]
    updateTags(selectedMessage._id, newTags)
  }

  const filteredMessages = Array.isArray(messages) ? messages.filter((msg) => {
    if (filter !== 'all' && msg.status !== filter) return false
    if (categoryFilter !== 'all' && msg.category !== categoryFilter) return false
    if (tagFilter !== 'all' && (!msg.tags || !msg.tags.includes(tagFilter))) return false
    return true
  }) : []

  const getStatusConfig = (status: ContactMessage['status']) => {
    return statusConfig[status] || statusConfig.pending
  }

  const handleExport = (format: 'csv' | 'json' = 'csv') => {
    try {
      const dataToExport = filteredMessages.map(msg => ({
        'ID': msg._id,
        'İsim': msg.name,
        'E-posta': msg.email,
        'Telefon': msg.phone || '',
        'Konu': msg.subject,
        'Mesaj': msg.message,
        'Kategori': msg.category || '',
        'Etiketler': msg.tags?.join(', ') || '',
        'Durum': getStatusConfig(msg.status).label,
        'Oluşturulma': formatDateForExport(msg.createdAt),
        'Güncellenme': formatDateForExport(msg.updatedAt),
        'Admin Notları': msg.adminNotes || '',
      }))

      exportDataUtil(dataToExport, {
        filename: `iletisim-mesajlari-${new Date().toISOString().split('T')[0]}`,
        format,
      })
      
      success(`${format.toUpperCase()} formatında dışa aktarıldı`)
    } catch (error: any) {
      loggerClient.error('Export error:', error)
      showError('Dışa aktarma sırasında bir hata oluştu')
    }
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
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-serif font-semibold text-charcoal-900">
            İletişim Mesajları
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => handleExport('csv')}
              className="px-4 py-2 rounded-lg premium-transition text-sm bg-white border border-charcoal-900/20 text-charcoal-900 hover:bg-charcoal-900/5 flex items-center gap-2"
              title="CSV olarak dışa aktar"
            >
              <Download size={16} />
              CSV
            </button>
            <button
              onClick={() => handleExport('json')}
              className="px-4 py-2 rounded-lg premium-transition text-sm bg-white border border-charcoal-900/20 text-charcoal-900 hover:bg-charcoal-900/5 flex items-center gap-2"
              title="JSON olarak dışa aktar"
            >
              <Download size={16} />
              JSON
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`px-4 py-2 rounded-lg premium-transition text-sm ${
                viewMode === 'cards'
                  ? 'bg-charcoal-900 text-cream-50'
                  : 'bg-white border border-charcoal-900/20 text-charcoal-900 hover:bg-charcoal-900/5'
              }`}
            >
              Kartlar
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-4 py-2 rounded-lg premium-transition text-sm ${
                viewMode === 'table'
                  ? 'bg-charcoal-900 text-cream-50'
                  : 'bg-white border border-charcoal-900/20 text-charcoal-900 hover:bg-charcoal-900/5'
              }`}
            >
              Tablo
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-charcoal-400" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="İsim, e-posta, konu veya mesaj içeriğinde ara..."
              className="w-full pl-10 pr-4 py-2 border border-charcoal-900/20 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="space-y-3">
          {/* Status Filter */}
          <div className="flex gap-2 flex-wrap">
            <span className="text-sm font-medium text-charcoal-700 flex items-center gap-2 self-center">
              <Filter size={16} />
              Durum:
            </span>
            {(['all', 'pending', 'read', 'replied', 'archived'] as const).map((status) => {
              const config = status === 'all' ? null : getStatusConfig(status)
              const Icon = config?.icon || MessageSquare
              return (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg premium-transition text-sm ${
                    filter === status
                      ? 'bg-charcoal-900 text-cream-50'
                      : 'bg-white border border-charcoal-900/20 text-charcoal-900 hover:bg-charcoal-900/5'
                  }`}
                >
                  <Icon size={16} />
                  <span>
                    {status === 'all'
                      ? 'Tümü'
                      : config?.label}
                  </span>
                  {status !== 'all' && (
                    <span className="px-2 py-0.5 bg-white/20 rounded text-xs">
                      {Array.isArray(messages) ? messages.filter((m) => m.status === status).length : 0}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Category and Tag Filters */}
          <div className="flex gap-4 flex-wrap">
            {/* Category Filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-charcoal-700">Kategori:</span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 border border-charcoal-900/20 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent text-sm"
              >
                <option value="all">Tümü</option>
                <option value="soru">Soru</option>
                <option value="oneri">Öneri</option>
                <option value="destek">Destek</option>
                <option value="siparis">Sipariş</option>
                <option value="sikayet">Şikayet</option>
              </select>
            </div>

            {/* Tag Filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-charcoal-700">Etiket:</span>
              <select
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                className="px-3 py-2 border border-charcoal-900/20 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent text-sm"
              >
                <option value="all">Tümü</option>
                <option value="acil">Acil</option>
                <option value="onemsiz">Önemsiz</option>
                <option value="satis">Satış</option>
                <option value="destek">Destek</option>
                <option value="sikayet">Şikayet</option>
              </select>
            </div>

            {/* Date Filter */}
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-charcoal-700" />
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as any)}
                className="px-3 py-2 border border-charcoal-900/20 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent text-sm"
              >
                <option value="all">Tüm Zamanlar</option>
                <option value="today">Bugün</option>
                <option value="week">Son 7 Gün</option>
                <option value="month">Son 30 Gün</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Messages List */}
        <div className="lg:col-span-2">
          {filteredMessages.length === 0 ? (
            <div className="text-center py-12 glass-medium rounded-2xl">
              <p className="text-charcoal-600">Henüz mesaj bulunmuyor.</p>
            </div>
          ) : viewMode === 'table' ? (
            /* Table View */
            <div className="bg-white rounded-lg border border-charcoal-900/10 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-cream-100">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-charcoal-900 uppercase">Gönderen</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-charcoal-900 uppercase">Konu</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-charcoal-900 uppercase">Kategori</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-charcoal-900 uppercase">Durum</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-charcoal-900 uppercase">Tarih</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-charcoal-900 uppercase">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-charcoal-900/10">
                    {filteredMessages.map((message) => {
                      const statusCfg = getStatusConfig(message.status)
                      const StatusIcon = statusCfg.icon
                      return (
                        <tr
                          key={message._id}
                          onClick={() => {
                            setSelectedMessage(message)
                            setAdminNotes(message.adminNotes || '')
                          }}
                          className="hover:bg-cream-50 cursor-pointer"
                        >
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-charcoal-900">{message.name}</div>
                            <div className="text-xs text-charcoal-500">{message.email}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-charcoal-900">{message.subject}</div>
                            <div className="text-xs text-charcoal-500 line-clamp-1 mt-1">{message.message}</div>
                          </td>
                          <td className="px-6 py-4">
                            {message.category ? (
                              <span className={`px-2 py-1 rounded text-xs font-medium ${categoryConfig[message.category]?.color || 'bg-gray-100 text-gray-800'}`}>
                                {categoryConfig[message.category]?.label || message.category}
                              </span>
                            ) : (
                              <span className="text-xs text-charcoal-400">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 w-fit ${statusCfg.color}`}>
                              <StatusIcon size={12} />
                              {statusCfg.label}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-xs text-charcoal-600">
                              {new Date(message.createdAt).toLocaleDateString('tr-TR', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </div>
                            <div className="text-xs text-charcoal-400">
                              {new Date(message.createdAt).toLocaleTimeString('tr-TR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDelete(message._id)
                              }}
                              className="text-red-600 hover:text-red-700 premium-transition"
                              title="Sil"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Card View */
            <div className="space-y-4">
              {filteredMessages.map((message) => {
              const statusCfg = getStatusConfig(message.status)
              const StatusIcon = statusCfg.icon
              return (
                <div
                  key={message._id}
                  onClick={() => {
                    setSelectedMessage(message)
                    setAdminNotes(message.adminNotes || '')
                    setReplySubject(`Yanıt: ${message.subject}`)
                    setReplyMessage('')
                  }}
                  className={`glass-medium rounded-2xl shadow-depth-sm p-6 cursor-pointer hover:shadow-depth-md premium-transition ${
                    selectedMessage?._id === message._id ? 'ring-2 ring-gold-500' : ''
                  }`}
                >
                  <div className="flex justify-between items-start gap-4 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-charcoal-900 truncate">
                          {message.subject}
                        </h3>
                        {message.category && (
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${categoryConfig[message.category]?.color || 'bg-gray-100 text-gray-800'}`}>
                            {categoryConfig[message.category]?.label || message.category}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-charcoal-600 truncate">
                        {message.name} &lt;{message.email}&gt;
                      </p>
                      {message.tags && message.tags.length > 0 && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {message.tags.map((tag) => (
                            <span
                              key={tag}
                              className={`px-1.5 py-0.5 rounded text-xs ${tagConfig[tag as keyof typeof tagConfig]?.color || 'bg-gray-100 text-gray-800'}`}
                            >
                              {tagConfig[tag as keyof typeof tagConfig]?.label || tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${statusCfg.color}`}
                    >
                      <StatusIcon size={12} />
                      {statusCfg.label}
                    </span>
                  </div>
                  <p className="text-sm text-charcoal-700 line-clamp-2 mb-3">
                    {message.message}
                  </p>
                  <div className="flex items-center justify-between text-xs text-charcoal-500">
                    <span>
                      {new Date(message.createdAt).toLocaleDateString('tr-TR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {message.phone && (
                      <span className="flex items-center gap-1">
                        <Mail size={12} />
                        {message.phone}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
            </div>
          )}
        </div>

        {/* Message Detail */}
        {selectedMessage && (
          <div className="lg:col-span-1">
            <div className="glass-medium rounded-2xl shadow-depth-md p-6 sticky top-24">
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-lg font-semibold text-charcoal-900">Mesaj Detayı</h3>
                <button
                  onClick={() => setSelectedMessage(null)}
                  className="text-charcoal-400 hover:text-charcoal-900 premium-transition"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="text-xs font-medium text-charcoal-500 uppercase tracking-wide">
                    Gönderen
                  </label>
                  <p className="text-charcoal-900 font-medium">{selectedMessage.name}</p>
                  <a
                    href={`mailto:${selectedMessage.email}`}
                    className="text-sm text-gold-600 hover:text-gold-700 premium-transition"
                  >
                    {selectedMessage.email}
                  </a>
                  {selectedMessage.phone && (
                    <a
                      href={`tel:${selectedMessage.phone}`}
                      className="block text-sm text-charcoal-600 hover:text-gold-600 premium-transition"
                    >
                      {selectedMessage.phone}
                    </a>
                  )}
                </div>

                <div>
                  <label className="text-xs font-medium text-charcoal-500 uppercase tracking-wide">
                    Konu
                  </label>
                  <p className="text-charcoal-900">{selectedMessage.subject}</p>
                </div>

                {selectedMessage.category && (
                  <div>
                    <label className="text-xs font-medium text-charcoal-500 uppercase tracking-wide">
                      Kategori
                    </label>
                    <span className={`inline-block px-2 py-1 rounded text-sm font-medium ${categoryConfig[selectedMessage.category]?.color || 'bg-gray-100 text-gray-800'}`}>
                      {categoryConfig[selectedMessage.category]?.label || selectedMessage.category}
                    </span>
                  </div>
                )}

                <div>
                  <label className="text-xs font-medium text-charcoal-500 uppercase tracking-wide">
                    Mesaj
                  </label>
                  <p className="text-charcoal-700 whitespace-pre-wrap">
                    {selectedMessage.message}
                  </p>
                </div>

                <div>
                  <label className="text-xs font-medium text-charcoal-500 uppercase tracking-wide">
                    Tarih
                  </label>
                  <p className="text-sm text-charcoal-600">
                    {new Date(selectedMessage.createdAt).toLocaleString('tr-TR')}
                  </p>
                </div>
              </div>

              {/* Status Actions */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-charcoal-900 mb-2">
                  Durum
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['pending', 'read', 'replied', 'archived'] as const).map((status) => {
                    const cfg = getStatusConfig(status)
                    const Icon = cfg.icon
                    return (
                      <button
                        key={status}
                        onClick={() => updateStatus(selectedMessage._id, status)}
                        disabled={selectedMessage.status === status}
                        className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg premium-transition text-sm ${
                          selectedMessage.status === status
                            ? `${cfg.color} cursor-not-allowed`
                            : 'bg-white border border-charcoal-900/20 hover:bg-charcoal-900/5'
                        }`}
                      >
                        <Icon size={14} />
                        {cfg.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Tags Management */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-charcoal-900 mb-2">
                  Etiketler
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {Object.entries(tagConfig).map(([tag, config]) => {
                    const isSelected = selectedMessage.tags?.includes(tag) || false
                    return (
                      <button
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium premium-transition ${
                          isSelected
                            ? `${config.color} ring-2 ring-gold-500`
                            : 'bg-white border border-charcoal-900/20 text-charcoal-700 hover:bg-charcoal-900/5'
                        }`}
                      >
                        <Tag size={12} className="inline mr-1" />
                        {config.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Reply Section */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-charcoal-900 mb-2">
                  Müşteriye Yanıt Gönder
                </label>
                <input
                  type="text"
                  value={replySubject}
                  onChange={(e) => setReplySubject(e.target.value)}
                  placeholder="Yanıt konusu"
                  className="w-full px-4 py-2 border border-charcoal-900/20 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent mb-2 text-sm"
                />
                <textarea
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 border border-charcoal-900/20 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent resize-none text-sm"
                  placeholder="Müşteriye göndermek istediğiniz yanıt mesajını yazın..."
                />
                <button
                  onClick={async () => {
                    if (!replyMessage.trim()) {
                      showError('Lütfen yanıt mesajı yazın')
                      return
                    }
                    setSendingReply(true)
                    try {
                      const token = localStorage.getItem('admin_token')
                      const res = await fetch(`/api/contact-messages/${selectedMessage._id}/reply`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({
                          replyMessage,
                          replySubject: replySubject || `Yanıt: ${selectedMessage.subject}`,
                        }),
                      })
                      const result = await res.json()
                      if (result.success) {
                        success('Yanıt mesajı başarıyla gönderildi')
                        setReplyMessage('')
                        fetchMessages()
                        if (selectedMessage) {
                          setSelectedMessage({ ...selectedMessage, status: 'replied' })
                        }
                      } else {
                        showError(result.message || 'Yanıt gönderilirken bir hata oluştu')
                      }
                    } catch (err: any) {
                      loggerClient.error('Error sending reply:', err)
                      showError('Yanıt gönderilirken bir hata oluştu')
                    } finally {
                      setSendingReply(false)
                    }
                  }}
                  disabled={sendingReply || !replyMessage.trim()}
                  className="mt-2 w-full px-4 py-2 bg-gold-500 text-charcoal-900 rounded-lg premium-transition hover:bg-gold-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm font-medium"
                >
                  {sendingReply ? (
                    <>
                      <Loader2 className="animate-spin" size={16} />
                      Gönderiliyor...
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      Yanıt Gönder
                    </>
                  )}
                </button>
              </div>

              {/* Admin Notes */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-charcoal-900 mb-2">
                  Admin Notları
                </label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 border border-charcoal-900/20 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent resize-none"
                  placeholder="Notlarınızı buraya yazın..."
                />
                <button
                  onClick={() => updateNotes(selectedMessage._id)}
                  className="mt-2 w-full px-4 py-2 bg-charcoal-900 text-cream-50 rounded-lg premium-transition hover:bg-gold-500 hover:text-charcoal-900 text-sm"
                >
                  Notları Kaydet
                </button>
              </div>

              {/* Delete Button */}
              <button
                onClick={() => handleDelete(selectedMessage._id)}
                className="w-full px-4 py-2 border-2 border-red-200 text-red-600 rounded-lg premium-transition hover:bg-red-50 flex items-center justify-center gap-2"
              >
                <Trash2 size={16} />
                Mesajı Sil
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

