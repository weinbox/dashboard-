import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import {
  ArrowRight, ShoppingCart, Loader2, CheckCircle, Package,
  User, Phone, MapPin, FileText, Trash2, X, Minus, Plus,
  Shield, Truck, CreditCard
} from 'lucide-react'

const formatNum = (n) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')

export default function ChinaCheckout() {
  const navigate = useNavigate()

  const [cart, setCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem('china_cart') || '[]') } catch { return [] }
  })

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [savedTotal, setSavedTotal] = useState(0)

  useEffect(() => {
    localStorage.setItem('china_cart', JSON.stringify(cart))
  }, [cart])

  const updateQty = (id, delta) => {
    setCart(cart.map(c => {
      const match = c.uniqueId ? c.uniqueId === id : c.id === id
      if (!match) return c
      const newQty = c.qty + delta
      return newQty > 0 ? { ...c, qty: newQty } : c
    }).filter(c => c.qty > 0))
  }

  const removeItem = (id) => {
    setCart(cart.filter(c => c.uniqueId ? c.uniqueId !== id : c.id !== id))
  }

  const cartTotal = cart.reduce((sum, c) => sum + c.priceIqd * c.qty, 0)
  const cartTotalUsd = cart.reduce((sum, c) => sum + c.priceUsd * c.qty, 0)
  const cartTotalCny = cart.reduce((sum, c) => sum + c.priceCny * c.qty, 0)
  const cartCount = cart.reduce((sum, c) => sum + c.qty, 0)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim() || !phone.trim()) return
    if (cart.length === 0) return

    setSubmitting(true)
    try {
      const { data: order, error: orderErr } = await supabase.from('china_orders').insert({
        customer_name: name.trim(),
        customer_phone: phone.trim(),
        customer_city: city.trim(),
        customer_address: address.trim(),
        notes: notes.trim(),
        total_cny: cartTotalCny,
        total_usd: cartTotalUsd,
        total_iqd: cartTotal,
      }).select().single()

      if (orderErr) throw orderErr

      const items = cart.map(c => ({
        order_id: order.id,
        product_id: c.id,
        title: c.title,
        image: c.image,
        price_cny: c.priceCny,
        price_usd: c.priceUsd,
        price_iqd: c.priceIqd,
        qty: c.qty,
        provider: c.provider,
        product_url: c.url,
      }))

      await supabase.from('china_order_items').insert(items)

      setSavedTotal(cartTotal)
      localStorage.removeItem('china_cart')
      setCart([])
      setDone(true)
    } catch (err) {
      console.error('Order error:', err)
      alert('حدث خطأ أثناء إرسال الطلب')
    }
    setSubmitting(false)
  }

  const inputClass = "w-full h-[52px] px-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm outline-none transition-all hover:border-gray-300 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/15 focus:bg-white placeholder:text-gray-300"

  // ─── Order Success ───
  if (done) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 flex items-center justify-center p-6" dir="rtl">
        <div className="text-center max-w-sm w-full">
          <div className="w-24 h-24 bg-emerald-50 rounded-[28px] flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-100/50">
            <CheckCircle className="w-12 h-12 text-emerald-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-3">تم إرسال طلبك بنجاح!</h1>
          {savedTotal > 0 && (
            <p className="text-lg font-black text-orange-600 mb-3">{formatNum(savedTotal)} <span className="text-sm font-bold text-gray-500">د.ع</span></p>
          )}
          <p className="text-sm text-gray-400 leading-relaxed mb-8">
            سنتواصل معك قريباً لتأكيد الطلب وتفاصيل الشحن والتكلفة النهائية.
          </p>
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 mb-8">
            <p className="text-sm text-amber-700 leading-relaxed font-medium">
  تكلفة الشحن تُدفع عند الاستلام. سنتواصل معك لتأكيد التفاصيل.
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => navigate('/')}
              className="flex-1 h-[52px] bg-gray-900 hover:bg-gray-800 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]">
              <ArrowRight className="w-4 h-4" />
              الرئيسية
            </button>
            <button onClick={() => navigate(-1)}
              className="flex-1 h-[52px] bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-orange-200/50">
              <ShoppingCart className="w-4 h-4" />
              تسوق أكثر
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ─── Empty Cart ───
  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 flex items-center justify-center p-6" dir="rtl">
        <div className="text-center">
          <div className="w-24 h-24 bg-gray-100 rounded-[28px] flex items-center justify-center mx-auto mb-6">
            <ShoppingCart className="w-12 h-12 text-gray-300" />
          </div>
          <h2 className="text-xl font-bold text-gray-700 mb-2">السلة فارغة</h2>
          <p className="text-sm text-gray-400 mb-8">أضف منتجات من تاوباو أو 1688 أولاً</p>
          <button onClick={() => navigate('/')}
            className="h-[52px] px-10 bg-gray-900 hover:bg-gray-800 text-white rounded-2xl font-bold text-sm transition-all active:scale-[0.98]">
            الرجوع للرئيسية
          </button>
        </div>
      </div>
    )
  }

  // ─── Checkout Form ───
  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-lg border-b border-gray-200 shadow-sm">
        <div className="max-w-2xl mx-auto px-5 h-16 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-gray-800 text-sm font-semibold transition-colors px-3 py-2 rounded-xl hover:bg-gray-100">
            <ArrowRight className="w-5 h-5" />
            <span>رجوع</span>
          </button>
          <h1 className="text-lg font-bold text-gray-800">إتمام الطلب</h1>
          <div className="w-20" />
        </div>
      </header>

      {/* Steps indicator */}
      <div className="max-w-2xl mx-auto px-5 pt-5 pb-2">
        <div className="flex items-center justify-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center text-sm font-bold shadow-md shadow-orange-200">1</div>
            <span className="text-sm font-semibold text-gray-700">المنتجات</span>
          </div>
          <div className="w-10 h-0.5 bg-orange-200 rounded-full" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center text-sm font-bold shadow-md shadow-orange-200">2</div>
            <span className="text-sm font-semibold text-gray-700">البيانات</span>
          </div>
          <div className="w-10 h-0.5 bg-gray-200 rounded-full" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-400 flex items-center justify-center text-sm font-bold">3</div>
            <span className="text-sm font-medium text-gray-400">التأكيد</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto px-5 py-5 space-y-5 pb-36">
        {/* Cart Items */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2.5">
            <Package className="w-5 h-5 text-orange-500" />
            <h2 className="text-[15px] font-bold text-gray-800">المنتجات</h2>
            <span className="text-sm text-gray-400 mr-auto">{cartCount} منتج</span>
          </div>
          <div className="divide-y divide-gray-50">
            {cart.map(c => (
              <div key={c.uniqueId || c.id} className="flex gap-4 p-4 hover:bg-gray-50/50 transition-colors">
                <img src={c.image} alt="" className="w-[80px] h-[80px] rounded-xl object-cover flex-shrink-0 shadow-sm border border-gray-100" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 line-clamp-2 leading-snug">{c.title}</p>
                  <span className="text-[11px] text-orange-500 bg-orange-50 px-2 py-0.5 rounded-md font-medium inline-block mt-1.5">{c.providerLabel}</span>
                  <div className="flex items-center justify-between mt-2.5">
                    <span className="text-[15px] font-bold text-orange-600">{formatNum(c.priceIqd * c.qty)} <span className="text-[11px] font-normal text-gray-400">د.ع</span></span>
                    <div className="flex items-center gap-2.5">
                      <button type="button" onClick={() => updateQty(c.uniqueId || c.id, -1)}
                        className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
                        {c.qty === 1 ? <Trash2 className="w-3.5 h-3.5 text-red-400" /> : <Minus className="w-3.5 h-3.5 text-gray-500" />}
                      </button>
                      <span className="text-base font-bold w-6 text-center text-gray-800">{c.qty}</span>
                      <button type="button" onClick={() => updateQty(c.uniqueId || c.id, 1)}
                        className="w-8 h-8 rounded-xl bg-orange-500 flex items-center justify-center hover:bg-orange-600 transition-colors shadow-sm">
                        <Plus className="w-3.5 h-3.5 text-white" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Price Summary */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2.5">
            <CreditCard className="w-5 h-5 text-orange-500" />
            <h2 className="text-[15px] font-bold text-gray-800">ملخص الأسعار</h2>
          </div>
          <div className="p-5 space-y-3.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">المنتجات ({cartCount})</span>
              <span className="font-bold text-gray-800">{formatNum(cartTotal)} د.ع</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">الشحن</span>
              <span className="text-xs text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg font-medium">عند الاستلام</span>
            </div>
            <div className="border-t border-gray-100 pt-4 flex items-center justify-between">
              <span className="text-base font-bold text-gray-800">المجموع</span>
              <span className="text-2xl font-black text-orange-600">{formatNum(cartTotal)} <span className="text-sm font-bold">د.ع</span></span>
            </div>
          </div>
        </div>

        {/* Customer Info */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2.5">
            <User className="w-5 h-5 text-orange-500" />
            <h2 className="text-[15px] font-bold text-gray-800">بيانات التواصل</h2>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-2">الاسم الكامل <span className="text-red-400">*</span></label>
              <input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="اسمك الكامل" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-2">رقم الهاتف <span className="text-red-400">*</span></label>
              <input type="tel" required dir="ltr" value={phone} onChange={e => setPhone(e.target.value)} placeholder="07xx xxx xxxx" className={inputClass + " text-left"} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-2">المدينة</label>
              <input type="text" value={city} onChange={e => setCity(e.target.value)} placeholder="بغداد، بصرة، أربيل..." className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-2">العنوان التفصيلي</label>
              <input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="المنطقة، الشارع، أقرب نقطة دالة" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-2">ملاحظات <span className="text-gray-300 font-normal">(اختياري)</span></label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="مقاس، لون، أي تفاصيل إضافية..."
                className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm outline-none transition-all hover:border-gray-300 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/15 focus:bg-white resize-none h-28 placeholder:text-gray-300" />
            </div>
          </div>
        </div>

        {/* Trust badges */}
        <div className="flex items-center justify-center gap-6 py-2">
          <div className="flex items-center gap-1.5 text-gray-400">
            <Shield className="w-4 h-4" />
            <span className="text-[11px] font-medium">دفع آمن</span>
          </div>
          <div className="flex items-center gap-1.5 text-gray-400">
            <Truck className="w-4 h-4" />
            <span className="text-[11px] font-medium">شحن دولي</span>
          </div>
          <div className="flex items-center gap-1.5 text-gray-400">
            <Package className="w-4 h-4" />
            <span className="text-[11px] font-medium">ضمان الجودة</span>
          </div>
        </div>

        {/* Info notice */}
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5">
          <p className="text-sm text-amber-700 leading-relaxed font-medium">
            تكلفة الشحن تُدفع عند الاستلام. سنتواصل معك لتأكيد الطلب قبل الشراء.
          </p>
        </div>
      </form>

      {/* Fixed Submit Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-gray-200 z-30">
        <div className="max-w-2xl mx-auto px-5 py-4">
          <button onClick={handleSubmit} disabled={submitting || !name.trim() || !phone.trim()}
            className={`w-full h-[56px] rounded-2xl font-bold text-[15px] flex items-center justify-center gap-2.5 transition-all ${
              submitting || !name.trim() || !phone.trim()
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-orange-500 hover:bg-orange-600 text-white shadow-xl shadow-orange-300/40 active:scale-[0.98]'
            }`}>
            {submitting ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> جاري الإرسال...</>
            ) : (
              <><ShoppingCart className="w-5 h-5" /> إرسال الطلب — {formatNum(cartTotal)} د.ع</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
