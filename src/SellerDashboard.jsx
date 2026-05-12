import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import {
  Package, Plus, Trash2, Edit3, Save, X, Check, Loader2,
  ShoppingBag, Eye, EyeOff, Clock, CheckCircle, XCircle,
  Settings, LogOut, Copy, Image as ImageIcon, Phone, User, MapPin,
  CreditCard, TrendingUp, Layers, Link as LinkIcon, Lock, Store, Palette,
  ChevronDown, ExternalLink, BarChart3, Tag, Search, RefreshCw, ChevronLeft,
  Megaphone, GalleryHorizontal, ArrowUp, ArrowDown, Type
} from 'lucide-react'
import { THEME_LIST, DEFAULT_THEME } from './storeThemes'

const STATUS_MAP = {
  pending:   { label: 'جديد',       color: 'bg-amber-50 text-amber-700 border-amber-200',     dot: 'bg-amber-400', icon: Clock },
  confirmed: { label: 'مؤكد',       color: 'bg-blue-50 text-blue-700 border-blue-200',        dot: 'bg-blue-400',  icon: CheckCircle },
  delivered: { label: 'تم التوصيل', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-400', icon: CheckCircle },
  cancelled: { label: 'ملغي',       color: 'bg-red-50 text-red-600 border-red-200',           dot: 'bg-red-400',   icon: XCircle },
}
const formatNum = (n) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')

export default function SellerDashboard() {
  const navigate = useNavigate()
  const [store, setStore] = useState(null)
  const [initLoading, setInitLoading] = useState(true)

  const [tab, setTab] = useState('products')
  const [selectedTheme, setSelectedTheme] = useState('')
  const [themeSaving, setThemeSaving] = useState(false)
  const [products, setProducts] = useState([])
  const [orders, setOrders] = useState([])
  const [orderItems, setOrderItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)
  const [orderFilter, setOrderFilter] = useState('all')

  // Product form
  const [showProductForm, setShowProductForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [pName, setPName] = useState('')
  const [pPrice, setPPrice] = useState('')
  const [pDesc, setPDesc] = useState('')
  const [pStock, setPStock] = useState('')
  const [pImage, setPImage] = useState('')
  const [pCategory, setPCategory] = useState('')
  const [showCatDropdown, setShowCatDropdown] = useState(false)
  const [pSaving, setPSaving] = useState(false)
  const [imageUploading, setImageUploading] = useState(false)
  const fileRef = useRef()

  // Store settings
  const [showSettings, setShowSettings] = useState(false)
  const [sName, setSName] = useState('')
  const [sDesc, setSDesc] = useState('')
  const [sDelivery, setSDelivery] = useState('')
  const [sSlug, setSSlug] = useState('')
  const [sPassword, setSPassword] = useState('')
  const [sLogo, setSLogo] = useState('')
  const [sSaving, setSSaving] = useState(false)
  const logoRef = useRef()

  const [copiedLink, setCopiedLink] = useState(false)
  const [expandedOrder, setExpandedOrder] = useState(null)

  // Banners
  const [banners, setBanners] = useState([])
  const [showBannerForm, setShowBannerForm] = useState(false)
  const [editingBanner, setEditingBanner] = useState(null)
  const [bImage, setBImage] = useState('')
  const [bTitle, setBTitle] = useState('')
  const [bSubtitle, setBSubtitle] = useState('')
  const [bBgColor, setBBgColor] = useState('#10b981')
  const [bTextColor, setBTextColor] = useState('#ffffff')
  const [bSaving, setBSaving] = useState(false)
  const [bImageUploading, setBImageUploading] = useState(false)
  const bannerFileRef = useRef()

  const showToastMsg = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 2500)
  }

  useEffect(() => {
    const saved = localStorage.getItem('afrzli_seller')
    if (saved) {
      try {
        const s = JSON.parse(saved)
        if (s && s.id) {
          supabase.from('stores').select('*').eq('id', s.id).single().then(({ data }) => {
            if (data) {
              setStore(data)
              localStorage.setItem('afrzli_seller', JSON.stringify(data))
              loadData(data.id)
            } else {
              localStorage.removeItem('afrzli_seller')
              navigate('/', { replace: true })
            }
            setInitLoading(false)
          })
          return
        }
      } catch {}
    }
    setInitLoading(false)
    navigate('/', { replace: true })
  }, [navigate])

  const loadData = async (storeId) => {
    setLoading(true)
    const [prodsRes, ordersRes, itemsRes, bannersRes] = await Promise.all([
      supabase.from('products').select('*').eq('store_id', storeId).order('created_at', { ascending: false }),
      supabase.from('store_orders').select('*').eq('store_id', storeId).order('created_at', { ascending: false }),
      supabase.from('store_order_items').select('*'),
      supabase.from('store_banners').select('*').eq('store_id', storeId).order('sort_order', { ascending: true }),
    ])
    setProducts(prodsRes.data || [])
    setOrders(ordersRes.data || [])
    setOrderItems(itemsRes.data || [])
    setBanners(bannersRes.data || [])
    setLoading(false)
  }

  const handleLogout = () => {
    localStorage.removeItem('afrzli_seller')
    navigate('/', { replace: true })
  }

  // ─── Product CRUD ───
  const openAddProduct = () => {
    setEditingProduct(null)
    setPName(''); setPPrice(''); setPDesc(''); setPStock(''); setPImage(''); setPCategory('')
    setShowProductForm(true)
  }

  const openEditProduct = (p) => {
    setEditingProduct(p)
    setPName(p.name); setPPrice(String(p.price)); setPDesc(p.description || ''); setPStock(String(p.stock || 0)); setPImage(p.image || ''); setPCategory(p.category || '')
    setShowProductForm(true)
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageUploading(true)
    const ext = file.name.split('.').pop()
    const path = `store-products/${store.id}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('order-images').upload(path, file)
    if (!error) {
      const { data } = supabase.storage.from('order-images').getPublicUrl(path)
      setPImage(data.publicUrl)
    }
    setImageUploading(false)
  }

  const saveProduct = async () => {
    if (!pName.trim() || !pPrice.trim()) { showToastMsg('أدخل اسم المنتج والسعر', 'error'); return }
    setPSaving(true)
    const payload = {
      store_id: store.id,
      name: pName.trim(),
      price: parseFloat(pPrice),
      description: pDesc.trim(),
      stock: parseInt(pStock) || 0,
      image: pImage,
      category: pCategory.trim(),
      is_active: true,
    }
    if (editingProduct) {
      await supabase.from('products').update(payload).eq('id', editingProduct.id)
    } else {
      await supabase.from('products').insert(payload)
    }
    setPSaving(false)
    setShowProductForm(false)
    showToastMsg(editingProduct ? 'تم تحديث المنتج' : 'تمت إضافة المنتج')
    loadData(store.id)
  }

  const toggleProduct = async (p) => {
    await supabase.from('products').update({ is_active: !p.is_active }).eq('id', p.id)
    loadData(store.id)
  }

  const deleteProduct = async (p) => {
    if (!window.confirm(`حذف "${p.name}"؟`)) return
    await supabase.from('products').delete().eq('id', p.id)
    showToastMsg('تم حذف المنتج')
    loadData(store.id)
  }

  // ─── Order status ───
  const updateOrderStatus = async (orderId, status) => {
    await supabase.from('store_orders').update({ status }).eq('id', orderId)
    loadData(store.id)
  }

  // ─── Store settings ───
  const openSettings = () => {
    setSName(store.name)
    setSDesc(store.description || '')
    setSDelivery(String(store.delivery_price || 0))
    setSSlug(store.slug || '')
    setSPassword(store.password || '')
    setSLogo(store.logo || '')
    setShowSettings(true)
  }

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const ext = file.name.split('.').pop()
    const path = `store-logos/${store.id}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('order-images').upload(path, file, { upsert: true })
    if (error) {
      console.error('Logo upload error:', error)
      showToastMsg('فشل رفع الشعار: ' + error.message, 'error')
      return
    }
    const { data } = supabase.storage.from('order-images').getPublicUrl(path)
    setSLogo(data.publicUrl)
    showToastMsg('تم رفع الشعار')
  }

  const saveSettings = async () => {
    if (!sName.trim()) { showToastMsg('اسم المتجر مطلوب', 'error'); return }
    if (!sSlug.trim()) { showToastMsg('رابط المتجر مطلوب', 'error'); return }
    if (!sPassword.trim()) { showToastMsg('كلمة المرور مطلوبة', 'error'); return }
    setSSaving(true)
    const slug = sSlug.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '')
    await supabase.from('stores').update({
      name: sName.trim(),
      description: sDesc.trim(),
      delivery_price: parseFloat(sDelivery) || 0,
      slug: slug,
      password: sPassword.trim(),
      logo: sLogo,
    }).eq('id', store.id)
    const { data } = await supabase.from('stores').select('*').eq('id', store.id).single()
    setStore(data)
    localStorage.setItem('afrzli_seller', JSON.stringify(data))
    setSSaving(false)
    setShowSettings(false)
    showToastMsg('تم حفظ الإعدادات')
  }

  // ─── Banner CRUD ───
  const openAddBanner = () => {
    setEditingBanner(null)
    setBImage(''); setBTitle(''); setBSubtitle(''); setBBgColor('#10b981'); setBTextColor('#ffffff')
    setShowBannerForm(true)
  }

  const openEditBanner = (b) => {
    setEditingBanner(b)
    setBImage(b.image || ''); setBTitle(b.title || ''); setBSubtitle(b.subtitle || ''); setBBgColor(b.bg_color || '#10b981'); setBTextColor(b.text_color || '#ffffff')
    setShowBannerForm(true)
  }

  const handleBannerImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setBImageUploading(true)
    const ext = file.name.split('.').pop()
    const path = `store-banners/${store.id}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('order-images').upload(path, file, { upsert: true })
    if (error) {
      showToastMsg('فشل رفع الصورة', 'error')
      setBImageUploading(false)
      return
    }
    const { data } = supabase.storage.from('order-images').getPublicUrl(path)
    setBImage(data.publicUrl)
    setBImageUploading(false)
  }

  const saveBanner = async () => {
    if (!bImage && !bTitle.trim()) { showToastMsg('أضف صورة أو عنوان على الأقل', 'error'); return }
    setBSaving(true)
    const payload = {
      store_id: store.id,
      image: bImage,
      title: bTitle.trim(),
      subtitle: bSubtitle.trim(),
      bg_color: bBgColor,
      text_color: bTextColor,
      sort_order: editingBanner ? editingBanner.sort_order : banners.length,
      is_active: true,
    }
    if (editingBanner) {
      await supabase.from('store_banners').update(payload).eq('id', editingBanner.id)
    } else {
      await supabase.from('store_banners').insert(payload)
    }
    setBSaving(false)
    setShowBannerForm(false)
    showToastMsg(editingBanner ? 'تم تحديث البانر' : 'تمت إضافة البانر')
    loadData(store.id)
  }

  const deleteBanner = async (b) => {
    if (!window.confirm('حذف هذا البانر؟')) return
    await supabase.from('store_banners').delete().eq('id', b.id)
    showToastMsg('تم حذف البانر')
    loadData(store.id)
  }

  const toggleBanner = async (b) => {
    await supabase.from('store_banners').update({ is_active: !b.is_active }).eq('id', b.id)
    loadData(store.id)
  }

  const moveBanner = async (b, direction) => {
    const sorted = [...banners].sort((a, b2) => a.sort_order - b2.sort_order)
    const idx = sorted.findIndex(x => x.id === b.id)
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= sorted.length) return
    const other = sorted[swapIdx]
    await Promise.all([
      supabase.from('store_banners').update({ sort_order: other.sort_order }).eq('id', b.id),
      supabase.from('store_banners').update({ sort_order: b.sort_order }).eq('id', other.id),
    ])
    loadData(store.id)
  }

  const copyStoreLink = () => {
    const link = `https://afrzle.netlify.app/${store.slug}`
    navigator.clipboard.writeText(link)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  const inputClass = "w-full h-12 px-4 bg-white border border-gray-200 rounded-2xl text-sm outline-none transition-all hover:border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"

  // ─── Loading ───
  if (initLoading || !store) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          <span className="text-sm text-gray-400">جاري التحميل...</span>
        </div>
      </div>
    )
  }

  // ─── Stats ───
  const pendingOrders = orders.filter(o => o.status === 'pending').length
  const confirmedOrders = orders.filter(o => o.status === 'confirmed').length
  const totalRevenue = orders.filter(o => o.status === 'delivered').reduce((s, o) => s + Number(o.total || 0), 0)
  const filteredOrders = orderFilter === 'all' ? orders : orders.filter(o => o.status === orderFilter)

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">

      {/* ═══════════════════ HEADER ═══════════════════ */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {store.logo ? (
              <img src={store.logo} alt="" className="w-9 h-9 rounded-xl object-cover" />
            ) : (
              <div className="w-9 h-9 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center shadow-sm">
                <Store className="w-4.5 h-4.5 text-white" />
              </div>
            )}
            <div>
              <h1 className="text-sm font-bold text-gray-900 leading-tight">{store.name}</h1>
              <p className="text-[11px] text-gray-400 leading-tight">لوحة التحكم</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => loadData(store.id)} className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all" title="تحديث">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={openSettings} className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all">
              <Settings className="w-4 h-4" />
            </button>
            <button onClick={handleLogout} className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-5 pb-28">

        {/* ═══════════════════ STORE LINK BANNER ═══════════════════ */}
        <div className="bg-gradient-to-l from-emerald-500 to-emerald-600 rounded-2xl p-4 mb-5 shadow-sm shadow-emerald-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-[11px] mb-1">رابط متجرك</p>
              <p className="text-white text-sm font-medium" dir="ltr">afrzle.netlify.app/{store.slug}</p>
            </div>
            <div className="flex items-center gap-2">
              <a href={`https://afrzle.netlify.app/${store.slug}`} target="_blank" rel="noopener noreferrer"
                className="w-10 h-10 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center text-white hover:bg-white/30 transition-all">
                <ExternalLink className="w-4 h-4" />
              </a>
              <button onClick={copyStoreLink}
                className="h-10 px-4 bg-white rounded-xl flex items-center gap-1.5 text-emerald-600 text-xs font-semibold hover:bg-emerald-50 transition-all shadow-sm">
                {copiedLink ? <><Check className="w-3.5 h-3.5" /> تم!</> : <><Copy className="w-3.5 h-3.5" /> نسخ</>}
              </button>
            </div>
          </div>
        </div>

        {/* ═══════════════════ STATS ═══════════════════ */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center">
                <Package className="w-4 h-4 text-blue-500" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{products.length}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">منتج</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-amber-50 rounded-xl flex items-center justify-center">
                <Clock className="w-4 h-4 text-amber-500" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{pendingOrders}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">طلب جديد</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-emerald-50 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatNum(totalRevenue)}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">مبيعات (د.ع)</p>
          </div>
        </div>

        {/* ═══════════════════ TABS ═══════════════════ */}
        <div className="flex gap-1 bg-white rounded-2xl p-1.5 mb-6 border border-gray-100 shadow-sm">
          {[
            { key: 'products', label: 'المنتجات', icon: Package, badge: products.length },
            { key: 'orders',   label: 'الطلبات',  icon: ShoppingBag, badge: pendingOrders },
            { key: 'banners',  label: 'البانرات', icon: GalleryHorizontal },
            { key: 'theme',    label: 'التصميم',  icon: Palette },
          ].map(t => (
            <button key={t.key} onClick={() => { setTab(t.key); if (t.key === 'theme') setSelectedTheme(store.theme || DEFAULT_THEME) }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-sm font-semibold transition-all relative ${
                tab === t.key
                  ? 'bg-gray-900 text-white shadow-sm'
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
              }`}>
              <t.icon className="w-4 h-4" />
              <span>{t.label}</span>
              {t.badge > 0 && tab !== t.key && (
                <span className="absolute -top-1 -left-1 w-5 h-5 bg-emerald-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{t.badge}</span>
              )}
            </button>
          ))}
        </div>

        {/* ═══════════════════ PRODUCTS TAB ═══════════════════ */}
        {tab === 'products' && (
          <div className="space-y-4">
            <button onClick={openAddProduct}
              className="w-full bg-white border-2 border-dashed border-gray-200 rounded-2xl py-5 flex items-center justify-center gap-2.5 text-gray-400 text-sm font-semibold hover:border-emerald-300 hover:text-emerald-500 hover:bg-emerald-50/30 transition-all group">
              <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                <Plus className="w-5 h-5 group-hover:text-emerald-500" />
              </div>
              إضافة منتج جديد
            </button>

            {products.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-gray-100 rounded-3xl flex items-center justify-center mx-auto mb-4">
                  <Package className="w-9 h-9 text-gray-300" />
                </div>
                <p className="text-sm font-medium text-gray-400">لا توجد منتجات بعد</p>
                <p className="text-xs text-gray-300 mt-1">أضف أول منتج لمتجرك!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {products.map(p => (
                  <div key={p.id}
                    className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all hover:shadow-md ${!p.is_active ? 'opacity-50' : ''}`}>
                    <div className="flex items-center gap-3 p-3">
                      {/* Thumbnail */}
                      {p.image ? (
                        <img src={p.image} alt="" className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          <Package className="w-6 h-6 text-gray-300" />
                        </div>
                      )}
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">{p.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-semibold text-emerald-600">{formatNum(p.price)} د.ع</span>
                          {p.category && (
                            <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{p.category}</span>
                          )}
                        </div>
                        {p.stock > 0 && <p className="text-[11px] text-gray-400 mt-0.5">المخزون: {p.stock}</p>}
                      </div>
                      {/* Actions */}
                      <div className="flex items-center gap-0.5">
                        <button onClick={() => toggleProduct(p)}
                          className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-gray-100 transition-colors" title={p.is_active ? 'إخفاء' : 'إظهار'}>
                          {p.is_active ? <Eye className="w-4 h-4 text-emerald-500" /> : <EyeOff className="w-4 h-4 text-gray-300" />}
                        </button>
                        <button onClick={() => openEditProduct(p)}
                          className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-blue-50 transition-colors" title="تعديل">
                          <Edit3 className="w-4 h-4 text-blue-500" />
                        </button>
                        <button onClick={() => deleteProduct(p)}
                          className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-red-50 transition-colors" title="حذف">
                          <Trash2 className="w-4 h-4 text-gray-300 hover:text-red-500" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════ ORDERS TAB ═══════════════════ */}
        {tab === 'orders' && (
          <div className="space-y-4">
            {/* Order Filters */}
            <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              {[
                { key: 'all',       label: 'الكل',        count: orders.length },
                { key: 'pending',   label: 'جديد',        count: pendingOrders },
                { key: 'confirmed', label: 'مؤكد',        count: confirmedOrders },
                { key: 'delivered', label: 'تم التوصيل', count: orders.filter(o => o.status === 'delivered').length },
                { key: 'cancelled', label: 'ملغي',        count: orders.filter(o => o.status === 'cancelled').length },
              ].map(f => (
                <button key={f.key} onClick={() => setOrderFilter(f.key)}
                  className={`flex-shrink-0 h-9 px-3.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    orderFilter === f.key
                      ? 'bg-gray-900 text-white shadow-sm'
                      : 'bg-white text-gray-400 border border-gray-200 hover:border-gray-300'
                  }`}>
                  {f.label}
                  {f.count > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      orderFilter === f.key ? 'bg-white/20' : 'bg-gray-100'
                    }`}>{f.count}</span>
                  )}
                </button>
              ))}
            </div>

            {filteredOrders.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-gray-100 rounded-3xl flex items-center justify-center mx-auto mb-4">
                  <ShoppingBag className="w-9 h-9 text-gray-300" />
                </div>
                <p className="text-sm font-medium text-gray-400">لا توجد طلبات</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredOrders.map(o => {
                  const st = STATUS_MAP[o.status] || STATUS_MAP.pending
                  const items = orderItems.filter(i => i.order_id === o.id)
                  const isExpanded = expandedOrder === o.id
                  return (
                    <div key={o.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all hover:shadow-md">
                      {/* Order Header — clickable */}
                      <button onClick={() => setExpandedOrder(isExpanded ? null : o.id)}
                        className="w-full flex items-center gap-3 p-4 text-right">
                        {/* Status dot */}
                        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${st.dot}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-gray-900">{o.customer_name}</p>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${st.color}`}>{st.label}</span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-400">
                            <span>{o.city}{o.region ? ` — ${o.region}` : ''}</span>
                            <span>{new Date(o.created_at).toLocaleDateString('ar-IQ')}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-sm font-bold text-gray-900">{formatNum(o.total || 0)}</span>
                          <ChevronDown className={`w-4 h-4 text-gray-300 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </div>
                      </button>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="border-t border-gray-100 p-4 space-y-3 bg-gray-50/50">
                          {/* Contact */}
                          <div className="flex items-center gap-4 text-xs">
                            <a href={`tel:${o.customer_phone}`} className="flex items-center gap-1.5 text-gray-500 hover:text-emerald-600 transition-colors">
                              <Phone className="w-3.5 h-3.5" /> <span dir="ltr">{o.customer_phone}</span>
                            </a>
                            {o.address && (
                              <span className="flex items-center gap-1.5 text-gray-400">
                                <MapPin className="w-3.5 h-3.5" /> {o.address}
                              </span>
                            )}
                          </div>

                          {/* Items */}
                          {items.length > 0 && (
                            <div className="bg-white rounded-xl p-3 space-y-2 border border-gray-100">
                              {items.map(it => (
                                <div key={it.id} className="flex justify-between text-xs">
                                  <span className="text-gray-600">{it.product_name} <span className="text-gray-400">× {it.quantity}</span></span>
                                  <span className="text-gray-900 font-semibold">{formatNum(it.price * it.quantity)}</span>
                                </div>
                              ))}
                              <div className="border-t border-gray-100 pt-2 flex justify-between text-xs">
                                <span className="text-gray-400">التوصيل</span>
                                <span className="text-gray-600">{formatNum(o.delivery_price || 0)}</span>
                              </div>
                              {o.coupon_code && (
                                <div className="flex justify-between text-xs">
                                  <span className="text-emerald-600">كوبون: {o.coupon_code}</span>
                                  <span className="text-emerald-600">-{formatNum(o.coupon_discount || 0)}</span>
                                </div>
                              )}
                              <div className="border-t border-gray-100 pt-2 flex justify-between text-sm">
                                <span className="font-bold text-gray-900">الإجمالي</span>
                                <span className="font-bold text-gray-900">{formatNum((o.total || 0) + (o.delivery_price || 0) - (o.coupon_discount || 0))} د.ع</span>
                              </div>
                            </div>
                          )}

                          {/* Actions */}
                          {o.status === 'pending' && (
                            <div className="flex gap-2">
                              <button onClick={() => updateOrderStatus(o.id, 'confirmed')}
                                className="flex-1 h-11 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition-all active:scale-[0.98]">
                                تأكيد الطلب
                              </button>
                              <button onClick={() => updateOrderStatus(o.id, 'cancelled')}
                                className="h-11 px-5 bg-white text-red-500 text-sm font-semibold rounded-xl border border-gray-200 hover:bg-red-50 hover:border-red-200 transition-all">
                                إلغاء
                              </button>
                            </div>
                          )}
                          {o.status === 'confirmed' && (
                            <button onClick={() => updateOrderStatus(o.id, 'delivered')}
                              className="w-full h-11 bg-emerald-500 text-white text-sm font-semibold rounded-xl hover:bg-emerald-600 transition-all active:scale-[0.98] flex items-center justify-center gap-2">
                              <CheckCircle className="w-4 h-4" /> تم التوصيل
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════ BANNERS TAB ═══════════════════ */}
        {tab === 'banners' && (
          <div className="space-y-4">
            {banners.length < 5 && (
              <button onClick={openAddBanner}
                className="w-full bg-white border-2 border-dashed border-gray-200 rounded-2xl py-5 flex items-center justify-center gap-2.5 text-gray-400 text-sm font-semibold hover:border-emerald-300 hover:text-emerald-500 hover:bg-emerald-50/30 transition-all group">
                <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                  <Plus className="w-5 h-5 group-hover:text-emerald-500" />
                </div>
                إضافة بانر جديد
              </button>
            )}

            {banners.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-gray-100 rounded-3xl flex items-center justify-center mx-auto mb-4">
                  <GalleryHorizontal className="w-9 h-9 text-gray-300" />
                </div>
                <p className="text-sm font-medium text-gray-400">لا توجد بانرات بعد</p>
                <p className="text-xs text-gray-300 mt-1">أضف بانر ترويجي يظهر كسلايدر في أعلى متجرك</p>
              </div>
            ) : (
              <div className="space-y-3">
                {banners.sort((a, b) => a.sort_order - b.sort_order).map((b, idx) => (
                  <div key={b.id} className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all ${!b.is_active ? 'opacity-50' : ''}`}>
                    {/* Banner Preview */}
                    <div className="relative h-28 rounded-t-2xl overflow-hidden" style={{ backgroundColor: b.bg_color || '#10b981' }}>
                      {b.image ? (
                        <img src={b.image} alt="" className="w-full h-full object-cover" />
                      ) : null}
                      {(b.title || b.subtitle) && (
                        <div className={`absolute inset-0 flex flex-col justify-center px-5 ${b.image ? 'bg-black/30' : ''}`}>
                          {b.title && <p className="text-base font-bold truncate" style={{ color: b.text_color || '#fff' }}>{b.title}</p>}
                          {b.subtitle && <p className="text-xs mt-0.5 truncate opacity-80" style={{ color: b.text_color || '#fff' }}>{b.subtitle}</p>}
                        </div>
                      )}
                      {/* Sort order badge */}
                      <span className="absolute top-2 left-2 w-6 h-6 bg-black/40 backdrop-blur rounded-lg flex items-center justify-center text-white text-[10px] font-bold">{idx + 1}</span>
                    </div>
                    {/* Actions */}
                    <div className="flex items-center justify-between p-2.5">
                      <div className="flex items-center gap-1">
                        <button onClick={() => moveBanner(b, 'up')} disabled={idx === 0}
                          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors disabled:opacity-30">
                          <ArrowUp className="w-3.5 h-3.5 text-gray-400" />
                        </button>
                        <button onClick={() => moveBanner(b, 'down')} disabled={idx === banners.length - 1}
                          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors disabled:opacity-30">
                          <ArrowDown className="w-3.5 h-3.5 text-gray-400" />
                        </button>
                      </div>
                      <div className="flex items-center gap-0.5">
                        <button onClick={() => toggleBanner(b)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors">
                          {b.is_active ? <Eye className="w-4 h-4 text-emerald-500" /> : <EyeOff className="w-4 h-4 text-gray-300" />}
                        </button>
                        <button onClick={() => openEditBanner(b)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-blue-50 transition-colors">
                          <Edit3 className="w-4 h-4 text-blue-500" />
                        </button>
                        <button onClick={() => deleteBanner(b)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-50 transition-colors">
                          <Trash2 className="w-4 h-4 text-gray-300 hover:text-red-500" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
              <p className="text-xs text-gray-400 leading-relaxed">💡 البانرات تظهر كسلايدر متحرك في أعلى المتجر — يتنقل تلقائياً كل 3 ثوانٍ. يمكنك إضافة حتى 5 بانرات.</p>
            </div>
          </div>
        )}

        {/* ═══════════════════ THEME TAB ═══════════════════ */}
        {tab === 'theme' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
              <p className="text-sm font-semibold text-gray-900 mb-1">تصميم المتجر</p>
              <p className="text-xs text-gray-400">اختر التصميم المناسب — سيتغير شكل المتجر فوراً للعملاء</p>
            </div>

            <div className="space-y-3">
              {THEME_LIST.map(t => {
                const active = selectedTheme === t.id
                const Icon = t.icon
                return (
                  <button key={t.id}
                    onClick={() => setSelectedTheme(t.id)}
                    className={`w-full text-right rounded-2xl p-4 border-2 transition-all bg-white ${
                      active ? 'border-emerald-500 shadow-sm shadow-emerald-100' : 'border-gray-100 hover:border-gray-200'
                    }`}>
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden border border-gray-200 relative" style={{ backgroundColor: t.preview.bg }}>
                        <div className="absolute top-0 left-0 right-0 h-3" style={{ backgroundColor: t.preview.accent }} />
                        <div className="absolute bottom-1.5 left-1.5 right-1.5 flex gap-1">
                          <div className="w-4 h-4 rounded" style={{ backgroundColor: t.preview.card, border: '1px solid #e5e7eb' }} />
                          <div className="w-4 h-4 rounded" style={{ backgroundColor: t.preview.card, border: '1px solid #e5e7eb' }} />
                          <div className="w-4 h-4 rounded" style={{ backgroundColor: t.preview.card, border: '1px solid #e5e7eb' }} />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-gray-400" />
                          <span className="text-sm font-bold text-gray-900">{t.name}</span>
                          <span className="text-[10px] text-gray-400 font-mono">{t.nameEn}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 leading-relaxed">{t.description}</p>
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                        active ? 'bg-emerald-500 border-emerald-500' : 'border-gray-200'
                      }`}>
                        {active && <Check className="w-3.5 h-3.5 text-white" />}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            <button
              onClick={async () => {
                setThemeSaving(true)
                await supabase.from('stores').update({ theme: selectedTheme }).eq('id', store.id)
                const { data } = await supabase.from('stores').select('*').eq('id', store.id).single()
                setStore(data)
                localStorage.setItem('afrzli_seller', JSON.stringify(data))
                setThemeSaving(false)
                showToastMsg('تم حفظ التصميم')
              }}
              disabled={themeSaving || selectedTheme === (store.theme || DEFAULT_THEME)}
              className={`w-full h-14 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                themeSaving || selectedTheme === (store.theme || DEFAULT_THEME)
                  ? 'bg-gray-100 text-gray-400'
                  : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm shadow-emerald-200 active:scale-[0.98]'
              }`}>
              {themeSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Palette className="w-5 h-5" />}
              حفظ التصميم
            </button>
          </div>
        )}
      </div>

      {/* ═══════════════════ PRODUCT FORM MODAL ═══════════════════ */}
      {showProductForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center" onClick={() => setShowProductForm(false)}>
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="sticky top-0 bg-white z-10 flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{editingProduct ? 'تعديل المنتج' : 'منتج جديد'}</h3>
                <p className="text-xs text-gray-400 mt-0.5">أدخل تفاصيل المنتج</p>
              </div>
              <button onClick={() => setShowProductForm(false)} className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center hover:bg-gray-200 transition-colors">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Image Upload */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">الصورة</label>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                <button onClick={() => fileRef.current?.click()}
                  className="w-full border-2 border-dashed border-gray-200 rounded-2xl overflow-hidden hover:border-emerald-300 transition-all group relative">
                  {pImage ? (
                    <div className="relative">
                      <img src={pImage} alt="" className="w-full h-44 object-cover" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                        <span className="text-white text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity">تغيير الصورة</span>
                      </div>
                    </div>
                  ) : (
                    <div className="py-10 flex flex-col items-center text-gray-300 group-hover:text-emerald-400 transition-colors">
                      {imageUploading ? (
                        <Loader2 className="w-8 h-8 animate-spin mb-2" />
                      ) : (
                        <ImageIcon className="w-8 h-8 mb-2" />
                      )}
                      <span className="text-sm font-medium">{imageUploading ? 'جاري الرفع...' : 'اضغط لإضافة صورة'}</span>
                    </div>
                  )}
                </button>
              </div>

              {/* Product Name */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">اسم المنتج</label>
                <input type="text" value={pName} onChange={e => setPName(e.target.value)} placeholder="مثال: قميص أسود" className={inputClass} />
              </div>

              {/* Price */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">السعر (د.ع)</label>
                <input type="number" dir="ltr" value={pPrice} onChange={e => setPPrice(e.target.value)} placeholder="25,000" className={inputClass + " text-left"} />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">الوصف <span className="text-gray-300 font-normal">(اختياري)</span></label>
                <textarea value={pDesc} onChange={e => setPDesc(e.target.value)} placeholder="وصف مختصر للمنتج..." rows={2} className={inputClass + " h-auto py-3 resize-none"} />
              </div>

              {/* Stock */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">المخزون</label>
                <input type="number" dir="ltr" value={pStock} onChange={e => setPStock(e.target.value)} placeholder="0" className={inputClass + " text-left"} />
              </div>

              {/* Category Combo */}
              <div className="relative">
                <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">الفئة <span className="text-gray-300 font-normal">(اختياري)</span></label>
                <div className="relative">
                  <input
                    type="text"
                    value={pCategory}
                    onChange={e => { setPCategory(e.target.value); setShowCatDropdown(true) }}
                    onFocus={() => setShowCatDropdown(true)}
                    onBlur={() => setTimeout(() => setShowCatDropdown(false), 200)}
                    placeholder="اختر فئة أو اكتب فئة جديدة"
                    className={inputClass + " pr-4 pl-10"}
                  />
                  <button type="button" onClick={() => setShowCatDropdown(!showCatDropdown)} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <ChevronDown className={`w-4 h-4 transition-transform ${showCatDropdown ? 'rotate-180' : ''}`} />
                  </button>
                </div>
                {showCatDropdown && (() => {
                  const allCats = [...new Set(products.map(p => p.category).filter(c => c && c.trim()))]
                  const filtered = pCategory.trim()
                    ? allCats.filter(c => c.includes(pCategory.trim()))
                    : allCats
                  if (filtered.length === 0) return null
                  return (
                    <div className="absolute z-10 w-full mt-1.5 bg-white border border-gray-200 rounded-2xl shadow-xl max-h-44 overflow-y-auto">
                      {filtered.map(cat => (
                        <button
                          key={cat}
                          type="button"
                          onMouseDown={(e) => { e.preventDefault(); setPCategory(cat); setShowCatDropdown(false) }}
                          className={`w-full text-right px-4 py-3 text-sm hover:bg-gray-50 transition-colors flex items-center gap-2 ${
                            pCategory === cat ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-gray-600'
                          }`}
                        >
                          <Tag className="w-3.5 h-3.5 text-gray-300" />
                          {cat}
                        </button>
                      ))}
                    </div>
                  )
                })()}
              </div>

              {/* Save */}
              <button onClick={saveProduct} disabled={pSaving}
                className={`w-full h-14 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                  pSaving ? 'bg-gray-200 text-gray-400' : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm shadow-emerald-200 active:scale-[0.98]'
                }`}>
                {pSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                {editingProduct ? 'حفظ التعديلات' : 'إضافة المنتج'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════ BANNER FORM MODAL ═══════════════════ */}
      {showBannerForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center" onClick={() => setShowBannerForm(false)}>
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white z-10 flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{editingBanner ? 'تعديل البانر' : 'بانر جديد'}</h3>
                <p className="text-xs text-gray-400 mt-0.5">صورة أو نص أو كلاهما</p>
              </div>
              <button onClick={() => setShowBannerForm(false)} className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center hover:bg-gray-200 transition-colors">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Banner Image */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">صورة البانر <span className="text-gray-300 font-normal">(اختياري)</span></label>
                <input ref={bannerFileRef} type="file" accept="image/*" className="hidden" onChange={handleBannerImageUpload} />
                <button onClick={() => bannerFileRef.current?.click()}
                  className="w-full border-2 border-dashed border-gray-200 rounded-2xl overflow-hidden hover:border-emerald-300 transition-all group relative">
                  {bImage ? (
                    <div className="relative">
                      <img src={bImage} alt="" className="w-full h-40 object-cover" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                        <span className="text-white text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity">تغيير الصورة</span>
                      </div>
                    </div>
                  ) : (
                    <div className="py-8 flex flex-col items-center text-gray-300 group-hover:text-emerald-400 transition-colors">
                      {bImageUploading ? <Loader2 className="w-8 h-8 animate-spin mb-2" /> : <ImageIcon className="w-8 h-8 mb-2" />}
                      <span className="text-sm font-medium">{bImageUploading ? 'جاري الرفع...' : 'اضغط لإضافة صورة'}</span>
                    </div>
                  )}
                </button>
                {bImage && <button onClick={() => setBImage('')} className="text-[11px] text-red-400 hover:text-red-500 mt-1.5">إزالة الصورة</button>}
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">العنوان <span className="text-gray-300 font-normal">(اختياري)</span></label>
                <input type="text" value={bTitle} onChange={e => setBTitle(e.target.value)} placeholder="مثال: خصم 20% على كل المنتجات" className={inputClass} />
              </div>

              {/* Subtitle */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">النص الفرعي <span className="text-gray-300 font-normal">(اختياري)</span></label>
                <input type="text" value={bSubtitle} onChange={e => setBSubtitle(e.target.value)} placeholder="مثال: العرض ساري حتى نهاية الشهر" className={inputClass} />
              </div>

              {/* Colors */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">لون الخلفية</label>
                  <div className="flex items-center gap-3">
                    <input type="color" value={bBgColor} onChange={e => setBBgColor(e.target.value)}
                      className="w-12 h-12 rounded-xl border border-gray-200 cursor-pointer" />
                    <input type="text" dir="ltr" value={bBgColor} onChange={e => setBBgColor(e.target.value)}
                      className="flex-1 h-12 px-3 bg-white border border-gray-200 rounded-2xl text-sm text-center font-mono outline-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">لون النص</label>
                  <div className="flex items-center gap-3">
                    <input type="color" value={bTextColor} onChange={e => setBTextColor(e.target.value)}
                      className="w-12 h-12 rounded-xl border border-gray-200 cursor-pointer" />
                    <input type="text" dir="ltr" value={bTextColor} onChange={e => setBTextColor(e.target.value)}
                      className="flex-1 h-12 px-3 bg-white border border-gray-200 rounded-2xl text-sm text-center font-mono outline-none" />
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">معاينة</label>
                <div className="relative h-32 rounded-2xl overflow-hidden" style={{ backgroundColor: bBgColor }}>
                  {bImage && <img src={bImage} alt="" className="w-full h-full object-cover absolute inset-0" />}
                  {(bTitle || bSubtitle) && (
                    <div className={`absolute inset-0 flex flex-col justify-center px-6 ${bImage ? 'bg-black/30' : ''}`}>
                      {bTitle && <p className="text-lg font-bold" style={{ color: bTextColor }}>{bTitle}</p>}
                      {bSubtitle && <p className="text-sm mt-0.5 opacity-80" style={{ color: bTextColor }}>{bSubtitle}</p>}
                    </div>
                  )}
                </div>
              </div>

              {/* Save */}
              <button onClick={saveBanner} disabled={bSaving}
                className={`w-full h-14 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                  bSaving ? 'bg-gray-200 text-gray-400' : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm shadow-emerald-200 active:scale-[0.98]'
                }`}>
                {bSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                {editingBanner ? 'حفظ التعديلات' : 'إضافة البانر'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════ SETTINGS MODAL ═══════════════════ */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center" onClick={() => setShowSettings(false)}>
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white z-10 flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-bold text-gray-900">إعدادات المتجر</h3>
                <p className="text-xs text-gray-400 mt-0.5">تخصيص بيانات متجرك</p>
              </div>
              <button onClick={() => setShowSettings(false)} className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center hover:bg-gray-200 transition-colors">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Logo */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">شعار المتجر</label>
                <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                <button onClick={() => logoRef.current?.click()}
                  className="w-full border-2 border-dashed border-gray-200 rounded-2xl overflow-hidden hover:border-emerald-300 transition-all group">
                  {sLogo ? (
                    <div className="relative">
                      <img src={sLogo} alt="" className="w-full h-32 object-contain bg-gray-50 p-3" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all" />
                    </div>
                  ) : (
                    <div className="py-8 flex flex-col items-center text-gray-300 group-hover:text-emerald-400 transition-colors">
                      <ImageIcon className="w-7 h-7 mb-1.5" />
                      <span className="text-xs font-medium">إضافة شعار</span>
                    </div>
                  )}
                </button>
                {sLogo && <button onClick={() => setSLogo('')} className="text-[11px] text-red-400 hover:text-red-500 mt-1.5">إزالة الشعار</button>}
              </div>

              {/* Store Name */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">اسم المتجر</label>
                <input type="text" value={sName} onChange={e => setSName(e.target.value)} className={inputClass} />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">وصف المتجر</label>
                <textarea value={sDesc} onChange={e => setSDesc(e.target.value)} placeholder="وصف مختصر عن متجرك..." rows={2} className={inputClass + " h-auto py-3 resize-none"} />
              </div>

              {/* Slug */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">رابط المتجر</label>
                <input type="text" dir="ltr" value={sSlug} onChange={e => setSSlug(e.target.value)} className={inputClass + " text-left font-mono"} />
                <p className="text-[11px] text-gray-400 mt-1.5" dir="ltr">afrzle.netlify.app/<span className="text-emerald-500 font-medium">{sSlug || '...'}</span></p>
              </div>

              {/* Delivery Price */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">سعر التوصيل (د.ع)</label>
                <input type="number" dir="ltr" value={sDelivery} onChange={e => setSDelivery(e.target.value)} className={inputClass + " text-left"} />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">كلمة المرور</label>
                <input type="text" dir="ltr" value={sPassword} onChange={e => setSPassword(e.target.value)} className={inputClass + " text-left"} />
              </div>

              {/* Save */}
              <button onClick={saveSettings} disabled={sSaving}
                className={`w-full h-14 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                  sSaving ? 'bg-gray-200 text-gray-400' : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm shadow-emerald-200 active:scale-[0.98]'
                }`}>
                {sSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                حفظ الإعدادات
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════ TOAST ═══════════════════ */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] animate-[slideUp_0.3s_ease]">
          <div className={`flex items-center gap-2.5 px-5 py-3.5 rounded-2xl shadow-xl text-sm font-semibold ${
            toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-gray-900 text-white'
          }`}>
            {toast.type === 'error' ? <XCircle className="w-4.5 h-4.5" /> : <CheckCircle className="w-4.5 h-4.5 text-emerald-400" />}
            {toast.msg}
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { transform: translate(-50%, 20px); opacity: 0; }
          to   { transform: translate(-50%, 0);    opacity: 1; }
        }
      `}</style>
    </div>
  )
}
