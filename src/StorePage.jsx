import { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { CITIES_DATA } from './citiesData'
import {
  Plus, Minus, X, Trash2, Package,
  Phone, User, MapPin, ChevronDown, Search, Loader2, Check,
  ShoppingBag, Truck, Star, CreditCard, Shield, Eye, ArrowLeft, ShoppingCart
} from 'lucide-react'

/* ─── Format number with commas ─── */
const formatNum = (n) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')

/* ─── ImageWithFallback — copied from KachaBazar ─── */
function ImageWithFallback({ src, alt = 'image', className = '', ...props }) {
  const [imgSrc, setImgSrc] = useState(src)
  useEffect(() => { setImgSrc(src) }, [src])
  return (
    <img
      src={imgSrc || ''}
      onError={() => setImgSrc('')}
      alt={alt}
      className={`object-cover transition duration-150 ease-linear transform group-hover:scale-105 ${className}`}
      {...props}
    />
  )
}

/* ─── SearchableDropdown ─── */
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
      <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">{label}</label>
      <button type="button" onClick={() => setIsOpen(!isOpen)}
        className={`w-full h-12 px-4 bg-[var(--background)] border border-[var(--border)] rounded-xl text-sm text-right flex items-center justify-between outline-none transition-all ${selected ? 'text-[var(--foreground)]' : 'text-[var(--muted-foreground)]'} ${isOpen ? 'ring-2 ring-[var(--primary)]/30 border-[var(--primary)]' : 'hover:border-gray-300'}`}>
        <span className="truncate">{selected ? selected.name : placeholder}</span>
        <ChevronDown className={`w-4 h-4 text-[var(--muted-foreground)] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => { setIsOpen(false); setSearch('') }} />
          <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-[var(--background)] border border-[var(--border)] rounded-xl shadow-2xl max-h-72 overflow-hidden">
            <div className="p-2.5 border-b border-[var(--border)]">
              <div className="relative">
                <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
                <input type="text" placeholder={searchPlaceholder} value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-10 pr-10 pl-3 bg-[var(--muted)] border border-[var(--border)] rounded-lg text-sm outline-none focus:border-[var(--primary)] text-[var(--foreground)]" autoFocus />
              </div>
            </div>
            <div className="overflow-y-auto max-h-52">
              {filtered.length === 0 ? (
                <p className="text-center text-sm text-[var(--muted-foreground)] py-6">لا توجد نتائج</p>
              ) : filtered.map(item => (
                <button key={item.id} type="button"
                  onClick={() => { onSelect(item.id, item.name); setIsOpen(false); setSearch('') }}
                  className={`w-full text-right px-4 py-3 text-sm transition-colors ${selectedId === item.id ? 'bg-[var(--primary)] text-white font-medium' : 'text-[var(--foreground)] hover:bg-[var(--muted)]'}`}>
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

export default function StorePage() {
  const { slug } = useParams()
  const [store, setStore] = useState(null)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [cart, setCart] = useState([])
  const [showCart, setShowCart] = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)
  const [orderDone, setOrderDone] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState(null)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [cartAnimating, setCartAnimating] = useState(false)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [cityId, setCityId] = useState('')
  const [cityName, setCityName] = useState('')
  const [regionId, setRegionId] = useState('')
  const [regionName, setRegionName] = useState('')
  const [address, setAddress] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data: storeData } = await supabase
        .from('stores').select('*').eq('slug', slug).eq('is_active', true).single()
      if (storeData) {
        setStore(storeData)
        const { data: prods } = await supabase
          .from('products').select('*').eq('store_id', storeData.id).eq('is_active', true).order('created_at', { ascending: false })
        setProducts(prods || [])
      }
      setLoading(false)
    }
    load()
  }, [slug])

  useEffect(() => {
    if (showCart || showCheckout || selectedProduct) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = 'unset'
    return () => { document.body.style.overflow = 'unset' }
  }, [showCart, showCheckout, selectedProduct])

  const addToCart = useCallback((product) => {
    setCart(prev => {
      const exists = prev.find(i => i.product_id === product.id)
      if (exists) return prev.map(i => i.product_id === product.id ? { ...i, qty: i.qty + 1 } : i)
      return [...prev, { product_id: product.id, name: product.name, price: product.price, image: product.image, qty: 1 }]
    })
    setCartAnimating(true)
    setTimeout(() => setCartAnimating(false), 300)
    showToast('تمت الإضافة للسلة')
  }, [])

  const updateQty = useCallback((id, delta) => {
    setCart(prev => prev.map(i => i.product_id === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i))
  }, [])

  const removeFromCart = useCallback((id) => {
    setCart(prev => prev.filter(i => i.product_id !== id))
  }, [])

  const cartCount = useMemo(() => cart.reduce((s, i) => s + i.qty, 0), [cart])
  const cartTotal = useMemo(() => cart.reduce((s, i) => s + i.price * i.qty, 0), [cart])

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 2500)
  }

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products
    return products.filter(p => p.name.includes(searchQuery.trim()) || (p.description && p.description.includes(searchQuery.trim())))
  }, [products, searchQuery])

  const handleSubmitOrder = async () => {
    if (!name.trim()) return showToast('أدخل اسمك', 'error')
    if (!phone.trim()) return showToast('أدخل رقم الهاتف', 'error')
    if (!cityId) return showToast('اختر المحافظة', 'error')
    if (cart.length === 0) return showToast('السلة فارغة', 'error')
    setSubmitting(true)
    const { error } = await supabase.from('orders').insert({
      store_id: store.id,
      customer_name: name.trim(),
      customer_phone: phone.trim(),
      city: cityName,
      region: regionName,
      address: address.trim(),
      items: cart,
      total: cartTotal,
      delivery_price: store.delivery_price || 0,
      status: 'pending'
    })
    if (error) { showToast('حدث خطأ، حاول مرة أخرى', 'error'); setSubmitting(false); return }
    setCart([])
    setShowCheckout(false)
    setOrderDone(true)
    setSubmitting(false)
  }

  const cartItemForProduct = (pId) => cart.find(i => i.product_id === pId)

  /* ═══════════════════════════════════════════════
     LOADING STATE
  ═══════════════════════════════════════════════ */
  if (loading) {
    return (
      <div className="kb-store min-h-screen bg-[var(--background)]" dir="rtl">
        {/* Skeleton header */}
        <div className="border-b border-[var(--border)] px-4 py-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-[var(--muted)] animate-pulse" />
            <div className="flex-1"><div className="w-32 h-4 bg-[var(--muted)] rounded animate-pulse mb-2" /><div className="w-48 h-3 bg-[var(--muted)] rounded animate-pulse" /></div>
          </div>
          <div className="w-full h-11 bg-[var(--muted)] rounded-xl animate-pulse" />
        </div>
        <div className="max-w-6xl mx-auto px-4 pt-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="rounded-xl border border-[var(--border)] overflow-hidden">
                <div className="aspect-square bg-[var(--muted)] animate-pulse" />
                <div className="p-4 space-y-2">
                  <div className="w-3/4 h-4 bg-[var(--muted)] rounded animate-pulse" />
                  <div className="w-1/2 h-4 bg-[var(--muted)] rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  /* ═══════════════════════════════════════════════
     STORE NOT FOUND
  ═══════════════════════════════════════════════ */
  if (!store) {
    return (
      <div className="kb-store min-h-screen bg-[var(--background)] flex items-center justify-center" dir="rtl">
        <div className="text-center px-6">
          <div className="w-24 h-24 bg-[var(--muted)] rounded-full flex items-center justify-center mx-auto mb-6">
            <ShoppingBag className="w-10 h-10 text-[var(--muted-foreground)]" />
          </div>
          <h2 className="text-xl font-bold text-[var(--foreground)] mb-2">المتجر غير موجود</h2>
          <p className="text-sm text-[var(--muted-foreground)]">تأكد من الرابط وحاول مرة أخرى</p>
        </div>
      </div>
    )
  }

  /* ═══════════════════════════════════════════════
     ORDER SUCCESS
  ═══════════════════════════════════════════════ */
  if (orderDone) {
    return (
      <div className="kb-store min-h-screen bg-gradient-to-b from-[var(--background)] to-[var(--muted)] flex items-center justify-center" dir="rtl">
        <div className="text-center px-6 max-w-sm animate-fade-in">
          <div className="relative mx-auto mb-8 w-20 h-20">
            <div className="absolute inset-0 rounded-full bg-[var(--primary)] animate-ping opacity-20" />
            <div className="relative w-20 h-20 rounded-full bg-[var(--primary)] flex items-center justify-center shadow-lg">
              <Check className="w-9 h-9 text-white" strokeWidth={3} />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-[var(--foreground)] mb-3">تم استلام طلبك!</h2>
          <p className="text-sm text-[var(--muted-foreground)] mb-2 leading-relaxed">شكراً لك! سنتواصل معك قريباً لتأكيد التوصيل.</p>
          <div className="inline-flex items-center gap-2 text-xs px-4 py-2 rounded-full bg-[var(--muted)] text-[var(--muted-foreground)] mb-8">
            <Shield className="w-3.5 h-3.5" /> الدفع عند الاستلام
          </div>
          <br/>
          <button onClick={() => { setOrderDone(false); setName(''); setPhone(''); setCityId(''); setCityName(''); setRegionId(''); setRegionName(''); setAddress('') }}
            className="inline-flex items-center gap-2 h-12 px-8 rounded-full font-semibold text-sm bg-[var(--primary)] text-white transition-all hover:opacity-90 active:scale-[0.97] shadow-lg">
            <ArrowLeft className="w-4 h-4" /> العودة للمتجر
          </button>
        </div>
      </div>
    )
  }

  /* ═══════════════════════════════════════════════
     MAIN STORE PAGE — KachaBazar Design (exact copy)
  ═══════════════════════════════════════════════ */
  return (
    <div className="kb-store min-h-screen bg-[var(--background)]" dir="rtl" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* ═══════ HEADER — from KachaBazar Navbar ═══════ */}
      <header className="sticky top-0 z-30 bg-[var(--background)] border-b border-[var(--border)] shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo + Store Name */}
            <div className="flex items-center gap-3">
              {store.logo ? (
                <img src={store.logo} alt={store.name} className="w-10 h-10 rounded-xl object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-[var(--primary)] flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5 text-white" />
                </div>
              )}
              <div>
                <h1 className="text-base font-semibold text-[var(--foreground)] leading-tight">{store.name}</h1>
                <div className="flex items-center gap-2 text-[11px] text-[var(--muted-foreground)]">
                  <span className="flex items-center gap-1"><Truck className="w-3 h-3" /> توصيل {formatNum(store.delivery_price || 0)} د.ع</span>
                  <span className="opacity-40">•</span>
                  <span>الدفع عند الاستلام</span>
                </div>
              </div>
            </div>

            {/* Cart Button — from KachaBazar StickyCart */}
            <button onClick={() => cartCount > 0 && setShowCart(true)}
              className={`relative flex items-center justify-center w-11 h-11 rounded-full bg-[var(--primary)] text-white transition-all duration-200 cursor-pointer border-2 border-[var(--primary)] hover:bg-[var(--primary)]/90 ${cartAnimating ? 'scale-110' : ''}`}>
              <ShoppingBag className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -left-1.5 min-w-[22px] h-[22px] bg-orange-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 ring-2 ring-white">
                  {cartCount}
                </span>
              )}
            </button>
          </div>

          {/* Search Bar */}
          <div className="pb-3">
            <div className="relative">
              <Search className="w-[18px] h-[18px] absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
              <input type="text" placeholder="ابحث في المنتجات..."
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="w-full h-11 pr-11 pl-4 bg-[var(--muted)] border border-[var(--border)] rounded-xl text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] outline-none transition-all focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/20" />
            </div>
          </div>
        </div>
      </header>

      {/* ═══════ STORE INFO + BADGES ═══════ */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-4">
        {store.description && (
          <p className="text-sm text-[var(--muted-foreground)] leading-relaxed mb-4">{store.description}</p>
        )}
        <div className="grid grid-cols-3 gap-2.5 mb-4">
          {[
            { icon: Truck, title: 'توصيل سريع', sub: `${formatNum(store.delivery_price || 0)} د.ع`, color: '#10b981', bgc: '#ecfdf5' },
            { icon: CreditCard, title: 'الدفع عند الاستلام', sub: 'كاش', color: '#f59e0b', bgc: '#fffbeb' },
            { icon: Shield, title: 'ضمان الجودة', sub: 'منتجات أصلية', color: '#8b5cf6', bgc: '#f5f3ff' },
          ].map((b, i) => (
            <div key={i} className="bg-[var(--card)] rounded-xl p-3 flex items-center gap-2.5 border border-[var(--border)] hover:shadow-md transition-shadow duration-200">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: b.bgc }}>
                <b.icon className="w-4 h-4" style={{ color: b.color }} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-[var(--foreground)] truncate">{b.title}</p>
                <p className="text-[10px] text-[var(--muted-foreground)] truncate">{b.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══════ PRODUCTS — KachaBazar ProductCard (exact structure) ═══════ */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pb-32">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium text-[var(--muted-foreground)]">{filteredProducts.length} منتج</p>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-28">
            <div className="relative h-40 w-40 mb-6 flex items-center justify-center">
              <div className="w-20 h-20 bg-[var(--muted)] rounded-full flex items-center justify-center">
                <Search className="w-8 h-8 text-[var(--muted-foreground)]" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-[var(--muted-foreground)]">{searchQuery ? 'لا توجد نتائج' : 'لا توجد منتجات بعد'}</h3>
            <p className="mt-2 text-center text-sm text-[var(--muted-foreground)]">جرّب البحث بكلمات مختلفة</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredProducts.map(p => {
              const inCart = cartItemForProduct(p.id)
              const outOfStock = p.stock === 0 && p.stock !== null
              const lowStock = p.stock > 0 && p.stock <= 5

              return (
                /* ── KachaBazar ProductCard: group relative flex flex-col overflow-hidden rounded-xl border bg-card transition-all hover:shadow-lg hover:-translate-y-1 hover:border-primary/50 ── */
                <div key={p.id}
                  className="group relative flex flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] transition-all duration-200 ease-in-out hover:shadow-lg hover:-translate-y-1 hover:border-[var(--primary)]/50 cursor-pointer"
                  onClick={() => setSelectedProduct(p)}>

                  {/* Discount / Low stock badge — from KachaBazar Discount component */}
                  <div className="w-full flex justify-between">
                    {lowStock && (
                      <span className="absolute z-10 right-3 top-3 inline-flex items-center rounded-full bg-red-50 px-2 py-1 text-xs font-medium text-red-600 ring-1 ring-red-600/10 ring-inset">
                        متبقي {p.stock}
                      </span>
                    )}
                    {outOfStock && (
                      <span className="absolute z-10 right-3 top-3 inline-flex items-center rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-gray-600/10 ring-inset">
                        نفذت الكمية
                      </span>
                    )}
                  </div>

                  {/* Product Image — from KachaBazar: relative w-full min-h-48 lg:h-48 xl:h-52 */}
                  <div className="relative w-full h-48 lg:h-48 xl:h-52">
                    <div className="relative block w-full h-full overflow-hidden bg-[var(--muted)]">
                      {p.image ? (
                        <ImageWithFallback src={p.image} alt={p.name}
                          className={`w-full h-full object-cover ${outOfStock ? 'opacity-40' : ''}`} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-12 h-12 text-[var(--muted-foreground)]/30" />
                        </div>
                      )}
                    </div>

                    {/* Quick View button — from KachaBazar: absolute bottom-0 group-hover:bottom-4 */}
                    {!outOfStock && (
                      <div className="absolute lg:bottom-0 bottom-4 lg:group-hover:bottom-4 inset-x-1 opacity-100 flex justify-center lg:opacity-0 lg:invisible group-hover:opacity-100 group-hover:visible transition-all">
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedProduct(p) }}
                          className="relative h-auto inline-flex items-center cursor-pointer justify-center rounded-full transition-colors text-xs py-2 px-4 bg-[var(--background)] text-[var(--muted-foreground)] hover:text-[var(--primary)] hover:bg-[var(--muted)] shadow-lg">
                          <Eye className="w-3.5 h-3.5" />
                          <span className="ms-1 hidden xl:block lg:block">عرض سريع</span>
                        </button>
                      </div>
                    )}

                    {/* Add to cart circular button — from KachaBazar: absolute bottom-3 right-3 */}
                    {!outOfStock && (
                      <div className="absolute bottom-3 left-3 z-[5] flex items-center justify-center rounded-full bg-[var(--background)] text-[var(--muted-foreground)] shadow-lg transition-all duration-300 ease-in-out hover:bg-[var(--muted)] hover:text-[var(--primary)]">
                        {inCart ? (
                          <div className="flex flex-col w-11 h-22 items-center p-1 justify-between bg-[var(--primary)] text-white ring-2 ring-white rounded-full">
                            <button onClick={(e) => { e.stopPropagation(); inCart.qty === 1 ? removeFromCart(p.id) : updateQty(p.id, -1) }}>
                              <span className="text-xl cursor-pointer"><Minus className="w-4 h-4" /></span>
                            </button>
                            <p className="text-sm px-1 font-medium">{inCart.qty}</p>
                            <button onClick={(e) => { e.stopPropagation(); addToCart(p) }}>
                              <span className="text-lg cursor-pointer"><Plus className="w-4 h-4" /></span>
                            </button>
                          </div>
                        ) : (
                          <button onClick={(e) => { e.stopPropagation(); addToCart(p) }}
                            className="w-11 h-11 flex items-center justify-center rounded-full cursor-pointer border-2 bg-[var(--primary)] text-white border-[var(--primary)] font-medium transition-colors duration-300 hover:bg-[var(--primary)]/90">
                            <ShoppingBag className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Product info — from KachaBazar: flex flex-1 flex-col space-y-2 px-4 pt-2 pb-4 */}
                  <div className="flex flex-1 flex-col space-y-2 px-4 pt-2 pb-4">
                    <div className="relative mb-1">
                      <span className="text-sm font-medium text-[var(--foreground)] line-clamp-1 hover:text-[var(--primary)]">
                        {p.name}
                      </span>
                    </div>

                    {/* Price — from KachaBazar Price component */}
                    <div className="product-price font-bold">
                      <span className="inline-block text-base text-[var(--foreground)]">
                        {formatNum(p.price)} <span className="text-xs font-normal text-[var(--muted-foreground)]">د.ع</span>
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* ═══════ FLOATING CART — from KachaBazar StickyCart ═══════ */}
      {cartCount > 0 && !showCart && !showCheckout && !selectedProduct && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-md px-4 animate-slide-up">
          <button onClick={() => setShowCart(true)}
            className="w-full h-14 bg-gradient-to-r from-emerald-600 to-[var(--primary)] text-white rounded-2xl font-medium text-sm flex items-center justify-between px-5 shadow-2xl transition-all active:scale-[0.98] hover:shadow-xl">
            <div className="flex items-center gap-3">
              <span className="min-w-[24px] h-6 bg-white/20 rounded-md flex items-center justify-center text-xs font-bold">{cartCount}</span>
              <span>عرض السلة</span>
            </div>
            <span className="font-bold">{formatNum(cartTotal + (store.delivery_price || 0))} د.ع</span>
          </button>
        </div>
      )}

      {/* ═══════ CART DRAWER — from KachaBazar CartDrawer.jsx (exact structure) ═══════ */}
      {showCart && (
        <>
          {/* Backdrop */}
          <div onClick={() => setShowCart(false)}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity duration-300 opacity-100" />

          {/* Drawer */}
          <div className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-[var(--background)] shadow-2xl transition-transform duration-300 ease-out translate-x-0">
            {/* Header — from KachaBazar */}
            <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-[var(--foreground)]">سلة التسوق</h2>
                <p className="text-sm text-[var(--muted-foreground)]">{cartCount} منتج</p>
              </div>
              <button onClick={() => setShowCart(false)}
                className="rounded-full p-2 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)]">
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Cart Items — from KachaBazar CartDrawer items */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                {cart.map(item => (
                  <div key={item.product_id}
                    className="group/item flex gap-4 rounded-xl border border-[var(--border)] bg-[var(--muted)] p-4 transition-all hover:border-[var(--border)] hover:shadow-sm">
                    {/* Product Image */}
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-[var(--background)]">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-6 h-6 text-[var(--muted-foreground)]" />
                        </div>
                      )}
                    </div>

                    {/* Product Info — from KachaBazar */}
                    <div className="flex flex-1 flex-col">
                      <div className="flex items-start justify-between">
                        <span className="line-clamp-2 text-sm font-medium text-[var(--foreground)]">{item.name}</span>
                        <button onClick={() => removeFromCart(item.product_id)}
                          className="shrink-0 rounded-full p-1.5 text-[var(--muted-foreground)] opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover/item:opacity-100">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="mt-auto flex items-center justify-between pt-2">
                        {/* Quantity Controls — from KachaBazar: flex items-center rounded-full border */}
                        <div className="flex items-center rounded-full border border-[var(--border)]">
                          <button onClick={() => item.qty === 1 ? removeFromCart(item.product_id) : updateQty(item.product_id, -1)}
                            className="flex h-8 w-8 items-center justify-center rounded-r-full text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)]">
                            {item.qty === 1 ? <Trash2 className="h-4 w-4 text-red-400" /> : <Minus className="h-4 w-4" />}
                          </button>
                          <span className="min-w-[2rem] text-center text-sm font-medium text-[var(--foreground)]">{item.qty}</span>
                          <button onClick={() => updateQty(item.product_id, 1)}
                            className="flex h-8 w-8 items-center justify-center rounded-l-full text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)]">
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>

                        {/* Price */}
                        <p className="text-sm font-semibold text-[var(--foreground)]">
                          {formatNum(item.price * item.qty)} <span className="text-xs font-normal text-[var(--muted-foreground)]">د.ع</span>
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer — from KachaBazar CartDrawer footer */}
            <div className="border-t border-[var(--border)] bg-[var(--muted)] p-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--muted-foreground)]">المنتجات</span>
                  <span className="font-medium text-[var(--foreground)]">{formatNum(cartTotal)} د.ع</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--muted-foreground)]">التوصيل</span>
                  <span className="font-medium text-[var(--foreground)]">{formatNum(store.delivery_price || 0)} د.ع</span>
                </div>
                <div className="border-t border-[var(--border)] pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-base font-semibold text-[var(--foreground)]">المجموع</span>
                    <span className="text-lg font-bold text-[var(--foreground)]">{formatNum(cartTotal + (store.delivery_price || 0))} د.ع</span>
                  </div>
                </div>
              </div>

              {/* Action Button — from KachaBazar */}
              <div className="mt-6">
                <button onClick={() => { setShowCart(false); setShowCheckout(true) }}
                  className="flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-emerald-600 to-[var(--primary)] px-4 py-3 text-sm font-medium text-white transition-all hover:shadow-lg">
                  إتمام الطلب
                </button>
              </div>

              {/* Trust Badges — from KachaBazar */}
              <div className="mt-4 flex items-center justify-center gap-4 text-xs text-[var(--muted-foreground)]">
                <span className="flex items-center gap-1">
                  <Shield className="h-4 w-4 text-[var(--primary)]" /> دفع آمن
                </span>
                <span className="flex items-center gap-1">
                  <Truck className="h-4 w-4 text-[var(--primary)]" /> توصيل موثوق
                </span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ═══════ CHECKOUT — from KachaBazar CheckoutForm ═══════ */}
      {showCheckout && (
        <>
          <div onClick={() => setShowCheckout(false)}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
          <div className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-[var(--background)] shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-[var(--foreground)]">إتمام الطلب</h2>
                <p className="text-sm text-[var(--muted-foreground)]">أكمل بياناتك لتأكيد الطلب</p>
              </div>
              <button onClick={() => setShowCheckout(false)}
                className="rounded-full p-2 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)]">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Personal Info */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-[var(--foreground)] flex items-center gap-2">
                  <User className="w-4 h-4 text-[var(--primary)]" /> المعلومات الشخصية
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">الاسم الكامل</label>
                    <input type="text" placeholder="أدخل اسمك الكامل" value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full h-12 px-4 bg-[var(--background)] border border-[var(--border)] rounded-xl text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] outline-none transition-all focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/20" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">رقم الهاتف</label>
                    <input type="tel" dir="ltr" placeholder="07XX XXX XXXX" value={phone}
                      onChange={e => setPhone(e.target.value)}
                      className="w-full h-12 px-4 bg-[var(--background)] border border-[var(--border)] rounded-xl text-sm text-[var(--foreground)] text-left placeholder:text-[var(--muted-foreground)] outline-none transition-all focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/20" />
                  </div>
                </div>
              </div>

              {/* Shipping Address */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-[var(--foreground)] flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[var(--primary)]" /> عنوان التوصيل
                </h3>
                <SearchableDropdown
                  label="المحافظة"
                  items={CITIES_DATA.map(c => ({ id: c.id, name: c.name }))}
                  selectedId={cityId}
                  placeholder="اختر المحافظة..."
                  searchPlaceholder="ابحث..."
                  onSelect={(id, n) => { setCityId(id); setCityName(n); setRegionId(''); setRegionName('') }}
                />
                {cityId && (
                  <SearchableDropdown
                    label="المنطقة"
                    items={(CITIES_DATA.find(c => c.id === cityId)?.regions || [])}
                    selectedId={regionId}
                    placeholder="اختر المنطقة..."
                    searchPlaceholder="ابحث..."
                    onSelect={(id, n) => { setRegionId(id); setRegionName(n) }}
                  />
                )}
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">العنوان التفصيلي</label>
                  <textarea placeholder="أقرب نقطة دالّة..." value={address}
                    onChange={e => setAddress(e.target.value)} rows={2}
                    className="w-full px-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-xl text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] outline-none transition-all focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/20 resize-none" />
                </div>
              </div>

              {/* Order Summary — from KachaBazar CheckoutForm right sidebar */}
              <div className="rounded-xl border border-[var(--border)] bg-[var(--muted)] p-4 space-y-3">
                <h3 className="text-sm font-semibold text-[var(--foreground)] flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-[var(--primary)]" /> ملخص الطلب
                </h3>
                <div className="space-y-2">
                  {cart.map(i => (
                    <div key={i.product_id} className="flex justify-between text-sm">
                      <span className="text-[var(--muted-foreground)]">{i.name} <span className="opacity-60">× {i.qty}</span></span>
                      <span className="font-medium text-[var(--foreground)]">{formatNum(i.price * i.qty)}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-[var(--border)] pt-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--muted-foreground)]">التوصيل</span>
                    <span className="font-medium text-[var(--foreground)]">{formatNum(store.delivery_price || 0)} د.ع</span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-[var(--foreground)]">
                    <span>الإجمالي</span>
                    <span>{formatNum(cartTotal + (store.delivery_price || 0))} <span className="text-xs font-normal text-[var(--muted-foreground)]">د.ع</span></span>
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="border-t border-[var(--border)] p-6">
              <button onClick={handleSubmitOrder} disabled={submitting}
                className={`flex w-full items-center justify-center rounded-xl px-4 py-3.5 text-sm font-medium transition-all ${submitting ? 'bg-gray-300 text-gray-500' : 'bg-gradient-to-r from-emerald-600 to-[var(--primary)] text-white hover:shadow-lg'}`}>
                {submitting ? <><Loader2 className="w-5 h-5 animate-spin mr-2" /> جاري الإرسال...</> : 'تأكيد الطلب — الدفع عند الاستلام'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ═══════ PRODUCT DETAIL MODAL — from KachaBazar ProductModal ═══════ */}
      {selectedProduct && (
        <>
          <div onClick={() => setSelectedProduct(null)}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={() => setSelectedProduct(null)}>
            <div className="bg-[var(--background)] rounded-t-3xl sm:rounded-2xl w-full sm:max-w-lg max-h-[92vh] overflow-y-auto relative shadow-2xl animate-slide-up"
              onClick={e => e.stopPropagation()}>
              <button onClick={() => setSelectedProduct(null)}
                className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-[var(--background)]/80 backdrop-blur flex items-center justify-center text-[var(--muted-foreground)] hover:bg-[var(--muted)] shadow-lg transition-colors">
                <X className="w-5 h-5" />
              </button>

              {/* Image */}
              <div className="relative aspect-square bg-[var(--muted)] overflow-hidden sm:rounded-t-2xl">
                {selectedProduct.image ? (
                  <img src={selectedProduct.image} alt={selectedProduct.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-16 h-16 text-[var(--muted-foreground)]/30" />
                  </div>
                )}
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-[var(--foreground)] leading-snug">{selectedProduct.name}</h2>
                  <div className="product-price font-bold mt-2">
                    <span className="inline-block text-xl text-[var(--primary)]">
                      {formatNum(selectedProduct.price)} <span className="text-sm font-normal text-[var(--muted-foreground)]">د.ع</span>
                    </span>
                  </div>
                </div>

                {selectedProduct.description && (
                  <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">{selectedProduct.description}</p>
                )}

                {selectedProduct.stock > 0 && selectedProduct.stock <= 10 && (
                  <div className="inline-flex items-center gap-2 text-xs text-green-600 font-normal">
                    <span>المخزون:</span>
                    <span className="text-green-600 font-medium">{selectedProduct.stock}</span>
                  </div>
                )}

                {selectedProduct.stock === 0 && selectedProduct.stock !== null && (
                  <span className="text-red-700 inline-flex items-center justify-center text-xs">
                    نفذت الكمية
                  </span>
                )}

                {!(selectedProduct.stock === 0 && selectedProduct.stock !== null) && (
                  <button
                    onClick={() => { addToCart(selectedProduct); setSelectedProduct(null) }}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-3.5 text-sm font-medium text-white transition-all hover:bg-[var(--primary)]/90 hover:shadow-lg">
                    <ShoppingBag className="w-4 h-4" /> أضف للسلة
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ═══════ TOAST ═══════ */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[70] animate-slide-up">
          <div className={`flex items-center gap-2.5 px-5 py-3.5 rounded-2xl shadow-2xl text-sm font-medium text-white backdrop-blur-xl ${toast.type === 'error' ? 'bg-red-600/95' : 'bg-[var(--primary)]/95'}`}>
            {toast.type === 'error' ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
            {toast.msg}
          </div>
        </div>
      )}
    </div>
  )
}
