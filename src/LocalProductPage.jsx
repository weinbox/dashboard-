import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import {
  ArrowRight, ShoppingCart, Heart, Star, Minus, Plus,
  Package, Loader2, Share2, Shield, Truck, RefreshCw, ChevronLeft, ChevronRight
} from 'lucide-react'

export default function LocalProductPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeImage, setActiveImage] = useState(0)
  const [qty, setQty] = useState(1)
  const [addedToast, setAddedToast] = useState(false)
  const [cart, setCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem('store_cart') || '[]') } catch { return [] }
  })
  const [favorites, setFavorites] = useState(() => {
    try { return JSON.parse(localStorage.getItem('store_favorites') || '[]') } catch { return [] }
  })
  const [relatedProducts, setRelatedProducts] = useState([])

  useEffect(() => {
    loadProduct()
  }, [id])

  useEffect(() => {
    localStorage.setItem('store_cart', JSON.stringify(cart))
  }, [cart])

  useEffect(() => {
    localStorage.setItem('store_favorites', JSON.stringify(favorites))
  }, [favorites])

  const loadProduct = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single()
    if (data) {
      setProduct(data)
      // Load related products
      const { data: related } = await supabase
        .from('products')
        .select('*')
        .eq('category', data.category)
        .neq('id', id)
        .limit(4)
      if (related) setRelatedProducts(related)
    }
    setLoading(false)
  }

  const formatNum = (n) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')

  const toggleFavorite = () => {
    if (!product) return
    setFavorites(prev => {
      const exists = prev.find(f => f.id === product.id)
      if (exists) return prev.filter(f => f.id !== product.id)
      return [...prev, product]
    })
  }

  const isFavorite = favorites.some(f => f.id === product?.id)

  const addToCart = () => {
    if (!product) return
    setCart(prev => {
      const exists = prev.find(c => c.id === product.id)
      if (exists) return prev.map(c => c.id === product.id ? { ...c, qty: c.qty + qty } : c)
      return [...prev, { ...product, qty }]
    })
    setAddedToast(true)
    setTimeout(() => setAddedToast(false), 2500)
  }

  const cartCount = cart.reduce((sum, c) => sum + c.qty, 0)

  const images = product?.images?.length > 0 ? product.images : (product?.image ? [product.image] : [])

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center" dir="rtl">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4" dir="rtl">
        <Package className="w-16 h-16 text-slate-300" />
        <p className="text-slate-500 font-bold">المنتج غير موجود</p>
        <button onClick={() => navigate('/store')} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold">
          العودة للمتجر
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white pb-28" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-slate-100 transition-all active:scale-95">
            <ArrowRight className="w-5 h-5 text-slate-600" />
          </button>
          <div className="flex items-center gap-2">
            <button onClick={toggleFavorite} className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-slate-100 transition-all active:scale-95">
              <Heart className={`w-5 h-5 ${isFavorite ? 'text-red-500 fill-red-500' : 'text-slate-400'}`} />
            </button>
            <button onClick={() => navigate('/store/cart')} className="relative w-9 h-9 rounded-xl flex items-center justify-center hover:bg-slate-100 transition-all active:scale-95">
              <ShoppingCart className="w-5 h-5 text-slate-600" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-indigo-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">{cartCount}</span>
              )}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto">
        {/* Image Gallery */}
        <div className="relative bg-gradient-to-b from-slate-50 to-white">
          <div className="aspect-square relative overflow-hidden">
            {images.length > 0 ? (
              <img
                src={images[activeImage]}
                alt={product.name}
                className="w-full h-full object-contain p-6 animate-fade-in"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="w-24 h-24 text-slate-200" />
              </div>
            )}
            {/* Discount Badge */}
            {product.discount > 0 && (
              <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-lg">
                خصم {product.discount}%
              </div>
            )}
          </div>
          {/* Image dots */}
          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(i)}
                  className={`w-2 h-2 rounded-full transition-all ${i === activeImage ? 'bg-indigo-600 w-5' : 'bg-slate-300'}`}
                />
              ))}
            </div>
          )}
          {/* Nav arrows */}
          {images.length > 1 && (
            <>
              <button onClick={() => setActiveImage(prev => prev > 0 ? prev - 1 : images.length - 1)}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/80 backdrop-blur rounded-full flex items-center justify-center shadow-md active:scale-90">
                <ChevronLeft className="w-5 h-5 text-slate-600" />
              </button>
              <button onClick={() => setActiveImage(prev => prev < images.length - 1 ? prev + 1 : 0)}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/80 backdrop-blur rounded-full flex items-center justify-center shadow-md active:scale-90">
                <ChevronRight className="w-5 h-5 text-slate-600" />
              </button>
            </>
          )}
        </div>

        {/* Product Info */}
        <div className="px-5 pt-5 animate-slide-up">
          {/* Category & Brand */}
          <div className="flex items-center gap-2 mb-2">
            {product.category && (
              <span className="text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md font-semibold">{product.category}</span>
            )}
            {product.brand && (
              <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md font-semibold">{product.brand}</span>
            )}
          </div>

          {/* Title */}
          <h1 className="text-xl font-black text-slate-900 leading-tight mb-3">{product.name || product.title}</h1>

          {/* Price */}
          <div className="flex items-end gap-3 mb-4">
            <span className="text-2xl font-black text-slate-900">{formatNum(product.price)} <span className="text-sm text-slate-400 font-normal">د.ع</span></span>
            {product.old_price > 0 && product.old_price > product.price && (
              <span className="text-base text-slate-400 line-through font-medium">{formatNum(product.old_price)}</span>
            )}
          </div>

          {/* Rating (placeholder) */}
          <div className="flex items-center gap-2 mb-5">
            <div className="flex">
              {[1, 2, 3, 4, 5].map(s => (
                <Star key={s} className={`w-4 h-4 ${s <= 4 ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />
              ))}
            </div>
            <span className="text-xs text-slate-500">(4.0) • {product.sold || 0} مبيعات</span>
          </div>

          {/* Description */}
          {product.description && (
            <div className="mb-6">
              <h3 className="text-sm font-bold text-slate-800 mb-2">الوصف</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{product.description}</p>
            </div>
          )}

          {/* Features */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-slate-50 rounded-xl p-3 text-center">
              <Truck className="w-5 h-5 text-indigo-500 mx-auto mb-1" />
              <p className="text-[10px] font-bold text-slate-700">شحن سريع</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 text-center">
              <Shield className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
              <p className="text-[10px] font-bold text-slate-700">ضمان الجودة</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 text-center">
              <RefreshCw className="w-5 h-5 text-orange-500 mx-auto mb-1" />
              <p className="text-[10px] font-bold text-slate-700">استرجاع مجاني</p>
            </div>
          </div>

          {/* Stock */}
          {product.stock > 0 && product.stock <= 10 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 mb-5">
              <p className="text-xs text-amber-700 font-bold">⚡ باقي {product.stock} قطع فقط!</p>
            </div>
          )}

          {/* Related Products */}
          {relatedProducts.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-bold text-slate-800 mb-3">منتجات مشابهة</h3>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {relatedProducts.map(rp => (
                  <div
                    key={rp.id}
                    onClick={() => { navigate(`/store/product/${rp.id}`); window.scrollTo(0, 0) }}
                    className="flex-shrink-0 w-32 bg-white rounded-xl border border-slate-100 overflow-hidden cursor-pointer hover:shadow-md transition-all active:scale-95"
                  >
                    <div className="aspect-square bg-slate-50">
                      {rp.image ? (
                        <img src={rp.image} alt={rp.name} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><Package className="w-8 h-8 text-slate-200" /></div>
                      )}
                    </div>
                    <div className="p-2">
                      <p className="text-[10px] text-slate-600 font-medium line-clamp-1">{rp.name || rp.title}</p>
                      <p className="text-[12px] font-black text-slate-900 mt-0.5">{formatNum(rp.price)} <span className="text-[8px] text-slate-400 font-normal">د.ع</span></p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Bar - Add to Cart */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-100 shadow-2xl" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="max-w-3xl mx-auto px-5 py-3 flex items-center gap-4">
          {/* Qty */}
          <div className="flex items-center gap-2 bg-slate-100 rounded-xl px-2 py-1.5">
            <button onClick={() => setQty(q => Math.max(1, q - 1))} className="w-7 h-7 rounded-lg bg-white flex items-center justify-center shadow-sm active:scale-90 transition">
              <Minus className="w-3.5 h-3.5 text-slate-600" />
            </button>
            <span className="text-sm font-bold w-6 text-center text-slate-800">{qty}</span>
            <button onClick={() => setQty(q => q + 1)} className="w-7 h-7 rounded-lg bg-white flex items-center justify-center shadow-sm active:scale-90 transition">
              <Plus className="w-3.5 h-3.5 text-slate-600" />
            </button>
          </div>
          {/* Add to Cart Button */}
          <button
            onClick={addToCart}
            disabled={!product.is_available || product.stock === 0}
            className="flex-1 h-12 bg-gradient-to-l from-indigo-600 to-indigo-700 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.97] shadow-lg shadow-indigo-200/50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ShoppingCart className="w-5 h-5" />
            إضافة للسلة — {formatNum(product.price * qty)} د.ع
          </button>
        </div>
      </div>

      {/* Toast */}
      {addedToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 animate-slide-down">
          <div className="bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2">
            <ShoppingCart className="w-4 h-4" />
            <span className="text-sm font-semibold">تمت الإضافة للسلة</span>
            <button onClick={() => navigate('/store/cart')} className="text-sm font-bold text-emerald-200 hover:text-white mr-2">عرض ←</button>
          </div>
        </div>
      )}
    </div>
  )
}
