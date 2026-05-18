import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import {
  ShoppingBag, Package, Plus, Trash2, X, Check, Loader2,
  Users, TrendingUp, Clock, CheckCircle, XCircle, Save,
  Eye, CreditCard, Phone, MapPin, Settings, LogOut
} from 'lucide-react'

const ADMIN_PASS = 'afrzli2024admin'

const STATUS_MAP = {
  pending: { label: 'جديد', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  confirmed: { label: 'مؤكد', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  delivered: { label: 'تم التوصيل', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  cancelled: { label: 'ملغي', color: 'bg-red-50 text-red-600 border-red-200' },
}
const formatNum = (n) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')

export default function AdminPanel() {
  const [authed, setAuthed] = useState(false)
  const [pass, setPass] = useState('')
  const [passError, setPassError] = useState('')

  const [stores, setStores] = useState([])
  const [orders, setOrders] = useState([])
  const [products, setProducts] = useState([])
  const [localOrders, setLocalOrders] = useState([])
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState('stores')
  const [toast, setToast] = useState(null)

  // New store form
  const [showNewStore, setShowNewStore] = useState(false)
  const [nsName, setNsName] = useState('')
  const [nsSlug, setNsSlug] = useState('')
  const [nsUser, setNsUser] = useState('')
  const [nsPass, setNsPass] = useState('')
  const [nsDelivery, setNsDelivery] = useState('5000')
  const [nsSaving, setNsSaving] = useState(false)

  // Local product form
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [pName, setPName] = useState('')
  const [pDesc, setPDesc] = useState('')
  const [pPrice, setPPrice] = useState('')
  const [pOldPrice, setPOldPrice] = useState('')
  const [pImage, setPImage] = useState('')
  const [pCategory, setPCategory] = useState('')
  const [pBrand, setPBrand] = useState('')
  const [pStock, setPStock] = useState('')
  const [pSaving, setPSaving] = useState(false)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 2500)
  }

  const handleAuth = () => {
    if (pass === ADMIN_PASS) {
      setAuthed(true)
      loadAll()
    } else {
      setPassError('كلمة المرور غير صحيحة')
    }
  }

  const loadAll = async () => {
    setLoading(true)
    const [storesRes, ordersRes, prodsRes, localOrdersRes] = await Promise.all([
      supabase.from('stores').select('*').order('created_at', { ascending: false }),
      supabase.from('china_orders').select('*').order('created_at', { ascending: false }),
      supabase.from('products').select('*').order('created_at', { ascending: false }),
      supabase.from('store_orders').select('*').order('created_at', { ascending: false }),
    ])
    setStores(storesRes.data || [])
    setOrders(ordersRes.data || [])
    setProducts(prodsRes.data || [])
    setLocalOrders(localOrdersRes.data || [])
    setLoading(false)
  }

  const resetProductForm = () => {
    setPName(''); setPDesc(''); setPPrice(''); setPOldPrice('')
    setPImage(''); setPCategory(''); setPBrand(''); setPStock('')
    setEditingProduct(null)
  }

  const openEditProduct = (p) => {
    setEditingProduct(p)
    setPName(p.name || '')
    setPDesc(p.description || '')
    setPPrice(String(p.price || ''))
    setPOldPrice(String(p.old_price || ''))
    setPImage(p.image || '')
    setPCategory(p.category || '')
    setPBrand(p.brand || '')
    setPStock(String(p.stock || ''))
    setShowAddProduct(true)
  }

  const saveProduct = async () => {
    if (!pName.trim() || !pPrice) { showToast('أدخل الاسم والسعر', 'error'); return }
    setPSaving(true)
    const productData = {
      name: pName.trim(),
      description: pDesc.trim(),
      price: parseFloat(pPrice) || 0,
      old_price: parseFloat(pOldPrice) || 0,
      discount: pOldPrice && parseFloat(pOldPrice) > parseFloat(pPrice) ? Math.round((1 - parseFloat(pPrice) / parseFloat(pOldPrice)) * 100) : 0,
      image: pImage.trim(),
      category: pCategory.trim(),
      brand: pBrand.trim(),
      stock: parseInt(pStock) || 0,
      is_available: true,
    }
    if (editingProduct) {
      const { error } = await supabase.from('products').update(productData).eq('id', editingProduct.id)
      if (error) showToast('خطأ: ' + error.message, 'error')
      else showToast('تم تحديث المنتج')
    } else {
      const { error } = await supabase.from('products').insert(productData)
      if (error) showToast('خطأ: ' + error.message, 'error')
      else showToast('تم إضافة المنتج')
    }
    setShowAddProduct(false)
    resetProductForm()
    loadAll()
    setPSaving(false)
  }

  const deleteProduct = async (p) => {
    if (!confirm(`حذف "${p.name}"؟`)) return
    await supabase.from('products').delete().eq('id', p.id)
    showToast('تم حذف المنتج')
    loadAll()
  }

  const updateLocalOrderStatus = async (orderId, newStatus) => {
    await supabase.from('store_orders').update({ status: newStatus }).eq('id', orderId)
    showToast('تم تحديث الحالة')
    loadAll()
  }

  const createStore = async () => {
    if (!nsName.trim() || !nsSlug.trim() || !nsUser.trim() || !nsPass.trim()) {
      showToast('املأ جميع الحقول', 'error'); return
    }
    setNsSaving(true)
    const { error } = await supabase.from('stores').insert({
      name: nsName.trim(),
      slug: nsSlug.trim().toLowerCase().replace(/\s+/g, '-'),
      username: nsUser.trim(),
      password: nsPass.trim(),
      delivery_price: parseFloat(nsDelivery) || 5000,
    })
    if (error) {
      showToast('خطأ: ' + error.message, 'error')
    } else {
      showToast('تم إنشاء المتجر')
      setShowNewStore(false)
      setNsName(''); setNsSlug(''); setNsUser(''); setNsPass(''); setNsDelivery('5000')
      loadAll()
    }
    setNsSaving(false)
  }

  const deleteStore = async (store) => {
    if (!confirm(`حذف متجر "${store.name}"؟ سيتم حذف جميع منتجاته وطلباته.`)) return
    await supabase.from('stores').delete().eq('id', store.id)
    showToast('تم حذف المتجر')
    loadAll()
  }

  const toggleStore = async (store) => {
    await supabase.from('stores').update({ is_active: !store.is_active }).eq('id', store.id)
    loadAll()
  }

  const inputClass = "w-full h-12 px-4 bg-neutral-50 border border-neutral-200 rounded-xl text-sm outline-none transition-all hover:border-neutral-300 focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"

  // Auth screen
  if (!authed) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center" dir="rtl">
        <div className="w-full max-w-xs px-6">
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-neutral-900 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Settings className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-xl font-bold text-neutral-900">لوحة الإدارة</h1>
          </div>
          <div className="space-y-4">
            <input type="password" dir="ltr" placeholder="كلمة المرور" value={pass}
              onChange={e => { setPass(e.target.value); setPassError('') }}
              onKeyDown={e => e.key === 'Enter' && handleAuth()} className={inputClass + " text-center"} />
            {passError && <p className="text-xs text-red-500 text-center">{passError}</p>}
            <button onClick={handleAuth}
              className="w-full h-12 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl font-bold text-sm transition-all">دخول</button>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-neutral-300 animate-spin" />
      </div>
    )
  }

  const totalOrders = orders.length
  const totalRevenue = orders.filter(o => o.status === 'delivered').reduce((s, o) => s + Number(o.total_iqd || o.total || 0), 0)
  const pendingOrders = orders.filter(o => o.status === 'pending').length

  return (
    <div className="min-h-screen bg-white pb-10" dir="rtl">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-neutral-100">
        <div className="max-w-3xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-neutral-900 rounded-lg flex items-center justify-center">
              <Settings className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold text-neutral-900">إدارة المنصة</span>
          </div>
          <button onClick={() => setAuthed(false)} className="w-9 h-9 bg-neutral-100 rounded-lg flex items-center justify-center hover:bg-red-50">
            <LogOut className="w-4 h-4 text-neutral-500" />
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-5 py-5">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: 'المتاجر', value: stores.length, icon: Users },
            { label: 'المنتجات', value: products.length, icon: Package },
            { label: 'الطلبات', value: totalOrders, icon: ShoppingBag },
            { label: 'المبيعات', value: formatNum(totalRevenue), icon: TrendingUp },
          ].map((s, i) => (
            <div key={i} className="bg-neutral-50 rounded-xl p-3 text-center">
              <s.icon className="w-4 h-4 text-neutral-400 mx-auto mb-1" />
              <p className="text-lg font-bold text-neutral-900">{s.value}</p>
              <p className="text-[10px] text-neutral-400">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-neutral-100 rounded-xl p-1 mb-6">
          {[
            { key: 'stores', label: 'المتاجر' },
            { key: 'local_products', label: 'منتجات المتجر' },
            { key: 'local_orders', label: 'طلبات المتجر' },
            { key: 'orders', label: 'طلبات الأسواق' },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${tab === t.key ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-400'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Stores Tab */}
        {tab === 'stores' && (
          <div>
            <button onClick={() => setShowNewStore(true)}
              className="w-full border border-dashed border-neutral-200 rounded-xl py-4 flex items-center justify-center gap-2 text-neutral-500 text-sm font-medium hover:bg-neutral-50 transition-colors mb-4">
              <Plus className="w-4 h-4" /> إنشاء متجر جديد
            </button>

            <div className="space-y-3">
              {stores.map(s => {
                const storeOrders = orders.filter(o => o.store_id === s.id)
                const storeProducts = products.filter(p => p.store_id === s.id)
                return (
                  <div key={s.id} className={`border rounded-xl p-4 space-y-3 ${s.is_active ? 'border-neutral-200' : 'border-neutral-100 opacity-50'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-neutral-900">{s.name}</p>
                        <p className="text-xs text-neutral-400 mt-0.5" dir="ltr">/{s.slug} • @{s.username}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => toggleStore(s)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-neutral-100">
                          {s.is_active ? <Eye className="w-4 h-4 text-neutral-400" /> : <XCircle className="w-4 h-4 text-neutral-300" />}
                        </button>
                        <button onClick={() => deleteStore(s)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-50">
                          <Trash2 className="w-4 h-4 text-neutral-300" />
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-3 text-xs text-neutral-400">
                      <span>{storeProducts.length} منتج</span>
                      <span>{storeOrders.length} طلب</span>
                      <span>توصيل: {formatNum(s.delivery_price || 0)} د.ع</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Local Products Tab */}
        {tab === 'local_products' && (
          <div>
            <button onClick={() => { resetProductForm(); setShowAddProduct(true) }}
              className="w-full border border-dashed border-neutral-200 rounded-xl py-4 flex items-center justify-center gap-2 text-neutral-500 text-sm font-medium hover:bg-neutral-50 transition-colors mb-4">
              <Plus className="w-4 h-4" /> إضافة منتج جديد
            </button>

            {products.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-12 h-12 text-neutral-200 mx-auto mb-3" />
                <p className="text-sm text-neutral-400">لا توجد منتجات</p>
              </div>
            ) : (
              <div className="space-y-3">
                {products.map(p => (
                  <div key={p.id} className="border border-neutral-200 rounded-xl p-3 flex gap-3">
                    <div className="w-16 h-16 rounded-lg bg-neutral-50 overflow-hidden flex-shrink-0">
                      {p.image ? <img src={p.image} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Package className="w-6 h-6 text-neutral-200" /></div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-neutral-900 line-clamp-1">{p.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs font-bold text-neutral-700">{formatNum(p.price)} د.ع</span>
                        {p.category && <span className="text-[9px] bg-neutral-100 text-neutral-500 px-1.5 py-0.5 rounded">{p.category}</span>}
                        <span className="text-[9px] text-neutral-400">مخزون: {p.stock || 0}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => openEditProduct(p)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-neutral-100">
                        <Save className="w-3.5 h-3.5 text-neutral-400" />
                      </button>
                      <button onClick={() => deleteProduct(p)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-50">
                        <Trash2 className="w-3.5 h-3.5 text-neutral-300" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Local Orders Tab */}
        {tab === 'local_orders' && (
          <div className="space-y-3">
            {localOrders.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingBag className="w-12 h-12 text-neutral-200 mx-auto mb-3" />
                <p className="text-sm text-neutral-400">لا توجد طلبات محلية</p>
              </div>
            ) : localOrders.map(o => {
              const st = STATUS_MAP[o.status] || STATUS_MAP.pending
              return (
                <div key={o.id} className="border border-neutral-200 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-neutral-900">{o.customer_name}</p>
                      <p className="text-xs text-neutral-400">{o.customer_city || '—'}{o.customer_address ? ` • ${o.customer_address}` : ''}</p>
                    </div>
                    <select
                      value={o.status || 'pending'}
                      onChange={e => updateLocalOrderStatus(o.id, e.target.value)}
                      className={`text-[11px] font-semibold px-2 py-1 rounded-lg border outline-none cursor-pointer ${st.color}`}
                    >
                      <option value="pending">جديد</option>
                      <option value="confirmed">مؤكد</option>
                      <option value="delivered">تم التوصيل</option>
                      <option value="cancelled">ملغي</option>
                    </select>
                  </div>
                  <div className="flex gap-4 text-xs text-neutral-500">
                    <span dir="ltr">{o.customer_phone}</span>
                    <span>{formatNum(o.total_iqd || 0)} د.ع</span>
                    <span>{o.items_count || 0} منتج</span>
                    <span>{new Date(o.created_at).toLocaleDateString('ar-IQ')}</span>
                  </div>
                  {o.notes && <p className="text-[11px] text-neutral-400 bg-neutral-50 rounded-lg px-2 py-1">📝 {o.notes}</p>}
                </div>
              )
            })}
          </div>
        )}

        {/* Orders Tab (China/Global) */}
        {tab === 'orders' && (
          <div className="space-y-3">
            {orders.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingBag className="w-12 h-12 text-neutral-200 mx-auto mb-3" />
                <p className="text-sm text-neutral-400">لا توجد طلبات</p>
              </div>
            ) : orders.map(o => {
              const st = STATUS_MAP[o.status] || STATUS_MAP.pending
              return (
                <div key={o.id} className="border border-neutral-200 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-neutral-900">{o.customer_name}</p>
                      <p className="text-xs text-neutral-400">{o.customer_city || o.city || '—'}{o.customer_address || o.region ? ` — ${o.customer_address || o.region}` : ''}</p>
                    </div>
                    <span className={`text-[11px] font-semibold px-2 py-1 rounded-lg border ${st.color}`}>{st.label}</span>
                  </div>
                  <div className="flex gap-4 text-xs text-neutral-500">
                    <span dir="ltr">{o.customer_phone}</span>
                    <span>{formatNum((o.total_iqd || o.total || 0))} د.ع</span>
                    <span>{new Date(o.created_at).toLocaleDateString('ar-IQ')}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add/Edit Product Modal */}
      {showAddProduct && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center" onClick={() => { setShowAddProduct(false); resetProductForm() }}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-sm max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-neutral-100">
              <h3 className="text-lg font-bold text-neutral-900">{editingProduct ? 'تعديل المنتج' : 'منتج جديد'}</h3>
              <button onClick={() => { setShowAddProduct(false); resetProductForm() }} className="w-9 h-9 bg-neutral-100 rounded-lg flex items-center justify-center">
                <X className="w-4 h-4 text-neutral-500" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-500 mb-2">اسم المنتج *</label>
                <input type="text" value={pName} onChange={e => setPName(e.target.value)} placeholder="مثال: سماعات بلوتوث" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-500 mb-2">الوصف</label>
                <textarea value={pDesc} onChange={e => setPDesc(e.target.value)} placeholder="وصف المنتج..." rows={2} className={inputClass + " h-auto py-3 resize-none"} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-neutral-500 mb-2">السعر (د.ع) *</label>
                  <input type="number" value={pPrice} onChange={e => setPPrice(e.target.value)} placeholder="45000" className={inputClass} dir="ltr" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-500 mb-2">السعر القديم</label>
                  <input type="number" value={pOldPrice} onChange={e => setPOldPrice(e.target.value)} placeholder="65000" className={inputClass} dir="ltr" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-500 mb-2">رابط الصورة</label>
                <input type="text" dir="ltr" value={pImage} onChange={e => setPImage(e.target.value)} placeholder="https://..." className={inputClass + " text-left"} />
                {pImage && <img src={pImage} alt="" className="w-16 h-16 rounded-lg object-cover mt-2 border" onError={e => e.target.style.display='none'} />}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-neutral-500 mb-2">التصنيف</label>
                  <input type="text" value={pCategory} onChange={e => setPCategory(e.target.value)} placeholder="إلكترونيات" className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-500 mb-2">الماركة</label>
                  <input type="text" value={pBrand} onChange={e => setPBrand(e.target.value)} placeholder="Sony" className={inputClass} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-500 mb-2">المخزون</label>
                <input type="number" value={pStock} onChange={e => setPStock(e.target.value)} placeholder="50" className={inputClass} dir="ltr" />
              </div>
              <button onClick={saveProduct} disabled={pSaving}
                className={`w-full h-14 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${pSaving ? 'bg-neutral-200 text-neutral-400' : 'bg-neutral-900 hover:bg-neutral-800 text-white active:scale-[0.98]'}`}>
                {pSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                {editingProduct ? 'تحديث المنتج' : 'إضافة المنتج'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Store Modal */}
      {showNewStore && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center" onClick={() => setShowNewStore(false)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-sm max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-neutral-100">
              <h3 className="text-lg font-bold text-neutral-900">متجر جديد</h3>
              <button onClick={() => setShowNewStore(false)} className="w-9 h-9 bg-neutral-100 rounded-lg flex items-center justify-center">
                <X className="w-4 h-4 text-neutral-500" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-500 mb-2">اسم المتجر</label>
                <input type="text" value={nsName} onChange={e => setNsName(e.target.value)} placeholder="مثال: متجر أحمد" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-500 mb-2">رابط المتجر (slug)</label>
                <input type="text" dir="ltr" value={nsSlug} onChange={e => setNsSlug(e.target.value)} placeholder="ahmed-store" className={inputClass + " text-left"} />
                <p className="text-[11px] text-neutral-400 mt-1" dir="ltr">سيكون الرابط: afrzle.netlify.app/{nsSlug || '...'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-500 mb-2">اسم المستخدم (للتاجر)</label>
                <input type="text" dir="ltr" value={nsUser} onChange={e => setNsUser(e.target.value)} placeholder="ahmed" className={inputClass + " text-left"} />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-500 mb-2">كلمة المرور (للتاجر)</label>
                <input type="text" dir="ltr" value={nsPass} onChange={e => setNsPass(e.target.value)} placeholder="password123" className={inputClass + " text-left"} />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-500 mb-2">سعر التوصيل (د.ع)</label>
                <input type="number" dir="ltr" value={nsDelivery} onChange={e => setNsDelivery(e.target.value)} className={inputClass + " text-left"} />
              </div>
              <button onClick={createStore} disabled={nsSaving}
                className={`w-full h-14 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${nsSaving ? 'bg-neutral-200 text-neutral-400' : 'bg-neutral-900 hover:bg-neutral-800 text-white active:scale-[0.98]'}`}>
                {nsSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                إنشاء المتجر
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70]">
          <div className={`flex items-center gap-2 px-5 py-3 rounded-xl shadow-lg text-sm font-medium text-white ${toast.type === 'error' ? 'bg-red-500' : 'bg-neutral-900'}`}>
            {toast.type === 'error' ? <X className="w-4 h-4" /> : <Check className="w-4 h-4 text-emerald-400" />}
            {toast.msg}
          </div>
        </div>
      )}
    </div>
  )
}
