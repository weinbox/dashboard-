import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight, Heart, ShoppingCart, Package, Trash2, X
} from 'lucide-react'

export default function StoreWishlist() {
  const navigate = useNavigate()
  const [favorites, setFavorites] = useState(() => {
    try { return JSON.parse(localStorage.getItem('store_favorites') || '[]') } catch { return [] }
  })
  const [cart, setCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem('store_cart') || '[]') } catch { return [] }
  })
  const [addedToast, setAddedToast] = useState(null)

  useEffect(() => {
    localStorage.setItem('store_favorites', JSON.stringify(favorites))
    window.dispatchEvent(new Event('cart-updated'))
  }, [favorites])

  useEffect(() => {
    localStorage.setItem('store_cart', JSON.stringify(cart))
    window.dispatchEvent(new Event('cart-updated'))
  }, [cart])

  const removeFavorite = (id) => {
    setFavorites(prev => prev.filter(f => f.id !== id))
  }

  const addToCart = (product) => {
    setCart(prev => {
      const exists = prev.find(c => c.id === product.id)
      if (exists) return prev.map(c => c.id === product.id ? { ...c, qty: c.qty + 1 } : c)
      return [...prev, { ...product, qty: 1 }]
    })
    setAddedToast(product.name || product.title)
    setTimeout(() => setAddedToast(null), 2500)
  }

  const cartCount = cart.reduce((sum, c) => sum + c.qty, 0)
  const formatNum = (n) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-slate-100 transition-all active:scale-95">
            <ArrowRight className="w-5 h-5 text-slate-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-black text-slate-900">المفضلة</h1>
            <p className="text-[11px] text-slate-400">{favorites.length} منتج</p>
          </div>
          <button onClick={() => navigate('/store/cart')} className="relative w-9 h-9 rounded-xl flex items-center justify-center hover:bg-slate-100 transition-all active:scale-95">
            <ShoppingCart className="w-5 h-5 text-slate-600" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-indigo-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">{cartCount}</span>
            )}
          </button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-5">
        {favorites.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-20 h-20 bg-pink-50 rounded-3xl flex items-center justify-center mx-auto mb-5">
              <Heart className="w-10 h-10 text-pink-300" />
            </div>
            <p className="text-lg font-bold text-slate-600">لا توجد منتجات مفضلة</p>
            <p className="text-sm text-slate-400 mt-2">اضغط على القلب لإضافة منتجات للمفضلة</p>
            <button onClick={() => navigate('/store')} className="mt-6 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold text-sm active:scale-95 transition-all shadow-lg shadow-indigo-200/50">
              تصفح المنتجات
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {favorites.map(product => (
              <div key={product.id} className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-sm flex gap-3 animate-fade-in">
                <div
                  className="w-20 h-20 rounded-xl bg-slate-50 overflow-hidden flex-shrink-0 cursor-pointer"
                  onClick={() => navigate(`/store/product/${product.id}`)}
                >
                  {product.image ? (
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><Package className="w-8 h-8 text-slate-200" /></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-slate-700 line-clamp-2 leading-snug cursor-pointer" onClick={() => navigate(`/store/product/${product.id}`)}>
                    {product.name || product.title}
                  </p>
                  {product.category && (
                    <span className="text-[9px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded font-semibold inline-block mt-1">{product.category}</span>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[14px] font-black text-slate-900">{formatNum(product.price || 0)} <span className="text-[10px] text-slate-400 font-normal">د.ع</span></span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => addToCart(product)}
                        className="h-8 px-3 bg-indigo-600 rounded-lg flex items-center justify-center gap-1.5 hover:bg-indigo-700 transition active:scale-90 shadow-sm"
                      >
                        <ShoppingCart className="w-3.5 h-3.5 text-white" />
                        <span className="text-[10px] font-bold text-white">أضف للسلة</span>
                      </button>
                      <button
                        onClick={() => removeFavorite(product.id)}
                        className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center hover:bg-red-100 transition active:scale-90"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Add all to cart */}
            <button
              onClick={() => { favorites.forEach(p => addToCart(p)); setFavorites([]) }}
              className="w-full h-12 bg-gradient-to-l from-pink-500 to-rose-500 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.97] shadow-lg shadow-pink-200/50 mt-5"
            >
              <ShoppingCart className="w-5 h-5" />
              إضافة الكل للسلة ({favorites.length} منتج)
            </button>
          </div>
        )}
      </div>

      {/* Toast */}
      {addedToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 animate-slide-down">
          <div className="bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2">
            <ShoppingCart className="w-4 h-4" />
            <span className="text-sm font-semibold">تمت الإضافة للسلة</span>
          </div>
        </div>
      )}
    </div>
  )
}
