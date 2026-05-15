import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight, ShoppingCart, Trash2, X, Minus, Plus,
  Package, Shield, Truck
} from 'lucide-react'

export default function StoreCart() {
  const navigate = useNavigate()
  const [cart, setCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem('store_cart') || '[]') } catch { return [] }
  })

  useEffect(() => {
    localStorage.setItem('store_cart', JSON.stringify(cart))
  }, [cart])

  const updateQty = (id, delta) => {
    setCart(prev => prev.map(c => {
      if (c.id !== id) return c
      const newQty = c.qty + delta
      return newQty > 0 ? { ...c, qty: newQty } : c
    }).filter(c => c.qty > 0))
  }

  const removeItem = (id) => setCart(prev => prev.filter(c => c.id !== id))
  const clearCart = () => setCart([])

  const cartTotal = cart.reduce((sum, c) => sum + (c.price || 0) * c.qty, 0)
  const cartCount = cart.reduce((sum, c) => sum + c.qty, 0)
  const formatNum = (n) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-slate-100 transition-all active:scale-95">
            <ArrowRight className="w-5 h-5 text-slate-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-black text-slate-900">سلة التسوق</h1>
            <p className="text-[11px] text-slate-400">{cartCount} منتج</p>
          </div>
          {cart.length > 0 && (
            <button onClick={clearCart} className="text-xs text-red-400 hover:text-red-500 font-bold px-3 py-1.5 rounded-lg hover:bg-red-50 transition">
              تفريغ الكل
            </button>
          )}
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 max-w-3xl mx-auto w-full px-4 py-5">
        {cart.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto mb-5">
              <ShoppingCart className="w-10 h-10 text-slate-300" />
            </div>
            <p className="text-lg font-bold text-slate-600">السلة فارغة</p>
            <p className="text-sm text-slate-400 mt-2">أضف منتجات للبدء بالتسوق</p>
            <button onClick={() => navigate('/store')} className="mt-6 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold text-sm active:scale-95 transition-all shadow-lg shadow-indigo-200/50">
              تصفح المنتجات
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {cart.map(item => (
              <div key={item.id} className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-sm flex gap-3 animate-fade-in">
                {/* Image */}
                <div
                  className="w-20 h-20 rounded-xl bg-slate-50 overflow-hidden flex-shrink-0 cursor-pointer"
                  onClick={() => navigate(`/store/product/${item.id}`)}
                >
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><Package className="w-8 h-8 text-slate-200" /></div>
                  )}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-slate-700 line-clamp-2 leading-snug">{item.name || item.title}</p>
                  {item.category && (
                    <span className="text-[9px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded font-semibold inline-block mt-1">{item.category}</span>
                  )}
                  <div className="flex items-center justify-between mt-2.5">
                    <span className="text-[14px] font-black text-slate-900">{formatNum((item.price || 0) * item.qty)} <span className="text-[10px] text-slate-400 font-normal">د.ع</span></span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateQty(item.id, -1)} className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition active:scale-90">
                        {item.qty === 1 ? <Trash2 className="w-3 h-3 text-red-400" /> : <Minus className="w-3 h-3 text-slate-500" />}
                      </button>
                      <span className="text-[13px] font-bold w-5 text-center text-slate-800">{item.qty}</span>
                      <button onClick={() => updateQty(item.id, 1)} className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center hover:bg-indigo-700 transition active:scale-90 shadow-sm">
                        <Plus className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom - Checkout */}
      {cart.length > 0 && (
        <div className="sticky bottom-0 bg-white border-t border-slate-100 shadow-2xl" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          <div className="max-w-3xl mx-auto px-5 py-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">المنتجات ({cartCount})</span>
              <span className="text-sm font-bold text-slate-700">{formatNum(cartTotal)} د.ع</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">التوصيل</span>
              <span className="text-[11px] text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg font-semibold">يُحدد عند الاستلام</span>
            </div>
            <div className="border-t border-slate-200 pt-3 flex items-center justify-between">
              <span className="text-base font-bold text-slate-800">المجموع</span>
              <span className="text-xl font-black text-slate-900">{formatNum(cartTotal)} <span className="text-[12px] font-bold text-slate-500">د.ع</span></span>
            </div>
            <button
              onClick={() => navigate('/store/checkout')}
              className="w-full h-[52px] bg-gradient-to-l from-indigo-600 to-indigo-700 text-white rounded-2xl font-bold text-[14px] flex items-center justify-center gap-2.5 transition-all active:scale-[0.97] shadow-lg shadow-indigo-200/50"
            >
              <ShoppingCart className="w-5 h-5" />
              إتمام الطلب — {formatNum(cartTotal)} د.ع
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
