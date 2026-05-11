import { useState, useEffect } from 'react'
import { Routes, Route, useNavigate, useParams, Link } from 'react-router-dom'
import { supabase } from './lib/supabase'
import SubmitPage from './SubmitPage'
import StorePage from './StorePage'
import SellerDashboard from './SellerDashboard'
import AdminPanel from './AdminPanel'
import ChinaShop from './ChinaShop'
import ChinaCheckout from './ChinaCheckout'
import {
  Package, Users, TrendingUp, Clock, CheckCircle, XCircle,
  Eye, RefreshCw, MapPin, Phone, User,
  FileText, Hash, Image, X, AlertTriangle, Search,
  ArrowRight, Calendar, CreditCard, Layers, ChevronLeft, Trash2, Copy, Check, Truck, ShoppingBag
} from 'lucide-react'

const STATUS_MAP = {
  pending: { label: 'قيد الانتظار', color: 'bg-amber-50 text-amber-700 border border-amber-200', icon: Clock },
  sorted: { label: 'تم الفرز', color: 'bg-emerald-50 text-emerald-700 border border-emerald-200', icon: CheckCircle },
  cancelled: { label: 'ملغي', color: 'bg-red-50 text-red-600 border border-red-200', icon: XCircle },
}

const CHINA_STATUS_MAP = {
  pending: { label: 'جديد', color: 'bg-amber-50 text-amber-700 border border-amber-200', icon: Clock },
  confirmed: { label: 'مؤكد', color: 'bg-blue-50 text-blue-700 border border-blue-200', icon: CheckCircle },
  purchased: { label: 'تم الشراء', color: 'bg-indigo-50 text-indigo-700 border border-indigo-200', icon: ShoppingBag },
  shipped: { label: 'تم الشحن', color: 'bg-sky-50 text-sky-700 border border-sky-200', icon: Truck },
  delivered: { label: 'تم التوصيل', color: 'bg-emerald-50 text-emerald-700 border border-emerald-200', icon: CheckCircle },
  cancelled: { label: 'ملغي', color: 'bg-red-50 text-red-600 border border-red-200', icon: XCircle },
}

const formatNum = (num) => Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')

/* ──────────────────────────────────────────────
   صفحة تفاصيل الطلب - صفحة مستقلة احترافية
   ────────────────────────────────────────────── */
function OrderDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [previewImage, setPreviewImage] = useState(null)
  const [confirmAction, setConfirmAction] = useState(null)
  const [copiedField, setCopiedField] = useState(null)

  const [toastMsg, setToastMsg] = useState(null)

  const copyText = (text, fieldId) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(fieldId)
      setToastMsg('تم النسخ ✓')
      setTimeout(() => { setCopiedField(null); setToastMsg(null) }, 1500)
    })
  }

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const [orderRes, itemsRes] = await Promise.all([
        supabase.from('orders').select('*').eq('id', id).single(),
        supabase.from('order_items').select('*').eq('order_id', id),
      ])
      setOrder(orderRes.data)
      setItems(itemsRes.data || [])
      setLoading(false)
    }
    load()
  }, [id])

  const doUpdateStatus = async (status) => {
    await supabase.from('orders').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
    setConfirmAction(null)
    const res = await supabase.from('orders').select('*').eq('id', id).single()
    setOrder(res.data)
  }

  const doDeleteOrder = async () => {
    await supabase.from('order_items').delete().eq('order_id', id)
    await supabase.from('orders').delete().eq('id', id)
    setConfirmAction(null)
    navigate('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-12 h-12 border-[3px] border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Package className="w-20 h-20 mx-auto mb-4 text-slate-200" />
          <p className="text-lg font-bold text-slate-600 mb-2">الطلب غير موجود</p>
          <button onClick={() => navigate('/')} className="text-indigo-500 text-sm font-medium hover:underline">العودة للرئيسية</button>
        </div>
      </div>
    )
  }

  const st = STATUS_MAP[order.status] || STATUS_MAP.pending
  const StIcon = st.icon

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition text-sm font-medium">
            <ArrowRight className="w-4 h-4" />
            <span>الرجوع</span>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Package className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-bold text-slate-800">افرزلي</span>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-5 sm:py-8">

        {/* Order Header Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-5">
          {/* Top gradient bar */}
          <div className={`h-1.5 ${order.status === 'sorted' ? 'bg-gradient-to-l from-emerald-400 to-emerald-500' : order.status === 'cancelled' ? 'bg-gradient-to-l from-red-400 to-red-500' : 'bg-gradient-to-l from-amber-400 to-amber-500'}`}></div>

          <div className="p-5 sm:p-7">
            {/* Title Row */}
            <div className="flex items-start justify-between mb-5">
              <div>
                <p className="text-xs text-slate-400 mb-1">تفاصيل الطلب</p>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-800">{order.customer_code}</h1>
              </div>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold ${st.color}`}>
                <StIcon className="w-4 h-4" />
                {st.label}
              </span>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard className="w-4 h-4 text-indigo-400" />
                  <span className="text-[11px] sm:text-xs text-indigo-400 font-medium">المبلغ الكلي</span>
                </div>
                <p className="text-lg sm:text-xl font-bold text-indigo-700">{formatNum(order.total_price || 0)}</p>
                <p className="text-[10px] text-indigo-400">دينار عراقي</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-slate-400" />
                  <span className="text-[11px] sm:text-xs text-slate-400 font-medium">العمولة</span>
                </div>
                <p className="text-lg sm:text-xl font-bold text-slate-800">{formatNum(order.commission || 0)}</p>
                <p className="text-[10px] text-slate-400">دينار عراقي</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Layers className="w-4 h-4 text-slate-400" />
                  <span className="text-[11px] sm:text-xs text-slate-400 font-medium">العناصر</span>
                </div>
                <p className="text-lg sm:text-xl font-bold text-slate-800">{items.length}</p>
                <p className="text-[10px] text-slate-400">عنصر</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span className="text-[11px] sm:text-xs text-slate-400 font-medium">التاريخ</span>
                </div>
                <p className="text-sm sm:text-base font-bold text-slate-800">{new Date(order.created_at).toLocaleDateString('ar-IQ', { day: 'numeric', month: 'short' })}</p>
                <p className="text-[10px] text-slate-400">{new Date(order.created_at).toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-5 pt-5 border-t border-slate-100">
              {order.status === 'pending' && (
                <>
                  <button
                    onClick={() => setConfirmAction({ status: 'sorted', label: 'تم الفرز' })}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-semibold transition shadow-sm shadow-emerald-200"
                  >
                    <CheckCircle className="w-4 h-4" />
                    تم الفرز
                  </button>
                  <button
                    onClick={() => setConfirmAction({ status: 'cancelled', label: 'إلغاء الطلب' })}
                    className="flex items-center justify-center gap-2 py-3 px-5 bg-red-50 hover:bg-red-100 text-red-500 rounded-xl text-sm font-semibold transition"
                  >
                    <XCircle className="w-4 h-4" />
                    إلغاء
                  </button>
                </>
              )}
              <button
                onClick={() => setConfirmAction({ status: 'delete', label: 'حذف الطلب' })}
                className="flex items-center justify-center gap-2 py-3 px-5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-semibold transition shadow-sm shadow-red-200"
              >
                <Trash2 className="w-4 h-4" />
                حذف
              </button>
            </div>
          </div>
        </div>

        {/* Items Section */}
        <div className="mb-5">
          <h2 className="text-base sm:text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-500" />
            العناصر
            <span className="bg-indigo-100 text-indigo-600 text-xs px-2 py-0.5 rounded-full font-medium">{items.length}</span>
          </h2>

          <div className="space-y-4">
            {items.map((item, i) => (
              <div key={item.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                {/* Item Header */}
                <div className="bg-gradient-to-l from-indigo-50 to-purple-50 px-5 py-3 flex items-center justify-between border-b border-indigo-100/50">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-indigo-500 rounded-lg flex items-center justify-center">
                      <span className="text-white text-xs font-bold">{i + 1}</span>
                    </div>
                    <span className="text-sm font-semibold text-indigo-700">عنصر {i + 1}</span>
                  </div>
                  <span className="text-base sm:text-lg font-bold text-indigo-700">{formatNum(item.price_with_delivery || 0)} <span className="text-xs font-normal text-indigo-400">د.ع</span></span>
                </div>

                <div className="p-5">
                  {/* Product Image */}
                  {item.product_image && (
                    <div
                      className="relative cursor-pointer mb-5 group"
                      onClick={() => setPreviewImage(item.product_image)}
                    >
                      <img
                        src={item.product_image}
                        alt="صورة المنتج"
                        className="w-full h-48 sm:h-56 object-cover rounded-xl border border-slate-200 group-hover:brightness-95 transition"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded-xl transition flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 transition bg-white/90 rounded-full p-3 shadow-lg">
                          <Image className="w-5 h-5 text-indigo-600" />
                        </div>
                      </div>
                      <div className="absolute bottom-3 left-3 bg-black/50 text-white text-[10px] px-2.5 py-1 rounded-lg flex items-center gap-1 backdrop-blur-sm">
                        <Image className="w-3 h-3" />
                        اضغط للمعاينة
                      </div>
                    </div>
                  )}

                  {/* Item Details - Copyable */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { label: 'المستلم', value: item.customer_name, icon: User, iconBg: 'bg-blue-100', iconColor: 'text-blue-500', fieldKey: `name-${i}` },
                      { label: 'الهاتف', value: item.customer_phone, icon: Phone, iconBg: 'bg-green-100', iconColor: 'text-green-500', fieldKey: `phone-${i}`, dir: 'ltr' },
                      { label: 'المدينة', value: `${item.city}${item.area ? ` / ${item.area}` : ''}`, icon: MapPin, iconBg: 'bg-violet-100', iconColor: 'text-violet-500', fieldKey: `city-${i}` },
                      item.full_address && { label: 'العنوان', value: item.full_address, icon: MapPin, iconBg: 'bg-orange-100', iconColor: 'text-orange-500', fieldKey: `addr-${i}` },
                      item.track_number && { label: 'رقم التتبع', value: item.track_number, icon: Hash, iconBg: 'bg-pink-100', iconColor: 'text-pink-500', fieldKey: `track-${i}`, mono: true },
                      item.product_link && { label: 'رابط المنتج', value: item.product_link, icon: FileText, iconBg: 'bg-sky-100', iconColor: 'text-sky-500', fieldKey: `link-${i}`, isLink: true, span2: true },
                    ].filter(Boolean).map(field => {
                      const FieldIcon = field.icon
                      const isCopied = copiedField === field.fieldKey
                      return (
                        <div
                          key={field.fieldKey}
                          onClick={() => copyText(field.value, field.fieldKey)}
                          className={`flex items-center gap-3 bg-slate-50 hover:bg-slate-100 rounded-xl p-3.5 cursor-pointer transition-all group active:scale-[0.98] ${field.span2 ? 'sm:col-span-2' : ''} ${isCopied ? 'ring-2 ring-emerald-300 bg-emerald-50' : ''}`}
                        >
                          <div className={`w-9 h-9 ${field.iconBg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                            <FieldIcon className={`w-4 h-4 ${field.iconColor}`} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] text-slate-400 font-medium">{field.label}</p>
                            {field.isLink ? (
                              <a href={field.value} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="text-sm font-medium text-indigo-500 hover:underline truncate block">{field.value}</a>
                            ) : (
                              <p className={`text-sm font-semibold text-slate-800 truncate ${field.mono ? 'font-mono' : ''}`} dir={field.dir}>{field.value}</p>
                            )}
                          </div>
                          <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition">
                            {isCopied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-slate-300" />}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Notes */}
                  {item.notes && (
                    <div
                      onClick={() => copyText(item.notes, `notes-${i}`)}
                      className={`mt-3 bg-amber-50 border border-amber-100 hover:bg-amber-100/60 rounded-xl p-4 flex items-start gap-3 cursor-pointer transition-all active:scale-[0.98] ${copiedField === `notes-${i}` ? 'ring-2 ring-emerald-300' : ''}`}
                    >
                      <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4 h-4 text-amber-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] text-amber-500 font-medium mb-0.5">ملاحظات</p>
                        <p className="text-sm text-amber-800">{item.notes}</p>
                      </div>
                      <div className="flex-shrink-0 mt-1">
                        {copiedField === `notes-${i}` ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-amber-300" />}
                      </div>
                    </div>
                  )}

                  {/* Waseet QR Receipt */}
                  {item.waseet_qr_link && (
                    <div className="mt-3 bg-gradient-to-l from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Truck className="w-4 h-4 text-orange-500" />
                          </div>
                          <div>
                            <p className="text-[10px] text-orange-500 font-medium">وصل الوسيط</p>
                            <p className="text-sm font-bold text-orange-700 font-mono">{item.waseet_qr_id || '-'}</p>
                          </div>
                        </div>
                        <a
                          href={item.waseet_qr_link}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-semibold transition shadow-sm"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          طباعة الوصل
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Image Preview */}
      {previewImage && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60] p-2" onClick={() => setPreviewImage(null)}>
          <button className="absolute top-4 left-4 p-2.5 bg-white/10 hover:bg-white/20 rounded-full transition z-10" onClick={() => setPreviewImage(null)}>
            <X className="w-5 h-5 text-white" />
          </button>
          <img src={previewImage} alt="معاينة" className="max-w-full max-h-[90vh] rounded-xl object-contain" onClick={e => e.stopPropagation()} />
        </div>
      )}

      {/* Confirm Dialog */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4" onClick={() => setConfirmAction(null)}>
          <div className="bg-white rounded-2xl w-full max-w-xs p-5 shadow-2xl text-center" onClick={e => e.stopPropagation()}>
            <div className={`w-14 h-14 mx-auto mb-3 rounded-full flex items-center justify-center ${confirmAction.status === 'cancelled' || confirmAction.status === 'delete' ? 'bg-red-50' : 'bg-emerald-50'}`}>
              {confirmAction.status === 'delete'
                ? <Trash2 className="w-7 h-7 text-red-500" />
                : <AlertTriangle className={`w-7 h-7 ${confirmAction.status === 'cancelled' ? 'text-red-500' : 'text-emerald-500'}`} />}
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1.5">هل أنت متأكد؟</h3>
            <p className="text-slate-500 text-xs mb-5 leading-relaxed">
              {confirmAction.status === 'delete'
                ? 'سيتم حذف هذا الطلب نهائياً مع جميع عناصره ولن يمكن استرجاعه.'
                : confirmAction.status === 'cancelled'
                  ? 'سيتم إلغاء هذا الطلب ولن يمكن التراجع.'
                  : 'سيتم تأكيد فرز هذا الطلب. هل أنت متأكد؟'}
            </p>
            <div className="flex gap-2.5">
              <button onClick={() => setConfirmAction(null)} className="flex-1 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-medium text-sm transition">تراجع</button>
              <button
                onClick={() => confirmAction.status === 'delete' ? doDeleteOrder() : doUpdateStatus(confirmAction.status)}
                className={`flex-1 px-3 py-2.5 rounded-xl font-medium text-sm text-white transition ${confirmAction.status === 'cancelled' || confirmAction.status === 'delete' ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-500 hover:bg-emerald-600'}`}
              >{confirmAction.label}</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] animate-bounce-in">
          <div className="bg-slate-800 text-white px-6 py-3 rounded-2xl shadow-2xl text-sm font-semibold flex items-center gap-2">
            <Check className="w-5 h-5 text-emerald-400" />
            {toastMsg}
          </div>
        </div>
      )}
    </div>
  )
}

/* ──────────────────────────────────────────────
   الصفحة الرئيسية - قائمة الطلبات والعملاء
   ────────────────────────────────────────────── */
function HomePage() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [orderItems, setOrderItems] = useState([])
  const [customers, setCustomers] = useState([])
  const [chinaOrders, setChinaOrders] = useState([])
  const [chinaItems, setChinaItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('orders')
  const [confirmAction, setConfirmAction] = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [chinaStatusFilter, setChinaStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [ordersRes, itemsRes, customersRes, chinaOrdersRes, chinaItemsRes] = await Promise.all([
        supabase.from('orders').select('*').order('created_at', { ascending: false }),
        supabase.from('order_items').select('*'),
        supabase.from('customers').select('*'),
        supabase.from('china_orders').select('*').order('created_at', { ascending: false }),
        supabase.from('china_order_items').select('*'),
      ])
      setOrders(ordersRes.data || [])
      setOrderItems(itemsRes.data || [])
      setCustomers(customersRes.data || [])
      setChinaOrders(chinaOrdersRes.data || [])
      setChinaItems(chinaItemsRes.data || [])
    } catch (err) {
      console.error('Failed to fetch data:', err)
    }
    setLoading(false)
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchData()
    setRefreshing(false)
  }

  const handleStatusChange = (e, orderId, status, label) => {
    e.stopPropagation()
    if (status === 'cancelled' || status === 'sorted' || status === 'delete') {
      setConfirmAction({ orderId, status, label })
    } else {
      doUpdateStatus(orderId, status)
    }
  }

  const doUpdateStatus = async (orderId, status) => {
    await supabase.from('orders').update({ status, updated_at: new Date().toISOString() }).eq('id', orderId)
    setConfirmAction(null)
    fetchData()
  }

  const doDeleteOrder = async (orderId) => {
    await supabase.from('order_items').delete().eq('order_id', orderId)
    await supabase.from('orders').delete().eq('id', orderId)
    setConfirmAction(null)
    fetchData()
  }

  const totalRevenue = orders.reduce((s, o) => s + Number(o.total_price || 0), 0)
  const totalCommission = orders.reduce((s, o) => s + Number(o.commission || 0), 0)
  const pendingOrders = orders.filter(o => o.status === 'pending').length
  const sortedOrders = orders.filter(o => o.status === 'sorted').length

  const getItemsForOrder = (orderId) => orderItems.filter(i => i.order_id === orderId)
  const getChinaItemsForOrder = (orderId) => chinaItems.filter(i => i.order_id === orderId)

  const chinaPending = chinaOrders.filter(o => o.status === 'pending').length
  const chinaRevenue = chinaOrders.reduce((s, o) => s + Number(o.total_iqd || 0), 0)

  const filteredChinaOrders = chinaOrders.filter(o => {
    if (chinaStatusFilter !== 'all' && o.status !== chinaStatusFilter) return false
    return true
  })

  const doChinaUpdateStatus = async (orderId, status) => {
    await supabase.from('china_orders').update({ status }).eq('id', orderId)
    setConfirmAction(null)
    fetchData()
  }

  const doChinaDelete = async (orderId) => {
    await supabase.from('china_order_items').delete().eq('order_id', orderId)
    await supabase.from('china_orders').delete().eq('id', orderId)
    setConfirmAction(null)
    fetchData()
  }

  const filteredOrders = orders.filter(o => {
    if (statusFilter !== 'all' && o.status !== statusFilter) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      const codeMatch = o.customer_code?.toLowerCase().includes(q)
      const trackMatch = getItemsForOrder(o.id).some(item => item.track_number?.toLowerCase().includes(q))
      if (!codeMatch && !trackMatch) return false
    }
    return true
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-14 h-14 border-[3px] border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-5"></div>
          <p className="text-slate-500 text-base font-medium">جاري تحميل البيانات...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20 lg:pb-0">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Package className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-slate-800">افرزلي</h1>
              <p className="text-[10px] sm:text-xs text-slate-400">لوحة التحكم</p>
            </div>
          </div>
          <button onClick={handleRefresh} disabled={refreshing} className="flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl text-xs sm:text-sm font-medium transition">
            <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{refreshing ? 'جاري التحديث...' : 'تحديث'}</span>
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 mb-5 sm:mb-8">
          {[
            { label: 'الطلبات', value: orders.length, sub: `${pendingOrders} بانتظار`, gradient: 'from-indigo-500 to-indigo-600', icon: Package },
            { label: 'تم الفرز', value: sortedOrders, sub: `من ${orders.length}`, gradient: 'from-emerald-500 to-emerald-600', icon: CheckCircle },
            { label: 'المبيعات', value: formatNum(totalRevenue), sub: 'د.ع', gradient: 'from-sky-500 to-sky-600', icon: TrendingUp },
            { label: 'العمولات', value: formatNum(totalCommission), sub: 'د.ع', gradient: 'from-purple-500 to-purple-600', icon: TrendingUp },
          ].map((stat, i) => (
            <div key={i} className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-slate-400 text-[10px] sm:text-xs font-medium">{stat.label}</p>
                  <p className="text-lg sm:text-2xl font-bold text-slate-800 mt-0.5 truncate">{stat.value}</p>
                  <p className="text-[9px] sm:text-xs text-slate-400">{stat.sub}</p>
                </div>
                <div className={`bg-gradient-to-br ${stat.gradient} p-1.5 sm:p-2.5 rounded-lg sm:rounded-xl shadow-sm flex-shrink-0`}>
                  <stat.icon className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-white" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <>
            <div className="mb-4 sm:mb-6">
              {/* Search Bar */}
              <div className="relative mb-3">
                <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" placeholder="بحث بكود العميل أو رقم التتبع..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pr-10 pl-10 py-2.5 sm:py-3 bg-white rounded-xl text-sm border border-slate-200 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition outline-none placeholder:text-slate-300" />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute left-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded-lg transition">
                    <X className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                )}
              </div>
              {/* Filters */}
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {[
                  { key: 'all', label: 'الكل', count: orders.length },
                  { key: 'pending', label: 'بانتظار', count: pendingOrders },
                  { key: 'sorted', label: 'تم الفرز', count: sortedOrders },
                  { key: 'cancelled', label: 'ملغي', count: orders.filter(o => o.status === 'cancelled').length },
                ].map(f => (
                  <button key={f.key} onClick={() => setStatusFilter(f.key)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold transition-all whitespace-nowrap flex-shrink-0 flex items-center gap-1 ${statusFilter === f.key ? 'bg-indigo-500 text-white shadow-sm' : 'bg-white text-slate-500 border border-slate-200'}`}
                  >
                    {f.label}
                    <span className={`text-[9px] sm:text-[10px] px-1 py-0.5 rounded-full ${statusFilter === f.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400'}`}>{f.count}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3 sm:space-y-4">
              {filteredOrders.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-10 sm:p-16 text-center">
                  <Package className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 text-slate-200" />
                  <p className="text-sm sm:text-base font-medium text-slate-400">لا توجد طلبات</p>
                  <p className="text-xs sm:text-sm text-slate-300 mt-1">ستظهر هنا بمجرد إرسالها</p>
                </div>
              ) : (
                filteredOrders.map((order, idx) => {
                  const items = getItemsForOrder(order.id)
                  const st = STATUS_MAP[order.status] || STATUS_MAP.pending
                  const StIcon = st.icon
                  const firstTrack = items.find(it => it.track_number)?.track_number
                  return (
                    <div
                      key={order.id}
                      onClick={() => navigate(`/order/${order.id}`)}
                      className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-100 overflow-hidden cursor-pointer hover:shadow-md transition-all"
                    >
                      {/* Color strip */}
                      <div className={`h-1 ${order.status === 'sorted' ? 'bg-emerald-500' : order.status === 'cancelled' ? 'bg-red-500' : 'bg-indigo-500'}`}></div>
                      <div className="p-3.5 sm:p-5">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                              <span className="text-white font-bold text-[10px] sm:text-xs">#{idx + 1}</span>
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-800 text-sm sm:text-base">{order.customer_code}</p>
                              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                <span className="text-[10px] sm:text-[11px] text-slate-400">
                                  {new Date(order.created_at).toLocaleDateString('ar-IQ', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </span>
                                {firstTrack && (
                                  <span className="text-[9px] sm:text-[10px] bg-pink-50 text-pink-500 px-1 py-0.5 rounded font-mono">{firstTrack}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <span className={`inline-flex items-center gap-0.5 px-2 py-1 rounded-lg text-[9px] sm:text-[11px] font-semibold flex-shrink-0 ${st.color}`}>
                            <StIcon className="w-3 h-3" />
                            {st.label}
                          </span>
                        </div>

                        {/* Stats Row */}
                        <div className="grid grid-cols-3 gap-2 mb-3">
                          <div className="bg-indigo-50 rounded-lg p-2 sm:p-2.5 text-center">
                            <p className="text-[8px] sm:text-[10px] text-indigo-400 font-medium">المبلغ</p>
                            <p className="text-xs sm:text-sm font-bold text-indigo-700 mt-0.5">{formatNum(order.total_price || 0)}</p>
                          </div>
                          <div className="bg-slate-50 rounded-lg p-2 sm:p-2.5 text-center">
                            <p className="text-[8px] sm:text-[10px] text-slate-400 font-medium">العمولة</p>
                            <p className="text-xs sm:text-sm font-bold text-slate-700 mt-0.5">{formatNum(order.commission || 0)}</p>
                          </div>
                          <div className="bg-slate-50 rounded-lg p-2 sm:p-2.5 text-center">
                            <p className="text-[8px] sm:text-[10px] text-slate-400 font-medium">العناصر</p>
                            <p className="text-xs sm:text-sm font-bold text-slate-700 mt-0.5">{items.length}</p>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-1.5 sm:gap-2">
                          <div className="flex-1 flex items-center justify-center gap-1 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-[11px] sm:text-xs font-semibold">
                            <Eye className="w-3.5 h-3.5" />
                            التفاصيل
                            <ChevronLeft className="w-3 h-3" />
                          </div>
                          {order.status === 'pending' && (
                            <>
                              <button onClick={(e) => handleStatusChange(e, order.id, 'sorted', 'تم الفرز')} className="flex items-center justify-center gap-1 py-2 px-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[11px] font-semibold transition">
                                <CheckCircle className="w-3 h-3" />
                                <span className="hidden sm:inline">فرز</span>
                              </button>
                              <button onClick={(e) => handleStatusChange(e, order.id, 'cancelled', 'إلغاء')} className="flex items-center justify-center py-2 px-2.5 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg transition">
                                <XCircle className="w-3 h-3" />
                              </button>
                            </>
                          )}
                          <button onClick={(e) => handleStatusChange(e, order.id, 'delete', 'حذف')} className="flex items-center justify-center py-2 px-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg transition">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </>
        )}

        {/* China Orders Tab */}
        {activeTab === 'china' && (
          <>
            <div className="mb-4 sm:mb-6">
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {[
                  { key: 'all', label: 'الكل', count: chinaOrders.length },
                  { key: 'pending', label: 'جديد', count: chinaPending },
                  { key: 'confirmed', label: 'مؤكد', count: chinaOrders.filter(o => o.status === 'confirmed').length },
                  { key: 'purchased', label: 'تم الشراء', count: chinaOrders.filter(o => o.status === 'purchased').length },
                  { key: 'shipped', label: 'تم الشحن', count: chinaOrders.filter(o => o.status === 'shipped').length },
                  { key: 'delivered', label: 'تم التوصيل', count: chinaOrders.filter(o => o.status === 'delivered').length },
                ].map(f => (
                  <button key={f.key} onClick={() => setChinaStatusFilter(f.key)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold transition-all whitespace-nowrap flex-shrink-0 flex items-center gap-1 ${chinaStatusFilter === f.key ? 'bg-orange-500 text-white shadow-sm' : 'bg-white text-slate-500 border border-slate-200'}`}>
                    {f.label}
                    <span className={`text-[9px] sm:text-[10px] px-1 py-0.5 rounded-full ${chinaStatusFilter === f.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400'}`}>{f.count}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3 sm:space-y-4">
              {filteredChinaOrders.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-10 sm:p-16 text-center">
                  <ShoppingBag className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 text-slate-200" />
                  <p className="text-sm sm:text-base font-medium text-slate-400">لا توجد طلبات صين</p>
                  <p className="text-xs sm:text-sm text-slate-300 mt-1">ستظهر هنا عند إرسال طلبات من متجر الصين</p>
                </div>
              ) : (
                filteredChinaOrders.map((co, idx) => {
                  const items = getChinaItemsForOrder(co.id)
                  const st = CHINA_STATUS_MAP[co.status] || CHINA_STATUS_MAP.pending
                  const StIcon = st.icon
                  return (
                    <div key={co.id} className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                      <div className={`h-1 ${co.status === 'delivered' ? 'bg-emerald-500' : co.status === 'cancelled' ? 'bg-red-500' : 'bg-orange-500'}`}></div>
                      <div className="p-3.5 sm:p-5">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-orange-500 to-amber-600 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                              <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-800 text-sm sm:text-base">{co.customer_name}</p>
                              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                <span className="text-[10px] sm:text-[11px] text-slate-400 flex items-center gap-0.5">
                                  <Phone className="w-3 h-3" />{co.customer_phone}
                                </span>
                                <span className="text-[10px] sm:text-[11px] text-slate-400">
                                  {new Date(co.created_at).toLocaleDateString('ar-IQ', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </div>
                          </div>
                          <span className={`inline-flex items-center gap-0.5 px-2 py-1 rounded-lg text-[9px] sm:text-[11px] font-semibold flex-shrink-0 ${st.color}`}>
                            <StIcon className="w-3 h-3" />
                            {st.label}
                          </span>
                        </div>

                        {/* Info */}
                        {(co.customer_city || co.customer_address) && (
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-3">
                            <MapPin className="w-3 h-3" />
                            <span>{[co.customer_city, co.customer_address].filter(Boolean).join(' - ')}</span>
                          </div>
                        )}

                        {/* Items preview */}
                        {items.length > 0 && (
                          <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
                            {items.slice(0, 4).map(it => (
                              <div key={it.id} className="flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border border-slate-100 bg-slate-50">
                                {it.image ? <img src={it.image} alt="" className="w-full h-full object-cover" /> : <Package className="w-6 h-6 text-slate-200 m-auto mt-4" />}
                              </div>
                            ))}
                            {items.length > 4 && (
                              <div className="flex-shrink-0 w-14 h-14 rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-center">
                                <span className="text-[11px] font-bold text-slate-400">+{items.length - 4}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-2 mb-3">
                          <div className="bg-orange-50 rounded-lg p-2 sm:p-2.5 text-center">
                            <p className="text-[8px] sm:text-[10px] text-orange-400 font-medium">المبلغ</p>
                            <p className="text-xs sm:text-sm font-bold text-orange-700 mt-0.5">{formatNum(co.total_iqd || 0)}</p>
                          </div>
                          <div className="bg-slate-50 rounded-lg p-2 sm:p-2.5 text-center">
                            <p className="text-[8px] sm:text-[10px] text-slate-400 font-medium">العناصر</p>
                            <p className="text-xs sm:text-sm font-bold text-slate-700 mt-0.5">{items.length}</p>
                          </div>
                          <div className="bg-slate-50 rounded-lg p-2 sm:p-2.5 text-center">
                            <p className="text-[8px] sm:text-[10px] text-slate-400 font-medium">الكمية</p>
                            <p className="text-xs sm:text-sm font-bold text-slate-700 mt-0.5">{items.reduce((s, i) => s + (i.qty || 1), 0)}</p>
                          </div>
                        </div>

                        {co.notes && (
                          <div className="bg-amber-50 rounded-lg p-2.5 mb-3 text-[11px] text-amber-700 flex items-start gap-1.5">
                            <FileText className="w-3 h-3 mt-0.5 flex-shrink-0" />
                            <span>{co.notes}</span>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-1.5 sm:gap-2 flex-wrap">
                          {co.status === 'pending' && (
                            <button onClick={() => doChinaUpdateStatus(co.id, 'confirmed')} className="flex items-center gap-1 py-2 px-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-[11px] font-semibold transition">
                              <CheckCircle className="w-3 h-3" />تأكيد
                            </button>
                          )}
                          {co.status === 'confirmed' && (
                            <button onClick={() => doChinaUpdateStatus(co.id, 'purchased')} className="flex items-center gap-1 py-2 px-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-[11px] font-semibold transition">
                              <ShoppingBag className="w-3 h-3" />تم الشراء
                            </button>
                          )}
                          {co.status === 'purchased' && (
                            <button onClick={() => doChinaUpdateStatus(co.id, 'shipped')} className="flex items-center gap-1 py-2 px-3 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-[11px] font-semibold transition">
                              <Truck className="w-3 h-3" />تم الشحن
                            </button>
                          )}
                          {co.status === 'shipped' && (
                            <button onClick={() => doChinaUpdateStatus(co.id, 'delivered')} className="flex items-center gap-1 py-2 px-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[11px] font-semibold transition">
                              <CheckCircle className="w-3 h-3" />تم التوصيل
                            </button>
                          )}
                          {co.status !== 'cancelled' && co.status !== 'delivered' && (
                            <button onClick={() => setConfirmAction({ orderId: co.id, status: 'china_cancel', label: 'إلغاء' })} className="flex items-center justify-center py-2 px-2.5 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg transition">
                              <XCircle className="w-3 h-3" />
                            </button>
                          )}
                          <button onClick={() => setConfirmAction({ orderId: co.id, status: 'china_delete', label: 'حذف' })} className="flex items-center justify-center py-2 px-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg transition">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </>
        )}

        {/* Customers Tab */}
        {activeTab === 'customers' && (
          <div className="space-y-3">
            <h3 className="text-base font-bold text-slate-800">العملاء ({customers.length})</h3>
            {customers.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 text-center">
                <Users className="w-16 h-16 mx-auto mb-4 text-slate-200" />
                <p className="text-base font-medium text-slate-400">لا يوجد عملاء بعد</p>
              </div>
            ) : (
              customers.map((c) => (
                <div key={c.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-indigo-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 text-sm truncate">{c.name}</p>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                        <span className="flex items-center gap-0.5"><Hash className="w-3 h-3" />{c.code}</span>
                        {c.phone && <span className="flex items-center gap-0.5"><Phone className="w-3 h-3" />{c.phone}</span>}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 flex-shrink-0">{new Date(c.created_at).toLocaleDateString('ar-IQ')}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-30 lg:hidden safe-bottom">
        <div className="flex items-center justify-around py-2">
          {[
            { key: 'orders', label: 'الطلبات', icon: Package },
            { key: 'china', label: 'الصين', icon: ShoppingBag },
            { key: 'customers', label: 'العملاء', icon: Users },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex flex-col items-center gap-0.5 px-6 py-1.5 rounded-xl transition ${activeTab === tab.key ? 'text-indigo-600' : 'text-slate-400'}`}>
              <tab.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Confirm Dialog */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4" onClick={() => setConfirmAction(null)}>
          <div className="bg-white rounded-2xl w-full max-w-xs p-5 shadow-2xl text-center" onClick={e => e.stopPropagation()}>
            <div className={`w-14 h-14 mx-auto mb-3 rounded-full flex items-center justify-center ${confirmAction.status === 'cancelled' || confirmAction.status === 'delete' || confirmAction.status === 'china_cancel' || confirmAction.status === 'china_delete' ? 'bg-red-50' : 'bg-emerald-50'}`}>
              {confirmAction.status === 'delete' || confirmAction.status === 'china_delete'
                ? <Trash2 className="w-7 h-7 text-red-500" />
                : <AlertTriangle className={`w-7 h-7 ${confirmAction.status === 'cancelled' || confirmAction.status === 'china_cancel' ? 'text-red-500' : 'text-emerald-500'}`} />}
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1.5">هل أنت متأكد؟</h3>
            <p className="text-slate-500 text-xs mb-5 leading-relaxed">
              {confirmAction.status === 'delete' || confirmAction.status === 'china_delete'
                ? 'سيتم حذف هذا الطلب نهائياً مع جميع عناصره ولن يمكن استرجاعه.'
                : confirmAction.status === 'cancelled' || confirmAction.status === 'china_cancel'
                  ? 'سيتم إلغاء هذا الطلب ولن يمكن التراجع.'
                  : 'سيتم تأكيد فرز هذا الطلب. هل أنت متأكد؟'}
            </p>
            <div className="flex gap-2.5">
              <button onClick={() => setConfirmAction(null)} className="flex-1 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-medium text-sm transition">تراجع</button>
              <button onClick={() => {
                if (confirmAction.status === 'delete') doDeleteOrder(confirmAction.orderId)
                else if (confirmAction.status === 'china_delete') doChinaDelete(confirmAction.orderId)
                else if (confirmAction.status === 'china_cancel') doChinaUpdateStatus(confirmAction.orderId, 'cancelled')
                else doUpdateStatus(confirmAction.orderId, confirmAction.status)
              }}
                className={`flex-1 px-3 py-2.5 rounded-xl font-medium text-sm text-white transition ${confirmAction.status === 'cancelled' || confirmAction.status === 'delete' || confirmAction.status === 'china_cancel' || confirmAction.status === 'china_delete' ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-500 hover:bg-emerald-600'}`}
              >{confirmAction.label}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ──────────────────────────────────────────────
   App Router
   ────────────────────────────────────────────── */
function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/order/:id" element={<OrderDetailPage />} />
      <Route path="/submit" element={<SubmitPage />} />
      <Route path="/store/:slug" element={<StorePage />} />
      <Route path="/seller" element={<SellerDashboard />} />
      <Route path="/china/:provider" element={<ChinaShop />} />
      <Route path="/china-checkout" element={<ChinaCheckout />} />
      <Route path="/ax9admin" element={<AdminPanel />} />
    </Routes>
  )
}

export default App
