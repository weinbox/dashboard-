import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import {
  ArrowRight, ShoppingCart, Loader2, CheckCircle, Package,
  User, Phone, MapPin, FileText, Shield, Truck, CreditCard
} from 'lucide-react'

const formatNum = (n) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')

export default function StoreCheckout() {
  const navigate = useNavigate()
  const [cart, setCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem('store_cart') || '[]') } catch { return [] }
  })
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const cartTotal = cart.reduce((sum, c) => sum + (c.price || 0) * c.qty, 0)
  const cartCount = cart.reduce((sum, c) => sum + c.qty, 0)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim() || !phone.trim()) return
    if (cart.length === 0) return

    setSubmitting(true)
    try {
      const { data: order, error: orderErr } = await supabase.from('store_orders').insert({
        customer_name: name.trim(),
        customer_phone: phone.trim(),
        customer_city: city.trim(),
        customer_address: address.trim(),
        notes: notes.trim(),
        total_iqd: cartTotal,
        items_count: cartCount,
        status: 'pending',
      }).select().single()

      if (orderErr) throw orderErr

      // Save order items
      const items = cart.map(c => ({
        order_id: order.id,
        product_id: c.id,
        title: c.name || c.title,
        image: c.image,
        price: c.price || 0,
        qty: c.qty,
        category: c.category,
      }))

      await supabase.from('store_order_items').insert(items)

      // Clear cart
      localStorage.removeItem('store_cart')
      setCart([])
      setDone(true)
    } catch (err) {
      console.error('Order error:', err)
      alert('حدث خطأ أثناء إرسال الطلب. حاول مرة أخرى.')
    }
    setSubmitting(false)
  }

  if (done) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6" dir="rtl">
        <div className="animate-scale-in text-center max-w-sm">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-10 h-10 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2">تم إرسال طلبك!</h2>
          <p className="text-sm text-slate-500 mb-6 leading-relaxed">
            شكراً لك! سنتواصل معك قريباً لتأكيد الطلب والتوصيل.
          </p>
          <div className="bg-slate-50 rounded-2xl p-4 mb-6 border border-slate-100">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">المجموع</span>
              <span className="font-black text-slate-900">{formatNum(cartTotal)} د.ع</span>
            </div>
          </div>
          <div className="space-y-3">
            <button onClick={() => navigate('/store')} className="w-full h-12 bg-indigo-600 text-white rounded-2xl font-bold text-sm active:scale-[0.97] transition-all shadow-lg shadow-indigo-200/50">
              تصفح المزيد من المنتجات
            </button>
            <button onClick={() => navigate('/')} className="w-full h-12 bg-slate-100 text-slate-700 rounded-2xl font-bold text-sm active:scale-[0.97] transition-all">
              العودة للرئيسية
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6" dir="rtl">
        <Package className="w-16 h-16 text-slate-300 mb-4" />
        <p className="text-lg font-bold text-slate-600">السلة فارغة</p>
        <button onClick={() => navigate('/store')} className="mt-4 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold text-sm">
          تصفح المنتجات
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-slate-100 transition-all active:scale-95">
            <ArrowRight className="w-5 h-5 text-slate-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-black text-slate-900">إتمام الطلب</h1>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-5">
        {/* Order Summary */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4 mb-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-indigo-500" />
            ملخص الطلب
          </h3>
          <div className="space-y-2.5">
            {cart.map(item => (
              <div key={item.id} className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-slate-50 overflow-hidden flex-shrink-0">
                  {item.image ? (
                    <img src={item.image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><Package className="w-5 h-5 text-slate-200" /></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] text-slate-600 font-medium line-clamp-1">{item.name || item.title}</p>
                  <p className="text-[10px] text-slate-400">x{item.qty}</p>
                </div>
                <span className="text-[13px] font-bold text-slate-800">{formatNum((item.price || 0) * item.qty)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-slate-100 mt-3 pt-3 flex items-center justify-between">
            <span className="text-sm font-bold text-slate-700">المجموع</span>
            <span className="text-lg font-black text-slate-900">{formatNum(cartTotal)} <span className="text-xs text-slate-400">د.ع</span></span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-500" />
              معلومات التوصيل
            </h3>

            <div>
              <label className="text-xs font-bold text-slate-600 mb-1.5 block">الاسم الكامل *</label>
              <div className="relative">
                <User className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  placeholder="أدخل اسمك الكامل"
                  className="w-full h-11 pr-10 pl-4 bg-slate-50 rounded-xl text-sm outline-none border border-slate-200 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 mb-1.5 block">رقم الهاتف *</label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  required
                  placeholder="07XX XXX XXXX"
                  className="w-full h-11 pr-10 pl-4 bg-slate-50 rounded-xl text-sm outline-none border border-slate-200 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-slate-400"
                  dir="ltr"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 mb-1.5 block">المدينة</label>
              <div className="relative">
                <MapPin className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  placeholder="مثال: بغداد"
                  className="w-full h-11 pr-10 pl-4 bg-slate-50 rounded-xl text-sm outline-none border border-slate-200 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 mb-1.5 block">العنوان التفصيلي</label>
              <div className="relative">
                <MapPin className="w-4 h-4 absolute right-3.5 top-3.5 text-slate-400" />
                <textarea
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="المنطقة، الشارع، أقرب نقطة دالة..."
                  rows={2}
                  className="w-full pr-10 pl-4 py-3 bg-slate-50 rounded-xl text-sm outline-none border border-slate-200 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-slate-400 resize-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 mb-1.5 block">ملاحظات</label>
              <div className="relative">
                <FileText className="w-4 h-4 absolute right-3.5 top-3.5 text-slate-400" />
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="أي ملاحظات إضافية..."
                  rows={2}
                  className="w-full pr-10 pl-4 py-3 bg-slate-50 rounded-xl text-sm outline-none border border-slate-200 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-slate-400 resize-none"
                />
              </div>
            </div>
          </div>

          {/* Trust badges */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white rounded-xl p-3 border border-slate-100 text-center">
              <Shield className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
              <p className="text-[9px] font-bold text-slate-600">دفع آمن</p>
            </div>
            <div className="bg-white rounded-xl p-3 border border-slate-100 text-center">
              <Truck className="w-4 h-4 text-indigo-500 mx-auto mb-1" />
              <p className="text-[9px] font-bold text-slate-600">توصيل سريع</p>
            </div>
            <div className="bg-white rounded-xl p-3 border border-slate-100 text-center">
              <CreditCard className="w-4 h-4 text-orange-500 mx-auto mb-1" />
              <p className="text-[9px] font-bold text-slate-600">دفع عند الاستلام</p>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting || !name.trim() || !phone.trim()}
            className="w-full h-[52px] bg-gradient-to-l from-indigo-600 to-indigo-700 text-white rounded-2xl font-bold text-[14px] flex items-center justify-center gap-2.5 transition-all active:scale-[0.97] shadow-lg shadow-indigo-200/50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                تأكيد الطلب — {formatNum(cartTotal)} د.ع
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
