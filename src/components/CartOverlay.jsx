import { ShoppingCart, X, Plus, Minus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function CartOverlay({ cart, cartCount, cartTotal, formatNum, updateQty, setCart, setShowCart }) {
  const navigate = useNavigate()

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-50" dir="rtl">
      <div className="bg-white/95 backdrop-blur-md flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-100 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
            <ShoppingCart className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">سلة التسوق</h3>
            <p className="text-[12px] text-slate-400">{cartCount} منتج</p>
          </div>
        </div>
        <button onClick={() => setShowCart(false)} className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center hover:bg-slate-200 transition-all active:scale-95">
          <X className="w-4 h-4 text-slate-500" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {cart.length === 0 ? (
          <div className="text-center py-32 px-6">
            <div className="w-24 h-24 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto mb-5">
              <ShoppingCart className="w-12 h-12 text-slate-300" />
            </div>
            <p className="text-lg font-bold text-slate-600">السلة فارغة</p>
            <p className="text-sm text-slate-400 mt-2">ابدأ بإضافة منتجات للسلة</p>
            <button onClick={() => setShowCart(false)} className="mt-6 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold text-sm active:scale-95 transition-all shadow-lg shadow-indigo-200/50">
              تصفح المنتجات
            </button>
          </div>
        ) : (
          <div className="p-4 space-y-3 pb-6">
            {cart.map(c => (
              <div key={c.uniqueId || c.id} className="flex gap-3 bg-white rounded-2xl p-3.5 border border-slate-100 shadow-sm">
                <img src={c.image} alt="" className="w-20 h-20 rounded-xl object-cover flex-shrink-0 bg-slate-50" />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-slate-700 line-clamp-2 leading-snug">{c.title}</p>
                  <span className="text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md font-semibold inline-block mt-1">{c.providerLabel}</span>
                  
                  {c.optionsDisplay && c.optionsDisplay.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {c.optionsDisplay.map((opt, oi) => (
                        <span key={oi} className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md">
                          {opt.label}: {opt.value}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[14px] font-black text-slate-900">{formatNum(c.priceIqd * c.qty)} <span className="text-[10px] text-slate-400 font-normal">د.ع</span></span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateQty(c.uniqueId || c.id, -1)} className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition active:scale-90">
                        {c.qty === 1 ? <X className="w-3 h-3 text-red-400" /> : <Minus className="w-3 h-3 text-slate-500" />}
                      </button>
                      <span className="text-[13px] font-bold w-5 text-center text-slate-800">{c.qty}</span>
                      <button onClick={() => updateQty(c.uniqueId || c.id, 1)} className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center hover:bg-indigo-700 transition active:scale-90 shadow-sm">
                        <Plus className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <button onClick={() => { setCart([]); setShowCart(false) }}
              className="w-full mt-3 py-3.5 bg-red-50 border-2 border-red-200 text-red-500 rounded-2xl font-bold text-[14px] flex items-center justify-center gap-2 transition-all active:scale-[0.97] hover:bg-red-100">
              <X className="w-4 h-4" />
              تفريغ السلة
            </button>
          </div>
        )}
      </div>

      {/* Cart Footer */}
      {cart.length > 0 && (
        <div className="bg-white border-t border-slate-100 px-5 py-4 flex-shrink-0 space-y-3 shadow-2xl">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">المنتجات ({cartCount})</span>
            <span className="text-sm font-bold text-slate-700">{formatNum(cartTotal)} د.ع</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">الشحن</span>
            <span className="text-[11px] text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg font-semibold">مجاني للعراق</span>
          </div>
          <div className="border-t border-slate-200 pt-3 flex items-center justify-between">
            <span className="text-base font-bold text-slate-800">المجموع</span>
            <span className="text-xl font-black text-slate-900">{formatNum(cartTotal)} <span className="text-[12px] font-bold text-slate-500">د.ع</span></span>
          </div>
          <button onClick={() => { setShowCart(false); navigate('/china-checkout') }}
            className="w-full h-[52px] bg-gradient-to-l from-indigo-600 to-indigo-700 text-white rounded-2xl font-bold text-[14px] flex items-center justify-center gap-2.5 transition-all active:scale-[0.97] shadow-lg shadow-indigo-200/50">
            <ShoppingCart className="w-5 h-5" />
            إتمام الطلب — {formatNum(cartTotal)} د.ع
          </button>
        </div>
      )}
    </div>
  )
}
