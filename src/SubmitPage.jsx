import { useState, useMemo } from 'react'
import { supabase } from './lib/supabase'
import { CITIES_DATA } from './citiesData'
import SplashPage from './SplashPage'
import {
  Package, Plus, Trash2, ChevronDown,
  Send, Image as ImageIcon, Link as LinkIcon, MapPin,
  Phone, User, Hash, FileText, CreditCard, ShoppingBag,
  Truck, X, Check, Loader2, Search, Lock, LogIn, AlertCircle, Box,
  ArrowRight, ArrowLeft, CheckCircle2, Circle, SkipForward
} from 'lucide-react'

const PACKAGE_SIZES = [
  { id: '1', name: 'عادي' },
  { id: '2', name: 'متوسط' },
  { id: '3', name: 'كبير' },
  { id: '4', name: 'كبير جداً' },
]

const WASEET_API = '/api/waseet-proxy'

const STEPS = [
  { id: 'code', label: 'كود العميل' },
  { id: 'waseet', label: 'التوصيل' },
  { id: 'customer', label: 'المستلم' },
  { id: 'product', label: 'المنتج' },
  { id: 'review', label: 'المراجعة' },
]

const createEmptyOrder = () => ({
  id: Date.now().toString() + Math.random(),
  productImage: null,
  productLink: '',
  trackNumber: '',
  customerName: '',
  customerPhone: '',
  cityId: '',
  cityName: '',
  regionId: '',
  regionName: '',
  fullAddress: '',
  priceWithDelivery: '',
  quantity: '1',
  notes: '',
  packageSize: '1',
  typeName: '',
})

const formatNum = (num) => Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')

function SearchableDropdown({ label, items, selectedId, placeholder, searchPlaceholder, onSelect }) {
  const [search, setSearch] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const selected = items.find(i => i.id === selectedId)
  const filtered = useMemo(() => {
    if (!search.trim()) return items.slice(0, 80)
    return items.filter(i => i.name.includes(search.trim())).slice(0, 80)
  }, [items, search])

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-neutral-500 mb-2">{label}</label>
      <button type="button" onClick={() => setIsOpen(!isOpen)}
        className={`w-full h-12 px-4 bg-neutral-50 border rounded-xl text-sm text-right flex items-center justify-between outline-none transition-all ${selected ? 'border-neutral-300 text-neutral-900' : 'border-neutral-200 text-neutral-400'} ${isOpen ? 'border-neutral-900 ring-1 ring-neutral-900' : 'hover:border-neutral-300 focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900'}`}>
        <span>{selected ? selected.name : placeholder}</span>
        <ChevronDown className={`w-4 h-4 text-neutral-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => { setIsOpen(false); setSearch('') }} />
          <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-white border border-neutral-200 rounded-xl shadow-lg max-h-72 overflow-hidden">
            <div className="p-2 border-b border-neutral-100">
              <div className="relative">
                <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input type="text" placeholder={searchPlaceholder} value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-10 pr-10 pl-3 bg-neutral-50 border border-neutral-200 rounded-lg text-sm outline-none focus:border-neutral-400" autoFocus />
              </div>
            </div>
            <div className="overflow-y-auto max-h-52">
              {filtered.length === 0 ? (
                <p className="text-center text-sm text-neutral-400 py-4">لا توجد نتائج</p>
              ) : filtered.map(item => (
                <button key={item.id} type="button"
                  onClick={() => { onSelect(item.id, item.name); setIsOpen(false); setSearch('') }}
                  className={`w-full text-right px-4 py-2.5 text-sm transition-colors ${selectedId === item.id ? 'bg-neutral-900 text-white' : 'text-neutral-700 hover:bg-neutral-50'}`}>
                  {item.name}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default function SubmitPage() {
  const [showSplash, setShowSplash] = useState(true)
  const [step, setStep] = useState(0)
  const [customerCode, setCustomerCode] = useState('')
  const [orders, setOrders] = useState([createEmptyOrder()])
  const [currentOrderIdx, setCurrentOrderIdx] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState(null)
  const [confirmModal, setConfirmModal] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  // Waseet login
  const [waseetUser, setWaseetUser] = useState('')
  const [waseetPass, setWaseetPass] = useState('')
  const [waseetToken, setWaseetToken] = useState(null)
  const [waseetLogging, setWaseetLogging] = useState(false)
  const [waseetError, setWaseetError] = useState('')

  const loginWaseet = async () => {
    if (!waseetUser.trim() || !waseetPass.trim()) {
      setWaseetError('يرجى إدخال اسم المستخدم وكلمة المرور')
      return
    }
    setWaseetLogging(true)
    setWaseetError('')
    try {
      const res = await fetch(WASEET_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', username: waseetUser.trim(), password: waseetPass })
      })
      const data = await res.json()
      if (data.status && data.data?.token) {
        setWaseetToken(data.data.token)
        showToast('تم تسجيل الدخول بنجاح في الوسيط')
      } else {
        setWaseetError(data.msg || 'فشل تسجيل الدخول - تأكد من البيانات')
      }
    } catch (err) {
      setWaseetError('خطأ في الاتصال بالسيرفر')
    }
    setWaseetLogging(false)
  }

  const logoutWaseet = () => {
    setWaseetToken(null)
    setWaseetPass('')
    setWaseetError('')
  }

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const addNewOrder = () => {
    setOrders([...orders, createEmptyOrder()])
    setCurrentOrderIdx(orders.length)
  }

  const removeOrder = (index) => {
    if (orders.length === 1) {
      showToast('يجب أن يكون هناك طلب واحد على الأقل', 'error')
      return
    }
    const newOrders = orders.filter((_, i) => i !== index)
    setOrders(newOrders)
    if (currentOrderIdx >= newOrders.length) setCurrentOrderIdx(newOrders.length - 1)
  }

  const updateOrder = (index, field, value) => {
    setOrders(prev => {
      const newOrders = [...prev]
      newOrders[index] = { ...newOrders[index], [field]: value }
      return newOrders
    })
  }

  const updateOrderMulti = (index, fields) => {
    setOrders(prev => {
      const newOrders = [...prev]
      newOrders[index] = { ...newOrders[index], ...fields }
      return newOrders
    })
  }

  const handleImagePick = (index) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = (e) => {
      const file = e.target.files[0]
      if (file) {
        const reader = new FileReader()
        reader.onloadend = () => {
          updateOrder(index, 'productImage', reader.result)
          updateOrder(index, '_imageFile', file)
        }
        reader.readAsDataURL(file)
      }
    }
    input.click()
  }

  const validate = () => {
    if (!customerCode.trim()) {
      showToast('يرجى إدخال كود العميل', 'error')
      return false
    }
    for (let i = 0; i < orders.length; i++) {
      const o = orders[i]
      if (!o.trackNumber.trim()) { showToast(`يرجى إدخال رقم التتبع في الطلب ${i + 1}`, 'error'); return false }
      if (!o.customerName.trim()) { showToast(`يرجى إدخال اسم الزبون في الطلب ${i + 1}`, 'error'); return false }
      if (!o.customerPhone.trim()) { showToast(`يرجى إدخال رقم هاتف الزبون في الطلب ${i + 1}`, 'error'); return false }
      if (!o.cityId) { showToast(`يرجى اختيار المحافظة في الطلب ${i + 1}`, 'error'); return false }
      if (!o.regionId) { showToast(`يرجى اختيار المنطقة في الطلب ${i + 1}`, 'error'); return false }
      if (!o.priceWithDelivery.trim()) { showToast(`يرجى إدخال السعر في الطلب ${i + 1}`, 'error'); return false }
    }
    return true
  }

  const handleSubmit = () => {
    if (!validate()) return
    setConfirmModal(true)
  }

  const doSubmit = async () => {
    setConfirmModal(false)
    setSubmitting(true)
    try {
      let { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('code', customerCode.trim())
        .single()

      let customerId
      if (existingCustomer) {
        customerId = existingCustomer.id
      } else {
        const { data: newCustomer, error: custErr } = await supabase
          .from('customers')
          .insert({ code: customerCode.trim(), name: customerCode.trim() })
          .select('id')
          .single()
        if (custErr) throw custErr
        customerId = newCustomer.id
      }

      let waseetResults = []

      for (const o of orders) {
        const totalPrice = parseFloat(o.priceWithDelivery) || 0
        const qty = parseInt(o.quantity) || 1
        const commission = 1000

        let imageUrl = null
        if (o._imageFile) {
          try {
            const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`
            const { data: uploadData, error: uploadErr } = await supabase.storage
              .from('product-images')
              .upload(fileName, o._imageFile, { contentType: o._imageFile.type })
            if (!uploadErr && uploadData) {
              const { data: urlData } = supabase.storage
                .from('product-images')
                .getPublicUrl(uploadData.path)
              imageUrl = urlData.publicUrl
            }
          } catch (imgErr) {
            console.warn('Image upload error:', imgErr)
          }
        }

        // Send to Waseet if logged in
        let waseetQrId = null
        let waseetQrLink = null
        if (waseetToken) {
          try {
            let phone = o.customerPhone.replace(/\s+/g, '')
            if (phone.startsWith('0')) phone = '+964' + phone.slice(1)
            else if (!phone.startsWith('+')) phone = '+964' + phone

            const waseetRes = await fetch(WASEET_API, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'create-order',
                token: waseetToken,
                client_name: o.customerName,
                client_mobile: phone,
                city_id: o.cityId,
                region_id: o.regionId,
                location: o.fullAddress || o.regionName || 'غير محدد',
                type_name: o.typeName || 'بضاعة',
                items_number: qty,
                price: Math.round(totalPrice),
                package_size: o.packageSize || '1',
                merchant_notes: o.notes || '',
                replacement: 0,
              })
            })
            const waseetData = await waseetRes.json()
            if (waseetData.status && waseetData.data?.[0]) {
              waseetQrId = waseetData.data[0].qr_id
              waseetQrLink = waseetData.data[0].qr_link
              waseetResults.push({ name: o.customerName, qrId: waseetQrId, qrLink: waseetQrLink, success: true })
            } else {
              waseetResults.push({ name: o.customerName, success: false, msg: waseetData.msg })
            }
          } catch (wErr) {
            console.warn('Waseet error:', wErr)
            waseetResults.push({ name: o.customerName, success: false, msg: wErr.message })
          }
        }

        const { data: newOrder, error: orderErr } = await supabase
          .from('orders')
          .insert({
            customer_id: customerId,
            customer_code: customerCode.trim(),
            status: 'pending',
            total_price: totalPrice,
            total_qty: qty,
            commission: commission,
          })
          .select('id')
          .single()
        if (orderErr) throw orderErr

        const { error: itemErr } = await supabase
          .from('order_items')
          .insert({
            order_id: newOrder.id,
            product_image: imageUrl,
            product_link: o.productLink || null,
            track_number: o.trackNumber || waseetQrId?.toString() || null,
            customer_name: o.customerName,
            customer_phone: o.customerPhone,
            city: o.cityName,
            area: o.regionName || null,
            full_address: o.fullAddress || null,
            price_with_delivery: totalPrice,
            quantity: qty,
            notes: o.notes || null,
            waseet_qr_id: waseetQrId?.toString() || null,
            waseet_qr_link: waseetQrLink || null,
          })
        if (itemErr) throw itemErr
      }

      const waseetSuccess = waseetResults.filter(r => r.success).length
      const waseetFail = waseetResults.filter(r => !r.success).length
      let msg = 'تم إرسال الطلبات بنجاح! سيتم فرزها وتوصيلها قريباً'
      if (waseetToken && waseetSuccess > 0) msg = `تم إرسال ${waseetSuccess} طلب للوسيط بنجاح ✓`
      if (waseetToken && waseetFail > 0) msg += ` | فشل ${waseetFail} طلب`
      showToast(msg, waseetFail > 0 ? 'error' : 'success')
      setOrders([createEmptyOrder()])
      setCurrentOrderIdx(0)
      setStep(0)
      setSubmitted(true)
      setCustomerCode('')
    } catch (err) {
      console.error('Submit error:', err)
      showToast(`فشل الإرسال: ${err.message || 'خطأ غير معروف'}`, 'error')
    }
    setSubmitting(false)
  }

  const order = orders[currentOrderIdx] || orders[0]
  const totalPrice = orders.reduce((s, o) => s + (parseFloat(o.priceWithDelivery) || 0), 0)
  const totalQty = orders.reduce((s, o) => s + (parseInt(o.quantity) || 0), 0)
  const totalCommission = orders.length * 1000
  const grandTotal = totalPrice + totalCommission

  const canNext = () => {
    if (step === 0) return customerCode.trim().length > 0
    if (step === 1) return true
    if (step === 2) return order.customerName.trim() && order.customerPhone.trim() && order.cityId && order.regionId
    if (step === 3) return order.trackNumber.trim() && order.priceWithDelivery.trim()
    return true
  }

  const goNext = () => {
    if (!canNext()) return
    if (step < STEPS.length - 1) setStep(step + 1)
  }
  const goBack = () => { if (step > 0) setStep(step - 1) }

  const inputClass = "w-full h-12 px-4 bg-neutral-50 border border-neutral-200 rounded-xl text-sm outline-none transition-all hover:border-neutral-300 focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"

  if (showSplash) return <SplashPage onStart={() => setShowSplash(false)} />

  return (
    <div className="min-h-screen bg-white" dir="rtl">
      {/* Top Bar */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-neutral-100">
        <div className="max-w-lg mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-neutral-900 rounded-lg flex items-center justify-center">
              <Package className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold text-neutral-900 tracking-tight">افرزلي</span>
          </div>
          <span className="text-xs text-neutral-400 font-medium">{STEPS[step].label}</span>
        </div>
      </div>

      {/* Progress */}
      <div className="max-w-lg mx-auto px-5 pt-6 pb-2">
        <div className="flex items-center gap-1">
          {STEPS.map((s, i) => (
            <div key={s.id} className={`flex-1 h-1 rounded-full transition-all duration-500 ${i <= step ? 'bg-neutral-900' : 'bg-neutral-100'}`} />
          ))}
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-[11px] text-neutral-400">الخطوة {step + 1} من {STEPS.length}</span>
          <span className="text-[11px] text-neutral-400">{Math.round(((step + 1) / STEPS.length) * 100)}%</span>
        </div>
      </div>

      {/* Step Content */}
      <div className="max-w-lg mx-auto px-5 py-6 min-h-[60vh] flex flex-col">
        <div className="flex-1">

          {/* Step 0: Customer Code */}
          {step === 0 && (
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-neutral-900 mb-2">مرحباً بك</h2>
                <p className="text-neutral-500 text-sm leading-relaxed">أدخل كود العميل الخاص بك للبدء بإرسال طلباتك</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-500 mb-2">كود العميل</label>
                <input
                  type="text"
                  placeholder="مثال: ABC123"
                  value={customerCode}
                  onChange={(e) => setCustomerCode(e.target.value.toUpperCase())}
                  className="w-full h-14 px-5 bg-neutral-50 border border-neutral-200 rounded-xl text-lg font-bold tracking-widest text-center text-neutral-900 placeholder:text-neutral-300 placeholder:tracking-normal placeholder:text-sm placeholder:font-normal outline-none transition-all focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
                  autoFocus
                />
              </div>
              <div className="bg-neutral-50 rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-neutral-500">كيف تعمل الخدمة؟</p>
                {[
                  { n: '1', t: 'أرسل بضاعتك إلينا' },
                  { n: '2', t: 'أدخل بيانات زبائنك' },
                  { n: '3', t: 'نفرز ونوصل لكل زبون' },
                ].map((s, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-neutral-900 rounded-md flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0">{s.n}</div>
                    <span className="text-sm text-neutral-600">{s.t}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 1: Waseet Login */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-neutral-900 mb-2">ربط شركة التوصيل</h2>
                <p className="text-neutral-500 text-sm leading-relaxed">سجّل دخول بحسابك في الوسيط لإرسال الطلبات تلقائياً، أو تخطّ هذه الخطوة</p>
              </div>

              {!waseetToken ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-500 mb-2">اسم المستخدم</label>
                    <input type="text" dir="ltr" placeholder="username" value={waseetUser}
                      onChange={(e) => setWaseetUser(e.target.value)} className={inputClass + " text-left"} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-500 mb-2">كلمة المرور</label>
                    <input type="password" dir="ltr" placeholder="password" value={waseetPass}
                      onChange={(e) => setWaseetPass(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && loginWaseet()} className={inputClass + " text-left"} />
                  </div>
                  {waseetError && (
                    <div className="flex items-center gap-2 text-red-600 text-xs bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" /> {waseetError}
                    </div>
                  )}
                  <button onClick={loginWaseet} disabled={waseetLogging}
                    className={`w-full h-12 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${waseetLogging ? 'bg-neutral-100 text-neutral-400' : 'bg-neutral-900 hover:bg-neutral-800 text-white active:scale-[0.98]'}`}>
                    {waseetLogging ? <><Loader2 className="w-4 h-4 animate-spin" /> جاري الدخول...</> : <><LogIn className="w-4 h-4" /> تسجيل الدخول</>}
                  </button>
                </div>
              ) : (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Check className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-emerald-800">متصل بحساب: {waseetUser}</p>
                    <p className="text-xs text-emerald-600">الطلبات سترسل تلقائياً للوسيط</p>
                  </div>
                  <button onClick={logoutWaseet} className="text-xs text-red-500 font-semibold">فصل</button>
                </div>
              )}

              <div className="bg-neutral-50 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <Truck className="w-5 h-5 text-neutral-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-neutral-700">التوصيل عبر شركة الوسيط</p>
                    <p className="text-xs text-neutral-400 mt-1 leading-relaxed">عمولة الفرز: 1,000 د.ع لكل طلب. أجور التوصيل تبدأ من 5,000 د.ع حسب حجم الطرد.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Customer Info */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-neutral-900 mb-2">بيانات المستلم</h2>
                <p className="text-neutral-500 text-sm">الطلب {currentOrderIdx + 1} من {orders.length}</p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-500 mb-2">اسم الزبون</label>
                  <input type="text" placeholder="الاسم الكامل" value={order.customerName}
                    onChange={(e) => updateOrder(currentOrderIdx, 'customerName', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-500 mb-2">رقم الهاتف</label>
                  <input type="tel" dir="ltr" placeholder="07XX XXX XXXX" value={order.customerPhone}
                    onChange={(e) => updateOrder(currentOrderIdx, 'customerPhone', e.target.value)} className={inputClass + " text-left"} />
                </div>
                <SearchableDropdown
                  label="المحافظة"
                  items={CITIES_DATA.map(c => ({ id: c.id, name: c.name }))}
                  selectedId={order.cityId}
                  placeholder="اختر المحافظة..."
                  searchPlaceholder="ابحث عن المحافظة..."
                  onSelect={(id, name) => updateOrderMulti(currentOrderIdx, { cityId: id, cityName: name, regionId: '', regionName: '' })}
                />
                {order.cityId && (
                  <SearchableDropdown
                    label="المنطقة"
                    items={(CITIES_DATA.find(c => c.id === order.cityId)?.regions || [])}
                    selectedId={order.regionId}
                    placeholder="اختر المنطقة..."
                    searchPlaceholder="ابحث عن المنطقة..."
                    onSelect={(id, name) => updateOrderMulti(currentOrderIdx, { regionId: id, regionName: name })}
                  />
                )}
                <div>
                  <label className="block text-sm font-medium text-neutral-500 mb-2">العنوان التفصيلي</label>
                  <textarea placeholder="أقرب نقطة دالّة..." value={order.fullAddress}
                    onChange={(e) => updateOrder(currentOrderIdx, 'fullAddress', e.target.value)}
                    rows={2} className={inputClass + " h-auto py-3 resize-none"} />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Product & Price */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-neutral-900 mb-2">تفاصيل المنتج</h2>
                <p className="text-neutral-500 text-sm">الطلب {currentOrderIdx + 1} — {order.customerName || 'بدون اسم'}</p>
              </div>

              {/* Image */}
              <button onClick={() => handleImagePick(currentOrderIdx)}
                className="w-full border border-dashed border-neutral-200 rounded-xl overflow-hidden hover:border-neutral-400 transition-all group">
                {order.productImage ? (
                  <img src={order.productImage} alt="" className="w-full h-40 object-cover" />
                ) : (
                  <div className="py-8 flex flex-col items-center text-neutral-300 group-hover:text-neutral-500 transition-colors">
                    <ImageIcon className="w-8 h-8 mb-2" />
                    <span className="text-sm">إضافة صورة المنتج</span>
                  </div>
                )}
              </button>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-500 mb-2">رقم التتبع</label>
                  <input type="text" dir="ltr" placeholder="Track Number" value={order.trackNumber}
                    onChange={(e) => updateOrder(currentOrderIdx, 'trackNumber', e.target.value)} className={inputClass + " text-left"} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-500 mb-2">رابط المنتج (اختياري)</label>
                  <input type="url" dir="ltr" placeholder="https://..." value={order.productLink}
                    onChange={(e) => updateOrder(currentOrderIdx, 'productLink', e.target.value)} className={inputClass + " text-left"} />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-neutral-500 mb-2">السعر شامل التوصيل</label>
                    <input type="number" dir="ltr" placeholder="25,000" value={order.priceWithDelivery}
                      onChange={(e) => updateOrder(currentOrderIdx, 'priceWithDelivery', e.target.value)} className={inputClass + " text-left"} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-500 mb-2">الكمية</label>
                    <input type="number" dir="ltr" placeholder="1" value={order.quantity}
                      onChange={(e) => updateOrder(currentOrderIdx, 'quantity', e.target.value)} className={inputClass + " text-center"} />
                  </div>
                </div>
                {waseetToken && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-neutral-500 mb-2">حجم الطرد</label>
                      <select value={order.packageSize}
                        onChange={(e) => updateOrder(currentOrderIdx, 'packageSize', e.target.value)}
                        className={inputClass + " appearance-none"}>
                        {PACKAGE_SIZES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-500 mb-2">نوع البضاعة</label>
                      <input type="text" placeholder="ملابس..." value={order.typeName}
                        onChange={(e) => updateOrder(currentOrderIdx, 'typeName', e.target.value)} className={inputClass} />
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-neutral-500 mb-2">ملاحظات</label>
                  <textarea placeholder="ملاحظات إضافية..." value={order.notes}
                    onChange={(e) => updateOrder(currentOrderIdx, 'notes', e.target.value)}
                    rows={2} className={inputClass + " h-auto py-3 resize-none"} />
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-neutral-900 mb-2">مراجعة الطلبات</h2>
                <p className="text-neutral-500 text-sm">تأكد من البيانات قبل الإرسال</p>
              </div>

              {orders.map((o, i) => (
                <div key={o.id} className="border border-neutral-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-neutral-900 rounded-lg flex items-center justify-center text-white text-xs font-bold">{i + 1}</div>
                      <div>
                        <p className="text-sm font-bold text-neutral-900">{o.customerName || '—'}</p>
                        <p className="text-xs text-neutral-400">{o.cityName}{o.regionName ? ` — ${o.regionName}` : ''}</p>
                      </div>
                    </div>
                    {orders.length > 1 && (
                      <button onClick={() => removeOrder(i)} className="w-8 h-8 rounded-lg bg-neutral-50 hover:bg-red-50 flex items-center justify-center transition-colors">
                        <Trash2 className="w-3.5 h-3.5 text-neutral-400 hover:text-red-500" />
                      </button>
                    )}
                  </div>
                  <div className="h-px bg-neutral-100"></div>
                  <div className="grid grid-cols-2 gap-y-2 text-xs">
                    <span className="text-neutral-400">الهاتف</span>
                    <span className="text-neutral-700 font-medium text-left" dir="ltr">{o.customerPhone || '—'}</span>
                    <span className="text-neutral-400">رقم التتبع</span>
                    <span className="text-neutral-700 font-medium text-left" dir="ltr">{o.trackNumber || '—'}</span>
                    <span className="text-neutral-400">السعر</span>
                    <span className="text-neutral-700 font-medium">{o.priceWithDelivery ? formatNum(parseFloat(o.priceWithDelivery)) + ' د.ع' : '—'}</span>
                    <span className="text-neutral-400">الكمية</span>
                    <span className="text-neutral-700 font-medium">{o.quantity}</span>
                  </div>
                </div>
              ))}

              {/* Add another order */}
              <button onClick={() => { addNewOrder(); setCurrentOrderIdx(orders.length); setStep(2) }}
                className="w-full border border-dashed border-neutral-200 rounded-xl py-3 flex items-center justify-center gap-2 text-neutral-500 text-sm font-medium hover:bg-neutral-50 transition-colors">
                <Plus className="w-4 h-4" /> إضافة طلب آخر
              </button>

              {/* Summary */}
              <div className="bg-neutral-900 rounded-xl p-5 text-white space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-400">عدد الطلبات</span>
                  <span className="font-semibold">{orders.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-400">مجموع الطلبات</span>
                  <span className="font-semibold">{formatNum(totalPrice)} د.ع</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-400">عمولة الفرز</span>
                  <span className="font-semibold">{formatNum(totalCommission)} د.ع</span>
                </div>
                <div className="h-px bg-neutral-700"></div>
                <div className="flex justify-between items-center">
                  <span className="font-bold">الإجمالي</span>
                  <span className="text-xl font-bold">{formatNum(grandTotal)} <span className="text-xs text-neutral-400">د.ع</span></span>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Navigation */}
        <div className="mt-8 space-y-3">
          {step === 4 ? (
            <button onClick={handleSubmit} disabled={submitting}
              className={`w-full h-14 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all ${submitting ? 'bg-neutral-200 text-neutral-400' : 'bg-neutral-900 hover:bg-neutral-800 text-white active:scale-[0.98]'}`}>
              {submitting ? <><Loader2 className="w-5 h-5 animate-spin" /> جاري الإرسال...</> : <><Send className="w-5 h-5" /> إرسال الطلبات</>}
            </button>
          ) : (
            <button onClick={goNext} disabled={!canNext()}
              className={`w-full h-14 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all ${canNext() ? 'bg-neutral-900 hover:bg-neutral-800 text-white active:scale-[0.98]' : 'bg-neutral-100 text-neutral-300 cursor-not-allowed'}`}>
              {step === 1 && !waseetToken ? 'تخطّي' : 'التالي'}
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          {step > 0 && (
            <button onClick={goBack}
              className="w-full h-12 rounded-xl font-medium text-sm text-neutral-500 hover:bg-neutral-50 flex items-center justify-center gap-2 transition-all">
              <ArrowRight className="w-4 h-4" /> رجوع
            </button>
          )}
        </div>
      </div>

      {/* Confirm Modal */}
      {confirmModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center" onClick={() => setConfirmModal(false)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-neutral-900 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Send className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-neutral-900">تأكيد الإرسال</h3>
              <p className="text-sm text-neutral-500 mt-1">هل تريد إرسال {orders.length} طلب للفرز والتوصيل؟</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmModal(false)} className="flex-1 h-12 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-xl font-semibold text-sm transition-all">إلغاء</button>
              <button onClick={doSubmit} className="flex-1 h-12 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl font-semibold text-sm transition-all">تأكيد</button>
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
