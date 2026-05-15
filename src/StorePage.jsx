import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import {
  Search, ShoppingCart, Heart, Star, Filter, ArrowRight,
  Package, Loader2, SlidersHorizontal, Grid3X3, LayoutGrid,
  Tag, Flame, ChevronDown, X
} from 'lucide-react'

export default function StorePage() {
  const navigate = useNavigate()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [sortBy, setSortBy] = useState('newest')
  const [viewMode, setViewMode] = useState('grid') // grid | list
  const [showFilters, setShowFilters] = useState(false)
  const [cart, setCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem('store_cart') || '[]') } catch { return [] }
  })
  const [favorites, setFavorites] = useState(() => {
    try { return JSON.parse(localStorage.getItem('store_favorites') || '[]') } catch { return [] }
  })
  const [addedToast, setAddedToast] = useState(null)

  useEffect(() => {
    loadProducts()
    loadCategories()
  }, [])

  useEffect(() => {
    localStorage.setItem('store_cart', JSON.stringify(cart))
  }, [cart])

  useEffect(() => {
    localStorage.setItem('store_favorites', JSON.stringify(favorites))
  }, [favorites])

  const loadProducts = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setProducts(data)
    setLoading(false)
  }

  const loadCategories = async () => {
    const { data } = await supabase
      .from('products')
      .select('category')
    if (data) {
      const unique = [...new Set(data.map(d => d.category).filter(Boolean))]
      setCategories(unique)
    }
  }

  const toggleFavorite = (product) => {
    setFavorites(prev => {
      const exists = prev.find(f => f.id === product.id)
      if (exists) return prev.filter(f => f.id !== product.id)
      return [...prev, product]
    })
  }

  const isFavorite = (id) => favorites.some(f => f.id === id)

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

  // Filter & Sort
  let filtered = [...products]
  if (searchQuery.trim()) {
    filtered = filtered.filter(p =>
      (p.name || p.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description || '').toLowerCase().includes(searchQuery.toLowerCase())
    )
  }
  if (selectedCategory !== 'all') {
    filtered = filtered.filter(p => p.category === selectedCategory)
  }
  switch (sortBy) {
    case 'price_asc': filtered.sort((a, b) => (a.price || 0) - (b.price || 0)); break
    case 'price_desc': filtered.sort((a, b) => (b.price || 0) - (a.price || 0)); break
    case 'popular': filtered.sort((a, b) => (b.sold || 0) - (a.sold || 0)); break
    case 'newest': default: break
  }

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-slate-100 transition-all active:scale-95">
              <ArrowRight className="w-5 h-5 text-slate-600" />
            </button>
            <div className="flex-1">
              <h1 className="text-lg font-black text-slate-900">المتجر</h1>
            </div>
            <button onClick={() => navigate('/store/wishlist')} className="relative w-9 h-9 rounded-xl flex items-center justify-center hover:bg-slate-100 transition-all active:scale-95">
              <Heart className={`w-5 h-5 ${favorites.length > 0 ? 'text-pink-500 fill-pink-500' : 'text-slate-400'}`} />
              {favorites.length > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-pink-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">{favorites.length}</span>
              )}
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

      <div className="max-w-4xl mx-auto px-4 py-5">
        {/* Featured Banner */}
        <div className="relative mb-5 rounded-2xl overflow-hidden bg-gradient-to-l from-indigo-600 via-purple-600 to-pink-500 p-5 shadow-lg">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-2 right-2 w-32 h-32 bg-white rounded-full blur-2xl"></div>
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-purple-300 rounded-full blur-3xl"></div>
          </div>
          <div className="relative z-10">
            <span className="text-[10px] bg-white/20 text-white px-2.5 py-1 rounded-full font-bold">عروض حصرية</span>
            <h2 className="text-xl font-black text-white mt-2">خصومات تصل لـ 30%</h2>
            <p className="text-white/80 text-xs mt-1">على أفضل المنتجات المختارة لك</p>
            <button
              onClick={() => { setSelectedCategory('all'); setSortBy('popular') }}
              className="mt-3 px-4 py-2 bg-white text-indigo-700 rounded-xl text-xs font-bold hover:bg-white/90 transition active:scale-95"
            >
              تسوق الآن
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-5">
          <Search className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="ابحث عن منتج..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full h-12 pr-11 pl-4 bg-white rounded-2xl text-sm outline-none border border-slate-200 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-slate-400"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute left-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded-full">
              <X className="w-4 h-4 text-slate-400" />
            </button>
          )}
        </div>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-5 scrollbar-hide">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${
              selectedCategory === 'all'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
            }`}
          >
            الكل
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                selectedCategory === cat
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Sort & Filter Bar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-300"
            >
              <option value="newest">الأحدث</option>
              <option value="price_asc">الأرخص</option>
              <option value="price_desc">الأغلى</option>
              <option value="popular">الأكثر مبيعاً</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">{filtered.length} منتج</span>
            <button onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')} className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition">
              {viewMode === 'grid' ? <LayoutGrid className="w-4 h-4 text-slate-500" /> : <Grid3X3 className="w-4 h-4 text-slate-500" />}
            </button>
          </div>
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden border border-slate-100">
                <div className="aspect-square animate-shimmer"></div>
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-slate-100 rounded-full w-3/4 animate-shimmer"></div>
                  <div className="h-4 bg-slate-100 rounded-full w-1/2 animate-shimmer"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-slate-300" />
            </div>
            <p className="text-sm font-bold text-slate-500">لا توجد منتجات</p>
            <p className="text-xs text-slate-400 mt-1">جرب تغيير الفلتر أو البحث</p>
          </div>
        ) : (
          <div className={viewMode === 'grid' ? 'grid grid-cols-2 md:grid-cols-3 gap-3' : 'space-y-3'}>
            {filtered.map(product => (
              <div
                key={product.id}
                className={`product-card bg-white rounded-2xl overflow-hidden border border-slate-100 cursor-pointer ${
                  viewMode === 'list' ? 'flex gap-3 p-3' : ''
                }`}
                onClick={() => navigate(`/store/product/${product.id}`)}
              >
                {/* Image */}
                <div className={`relative bg-gradient-to-b from-slate-50 to-white overflow-hidden ${
                  viewMode === 'list' ? 'w-24 h-24 rounded-xl flex-shrink-0' : 'aspect-square'
                }`}>
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name || product.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-10 h-10 text-slate-200" />
                    </div>
                  )}
                  {viewMode === 'grid' && (
                    <>
                      {product.discount > 0 && (
                        <span className="absolute top-2 right-2 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">
                          -{product.discount}%
                        </span>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleFavorite(product) }}
                        className="absolute top-2 left-2 w-7 h-7 bg-white/80 backdrop-blur rounded-full flex items-center justify-center shadow-sm active:scale-90 transition-all"
                      >
                        <Heart className={`w-3.5 h-3.5 ${isFavorite(product.id) ? 'text-red-500 fill-red-500' : 'text-slate-400'}`} />
                      </button>
                    </>
                  )}
                </div>

                {/* Info */}
                <div className={viewMode === 'list' ? 'flex-1 flex flex-col justify-between' : 'p-3'}>
                  <div>
                    {product.category && (
                      <span className="text-[9px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded font-semibold">
                        {product.category}
                      </span>
                    )}
                    <p className="text-[12px] text-slate-700 font-semibold line-clamp-2 mt-1 leading-snug">
                      {product.name || product.title}
                    </p>
                  </div>
                  <div className="flex items-end justify-between mt-2">
                    <div>
                      <p className="text-[15px] font-black text-slate-900">
                        {formatNum(product.price || 0)}
                        <span className="text-[9px] text-slate-400 font-normal mr-0.5">د.ع</span>
                      </p>
                      {product.old_price > 0 && (
                        <p className="text-[10px] text-slate-400 line-through">{formatNum(product.old_price)}</p>
                      )}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); addToCart(product) }}
                      className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center shadow-sm hover:bg-indigo-700 transition active:scale-90"
                    >
                      <ShoppingCart className="w-4 h-4 text-white" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
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
