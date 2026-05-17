import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Search, Loader2, X, ArrowRight, ShoppingCart, Plus, Minus,
  ChevronLeft, ChevronRight, Star, Package, Filter, Heart,
  Link as LinkIcon, CheckCircle2, ExternalLink, ArrowUpDown, Camera, Image as ImageIcon,
  Flame, Lightbulb, Home, Headphones, Footprints, Briefcase, Sparkles, Smartphone,
  Watch, Shirt, ToyBrick, ShoppingBag, Truck, Pill, MessageCircle, Send, Bot
} from 'lucide-react'
import { supabase } from './lib/supabase'
import ExplainSheet from './ExplainSheet'
import { ProductSkeleton, SearchSkeleton } from './Skeletons'
import ProductView from './ProductView'
import { useStaggerIn, useZoomIn, useSlideUp, useCountUp, useAddToCartAnim, useScrollReveal, usePageTransition, heartPulse, toastAnim, swipeDelete, rippleEffect } from './useAnimations'

const API_KEY = 'ccaff9b1-804a-4041-8118-70ce26977867'
const PROXY_BASE = '/api/otapi-proxy'
const REST_BASE = 'https://rest.otapi.net/v1'

const PROVIDERS = {
  taobao: { key: 'Taobao', restKey: 'taobao', label: 'تاوباو', color: 'bg-orange-500', emoji: '淘宝', currency: 'CNY' },
  '1688': { key: 'Taobao', restKey: 'alibaba1688', label: '1688', color: 'bg-orange-600', emoji: '1688', currency: 'CNY' },
  amazon: { key: 'Amazon', restKey: 'amazon', label: 'أمازون', color: 'bg-gray-900', emoji: 'AZ', currency: 'USD', useSerpApi: true },
  shein: { key: 'Shein', restKey: 'shein', label: 'شين', color: 'bg-pink-500', emoji: 'SH', currency: 'USD' },
  iherb: { key: 'iHerb', restKey: 'iherb', label: 'آي هيرب', color: 'bg-green-600', emoji: 'iH', currency: 'USD', useApify: true },
  bestbuy: { key: 'BestBuy', restKey: 'bestbuy', label: 'بست باي', color: 'bg-blue-700', emoji: 'BB', currency: 'USD', useSearchApi: true },
}

const CNY_TO_USD = 6.5
const USD_TO_IQD = 1400
const COMMISSION = 0.20
const MIN_COMMISSION_IQD = 2000

const applyCommission = (iqd) => {
  const comm = Math.max(Math.round(iqd * COMMISSION), MIN_COMMISSION_IQD)
  return iqd + comm
}

const formatPrice = (priceObj, currency) => {
  if (!priceObj) return { cny: 0, usd: 0, iqd: 0 }
  const origPrice = priceObj.OriginalPrice || 0
  let cny, usd
  if (currency === 'USD') {
    usd = origPrice
    cny = origPrice * CNY_TO_USD
  } else {
    cny = origPrice
    usd = cny / CNY_TO_USD
  }
  const iqdBase = Math.round(usd * USD_TO_IQD)
  const iqd = applyCommission(iqdBase)
  return { cny, usd, iqd }
}

// ─── Cache helpers ───
const CACHE_HOURS = 24

// تنظيف تلقائي - حذف كل ما يتجاوز 24 ساعة
const cleanupOldData = async () => {
  try {
    const cutoff = new Date(Date.now() - CACHE_HOURS * 3600000).toISOString()
    await supabase.from('search_cache').delete().lt('created_at', cutoff)
    await supabase.from('popular_products').delete().lt('last_searched_at', cutoff)
  } catch (e) { console.error('Cleanup error:', e) }
}

const getCache = async (providerKey, q, sort, pg) => {
  try {
    const { data } = await supabase
      .from('search_cache')
      .select('results, total_count, created_at')
      .eq('provider', providerKey)
      .eq('query', q.toLowerCase().trim())
      .eq('sort', sort)
      .eq('page', pg)
      .single()
    if (!data) return null
    const age = (Date.now() - new Date(data.created_at).getTime()) / 3600000
    if (age > CACHE_HOURS) return null
    return { results: data.results, totalCount: data.total_count }
  } catch { return null }
}

const setCache = async (providerKey, q, sort, pg, results, totalCount) => {
  try {
    await supabase.from('search_cache').upsert({
      provider: providerKey,
      query: q.toLowerCase().trim(),
      sort,
      page: pg,
      results,
      total_count: totalCount,
      created_at: new Date().toISOString(),
    }, { onConflict: 'provider,query,sort,page' })
  } catch (e) { console.error('Cache save error:', e) }
}

const savePopularProduct = async (item, providerKey, priceIqd) => {
  try {
    const { data: existing } = await supabase
      .from('popular_products')
      .select('id, search_count')
      .eq('product_id', String(item.Id))
      .eq('provider', providerKey)
      .single()
    if (existing) {
      await supabase.from('popular_products')
        .update({
          search_count: existing.search_count + 1,
          last_searched_at: new Date().toISOString(),
          price_iqd: priceIqd,
          title: item.Title,
          image: item.MainPictureUrl,
        })
        .eq('id', existing.id)
    } else {
      await supabase.from('popular_products').insert({
        product_id: String(item.Id),
        provider: providerKey,
        title: item.Title,
        image: item.MainPictureUrl,
        price_iqd: priceIqd,
      })
    }
  } catch (e) { console.error('Popular save error:', e) }
}

// استخراج product ID من رابط Taobao/1688
const extractProductId = (url) => {
  try {
    // taobao: https://item.taobao.com/item.htm?id=123456
    const taobaoMatch = url.match(/taobao\.com.*[?&]id=(\d+)/)
    if (taobaoMatch) return { id: taobaoMatch[1], detectedProvider: 'taobao' }
    // mobile taobao: https://a.m.taobao.com/i123456.htm
    const mTaobaoMatch = url.match(/taobao\.com\/i(\d+)/)
    if (mTaobaoMatch) return { id: mTaobaoMatch[1], detectedProvider: 'taobao' }
    // world taobao: https://world.taobao.com/item/123456.htm
    const worldMatch = url.match(/taobao\.com\/item\/(\d+)/)
    if (worldMatch) return { id: worldMatch[1], detectedProvider: 'taobao' }
    // 1688: https://detail.1688.com/offer/123456.html
    const match1688 = url.match(/1688\.com\/offer\/(\d+)/)
    if (match1688) return { id: match1688[1], detectedProvider: '1688' }
    // 1688 mobile
    const m1688Match = url.match(/m\.1688\.com\/offer\/(\d+)/)
    if (m1688Match) return { id: m1688Match[1], detectedProvider: '1688' }
    // tmall: https://detail.tmall.com/item.htm?id=123456
    const tmallMatch = url.match(/tmall\.com.*[?&]id=(\d+)/)
    if (tmallMatch) return { id: tmallMatch[1], detectedProvider: 'taobao' }
    // shein: https://us.shein.com/p-12345678.html or ar.shein.com/p-12345678.html
    const sheinMatch = url.match(/shein\.com.*\/p-(\d+)/i)
    if (sheinMatch) return { id: sheinMatch[1], detectedProvider: 'shein' }
    // shein alternative: https://us.shein.com/product/12345678.html
    const sheinProductMatch = url.match(/shein\.com.*\/product\/(\d+)/i)
    if (sheinProductMatch) return { id: sheinProductMatch[1], detectedProvider: 'shein' }
    // amazon: https://www.amazon.com/dp/B0XXXXXX or /product/B0XXXXXX
    const azDpMatch = url.match(/amazon\.com.*\/(?:dp|product)\/([A-Z0-9]{10})/i)
    if (azDpMatch) return { id: azDpMatch[1], detectedProvider: 'amazon' }
    // amazon: /gp/product/B0XXXXXX
    const azGpMatch = url.match(/amazon\.com.*\/gp\/product\/([A-Z0-9]{10})/i)
    if (azGpMatch) return { id: azGpMatch[1], detectedProvider: 'amazon' }
    // amazon short: https://a.co/d/XXXXX or amzn.to/XXXXX
    const azShortMatch = url.match(/(?:a\.co\/d\/|amzn\.to\/)([A-Za-z0-9]+)/i)
    if (azShortMatch) return { id: azShortMatch[1], detectedProvider: 'amazon' }
    // bestbuy: https://www.bestbuy.com/site/product/1234567 or /site/.../1234567.p
    const bbMatch = url.match(/bestbuy\.com.*\/(\d{7,})/)
    if (bbMatch) return { id: bbMatch[1], detectedProvider: 'bestbuy' }
    // fallback: أي رقم طويل في الرابط
    const numMatch = url.match(/(\d{10,})/)
    if (numMatch) {
      const prov = url.includes('1688') ? '1688' : 'taobao'
      return { id: numMatch[1], detectedProvider: prov }
    }
    return null
  } catch { return null }
}

export default function ChinaShop() {
  const { provider } = useParams()
  const navigate = useNavigate()
  const prov = PROVIDERS[provider]

  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(0)
  const [searched, setSearched] = useState(false)
  const [searchMode, setSearchMode] = useState('text') // 'text' | 'url' | 'image'
  const [urlInput, setUrlInput] = useState('')
  const [urlLoading, setUrlLoading] = useState(false)
  const [urlError, setUrlError] = useState('')
  const [imageUrlInput, setImageUrlInput] = useState('')
  const [imageResults, setImageResults] = useState([])
  const fileInputRef = useRef(null)
  const [sortBy, setSortBy] = useState('default') // default | price | -price | volume

  // Product detail
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [productDetail, setProductDetail] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [activeImage, setActiveImage] = useState(0)
  const [selectedConfigs, setSelectedConfigs] = useState({}) // { pid: vid }

  // Cart
  const [cart, setCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem('china_cart') || '[]') } catch { return [] }
  })
  const [showCart, setShowCart] = useState(false)
  const [addedToast, setAddedToast] = useState(false)
  const [favorites, setFavorites] = useState(() => {
    try { return JSON.parse(localStorage.getItem('china_favorites') || '[]') } catch { return [] }
  })
  const [showFavorites, setShowFavorites] = useState(false)
  const [openAiChat, setOpenAiChat] = useState(false)
  const [aiInitialMessage, setAiInitialMessage] = useState(null)
  const [showExplainSheet, setShowExplainSheet] = useState(false)
  const [explainMessages, setExplainMessages] = useState([])
  const [explainLoading, setExplainLoading] = useState(false)
  const [extractedProducts, setExtractedProducts] = useState([])
  const [popularProducts, setPopularProducts] = useState([])
  const [sheinUrl, setSheinUrl] = useState('/.netlify/functions/shein-proxy-page?url=' + encodeURIComponent('https://ar.shein.com'))
  const [activeSuggestion, setActiveSuggestion] = useState(0)
  const [activeBanner, setActiveBanner] = useState(0)

  const searchRef = useRef(null)
  const debounceRef = useRef(null)
  const PAGE_SIZE = 20

  // GSAP Animations
  const resultsGridRef = useStaggerIn(results)
  const productImageRef = useZoomIn(selectedProduct?.Id)
  const productInfoRef = useSlideUp(selectedProduct?.Id)
  const priceCountRef = useCountUp(selectedProduct ? formatPrice(selectedProduct.Price, PROVIDERS[provider]?.currency || 'CNY').iqd : 0, selectedProduct?.Id)
  const flyToCart = useAddToCartAnim()
  const popularRef = useScrollReveal()
  const categoriesRef = useScrollReveal()
  const pageRef = usePageTransition(selectedProduct ? 'product' : 'search')
  const toastRef = useRef(null)

  useEffect(() => {
    localStorage.setItem('china_cart', JSON.stringify(cart))
  }, [cart])

  useEffect(() => {
    localStorage.setItem('china_favorites', JSON.stringify(favorites))
  }, [favorites])

  const toggleFavorite = (product) => {
    setFavorites(prev => {
      const exists = prev.find(f => f.Id === product.Id)
      if (exists) return prev.filter(f => f.Id !== product.Id)
      return [...prev, product]
    })
  }

  const isFavorite = (productId) => favorites.some(f => f.Id === productId)

  const askExplain = async (question, productContext) => {
    setExplainLoading(true)
    const userMsg = { role: 'user', content: question }
    const newMsgs = [...explainMessages, userMsg]
    setExplainMessages(newMsgs)

    const apiMessages = newMsgs.filter(m => m.role !== 'system')
    if (productContext) {
      apiMessages.push({ role: 'user', content: `[سياق المنتج - لا تعرضه للمستخدم، استخدمه فقط للإجابة]:\n${productContext}` })
    }

    try {
      const res = await fetch('/.netlify/functions/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages })
      })
      const data = await res.json()
      const reply = data.reply || 'عذراً، حاول مرة ثانية'
      setExplainMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch {
      setExplainMessages(prev => [...prev, { role: 'assistant', content: 'عذراً، حدث خطأ. حاول مرة ثانية 🙏' }])
    }
    setExplainLoading(false)
  }

  // Animated search suggestions rotation
  const searchSuggestions = provider === 'amazon'
    ? ['سماعات بلوتوث', 'iPhone case', 'كريم واقي شمس', 'ساعة ذكية', 'عطر رجالي', 'لابتوب قيمنق', 'مكمل بروتين', 'كاميرا GoPro']
    : ['فستان سهرة', 'حذاء رياضي', 'حقيبة يد', 'سماعات', 'ساعة', 'عطر', 'مكياج', 'العاب اطفال']
  useEffect(() => {
    if (searched || loading || query) return
    const timer = setInterval(() => setActiveSuggestion(prev => (prev + 1) % searchSuggestions.length), 2500)
    return () => clearInterval(timer)
  }, [searched, loading, query])

  // Banner carousel - dynamic from popular products + static promos
  const banners = useMemo(() => {
    const statics = provider === 'amazon' ? [
      { gradient: 'from-[#232F3E] to-[#131921]', title: 'عروض أمازون الحصرية', subtitle: 'خصومات تصل إلى 70% على الإلكترونيات', badge: 'عرض محدود', badgeColor: 'bg-amber-500' },
      { gradient: 'from-emerald-600 to-teal-700', title: 'شحن مجاني للعراق', subtitle: 'على جميع الطلبات بدون حد أدنى', badge: 'توصيل سريع', badgeColor: 'bg-emerald-400' },
    ] : [
      { gradient: 'from-indigo-600 to-blue-700', title: 'أسواق الصين العالمية', subtitle: 'منتجات بالجملة بأسعار المصنع', badge: 'أسعار الجملة', badgeColor: 'bg-indigo-400' },
      { gradient: 'from-emerald-600 to-teal-700', title: 'شحن مجاني للعراق', subtitle: 'على جميع الطلبات بدون حد أدنى', badge: 'توصيل سريع', badgeColor: 'bg-emerald-400' },
    ]
    const grads = ['from-slate-700 to-slate-900', 'from-indigo-700 to-blue-900', 'from-rose-600 to-pink-800']
    const products = popularProducts.slice(0, 3).map((pp, i) => ({
      type: 'product', gradient: grads[i % grads.length],
      title: pp.title?.slice(0, 40) + (pp.title?.length > 40 ? '...' : ''),
      priceRaw: pp.price_iqd, image: pp.image,
      badge: i === 0 ? 'الأكثر رواجاً' : i === 1 ? 'مميز' : 'شائع',
      badgeColor: i === 0 ? 'bg-orange-500' : i === 1 ? 'bg-indigo-500' : 'bg-pink-500',
      productId: pp.product_id, productProvider: pp.provider,
    }))
    return [...statics, ...products]
  }, [provider, popularProducts])
  const bannersCount = banners.length
  useEffect(() => {
    if (searched || loading || bannersCount < 2) return
    const timer = setInterval(() => setActiveBanner(prev => (prev + 1) % bannersCount), 4500)
    return () => clearInterval(timer)
  }, [searched, loading, bannersCount])

  // تنظيف البيانات القديمة + تحميل المنتجات الرائجة (أقل من 24 ساعة فقط)
  useEffect(() => {
    if (!prov) return
    cleanupOldData().then(() => {
      supabase
        .from('popular_products')
        .select('*')
        .eq('provider', provider)
        .order('search_count', { ascending: false })
        .limit(10)
        .then(({ data }) => { if (data?.length) setPopularProducts(data) })
    })
  }, [provider])

  const extractSheinProducts = () => {
    // عرض رسالة للمستخدم بكيفية استخراج المنتجات
    const toast = document.createElement('div')
    toast.className = 'fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-pink-500 text-white px-6 py-4 rounded-2xl shadow-2xl max-w-md animate-in slide-in-from-top'
    toast.innerHTML = `
      <div class="flex flex-col gap-3">
        <div class="flex items-center gap-3">
          <svg class="w-6 h-6 text-white flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span class="text-base font-bold">كيفية إضافة المنتجات للسلة:</span>
        </div>
        <div class="space-y-2 text-sm">
          <div class="flex items-start gap-2">
            <span class="text-pink-200 mt-1">1.</span>
            <span>ابحث عن المنتج في الموقع أعلاه</span>
          </div>
          <div class="flex items-start gap-2">
            <span class="text-pink-200 mt-1">2.</span>
            <span>انقر على المنتج لفتح صفحته</span>
          </div>
          <div class="flex items-start gap-2">
            <span class="text-pink-200 mt-1">3.</span>
            <span>انسخ الرابط من شريط العنوان (مثل: ar.shein.com/p-12345678)</span>
          </div>
          <div class="flex items-start gap-2">
            <span class="text-pink-200 mt-1">4.</span>
            <span>ألصق الرابط في حقل البحث بالأعلى</span>
          </div>
          <div class="flex items-start gap-2">
            <span class="text-pink-200 mt-1">5.</span>
            <span>اضغط "إضافة للسلة" بعد ظهور المنتج</span>
          </div>
        </div>
        <div class="bg-pink-600 rounded-lg p-2 text-xs text-center">
          يمكنك نسخ عدة روابط وإضافتها للسلة
        </div>
      </div>
    `
    document.body.appendChild(toast)
    setTimeout(() => {
      toast.style.opacity = '0'
      setTimeout(() => document.body.removeChild(toast), 300)
    }, 8000)
  }

  if (!prov) {
    navigate('/submit', { replace: true })
    return null
  }

  // ترجمة النص العربي للإنكليزي تلقائياً
  const translateToEn = async (text) => {
    if (!/[\u0600-\u06FF]/.test(text)) return text
    try {
      const res = await fetch(`/.netlify/functions/translate?text=${encodeURIComponent(text)}&from=ar&to=en`)
      const data = await res.json()
      return data.success ? data.translated : text
    } catch { return text }
  }

  const doSearch = async (pageNum = 0, sortOverride) => {
    if (!query.trim()) return
    setImageResults([])
    
    // Best Buy: البحث عبر SearchAPI.io
    if (prov.useSearchApi) {
      setSearched(true)
      setPage(pageNum)
      setSelectedProduct(null)
      setProductDetail(null)
      setLoading(true)
      try {
        const searchQuery = await translateToEn(query.trim())
        const res = await fetch(`/.netlify/functions/bestbuy-search?keyword=${encodeURIComponent(searchQuery)}&page=${pageNum + 1}`)
        const data = await res.json()
        if (data.success && data.products) {
          const formatted = data.products.map(item => ({
            Id: `bb-${item.id}`,
            Title: item.title,
            MainPictureUrl: item.thumbnail,
            Price: { OriginalPrice: item.price || 0, OriginalCurrencyCode: 'USD' },
            OldPrice: item.originalPrice > item.price ? item.originalPrice : null,
            Rating: item.rating || 0,
            Reviews: item.reviews || 0,
            Url: item.link,
            Badge: item.discountPercentage ? `-${item.discountPercentage}%` : null,
            Brand: item.brand,
            Images: item.images || [],
            isBestBuy: true,
          }))
          setResults(formatted)
          setTotalCount(data.total || formatted.length)
        } else {
          setResults([])
          setTotalCount(0)
        }
      } catch (err) {
        console.error('BestBuy search error:', err)
        setResults([])
        setTotalCount(0)
      }
      setLoading(false)
      return
    }

    // Shein: البحث عبر Apify API
    if (provider === 'shein') {
      setSearched(true)
      setPage(pageNum)
      setSelectedProduct(null)
      setProductDetail(null)
      setLoading(true)
      try {
        const res = await fetch(`/.netlify/functions/shein-search?keyword=${encodeURIComponent(query.trim())}&page=${pageNum + 1}`)
        const data = await res.json()
        if (data.success && data.products) {
          const formatted = data.products.map(item => ({
            Id: `sh-${item.id}`,
            Title: item.title,
            MainPictureUrl: item.image,
            Price: { OriginalPrice: parseFloat(item.usdPrice) || parseFloat(item.price) || 0, OriginalCurrencyCode: 'USD' },
            OldPrice: parseFloat(item.originalPrice) > parseFloat(item.price) ? parseFloat(item.originalPrice) : null,
            Rating: 0,
            Reviews: 0,
            Url: item.url,
            Badge: item.discount || null,
            Pictures: item.images || [],
            isSheinApi: true,
          }))
          setResults(formatted)
          setTotalCount(data.total || formatted.length)
        } else {
          setResults([])
          setTotalCount(0)
        }
      } catch (err) {
        console.error('Shein search error:', err)
        setResults([])
        setTotalCount(0)
      }
      setLoading(false)
      return
    }

    // iHerb: البحث عبر Apify API
    if (prov.useApify) {
      setSearched(true)
      setPage(pageNum)
      setSelectedProduct(null)
      setProductDetail(null)
      setLoading(true)
      try {
        const searchQuery = await translateToEn(query.trim())
        const res = await fetch(`/.netlify/functions/iherb-search?keyword=${encodeURIComponent(searchQuery)}&page=${pageNum + 1}`)
        const data = await res.json()
        if (data.success && data.products) {
          const formatted = data.products.map(item => ({
            Id: `ih-${item.id}`,
            Title: item.title,
            MainPictureUrl: item.image,
            Price: { OriginalPrice: parseFloat(item.price) || 0, OriginalCurrencyCode: 'USD' },
            Rating: parseFloat(item.rating) || 0,
            Reviews: item.reviews || 0,
            Url: item.url,
            Badge: item.stock === 'in_stock' ? null : 'نفذ',
            Brand: item.brand,
            isIHerb: true,
          }))
          setResults(formatted)
          setTotalCount(data.total || formatted.length)
        } else {
          setResults([])
          setTotalCount(0)
        }
      } catch (err) {
        console.error('iHerb search error:', err)
        setResults([])
        setTotalCount(0)
      }
      setLoading(false)
      return
    }

    // Amazon: استخدام SerpApi مع Cache - ترجمة عربي→إنكليزي
    if (prov.useSerpApi) {
      setSearched(true)
      setPage(pageNum)
      setSelectedProduct(null)
      setProductDetail(null)
      setLoading(true)
      const sort = sortOverride ?? sortBy
      const searchQuery = await translateToEn(query.trim())
      // التحقق من Cache أولاً
      const cached = await getCache(provider, searchQuery, sort, pageNum)
      if (cached) {
        setResults(cached.results)
        setTotalCount(cached.totalCount)
        setLoading(false)
        return
      }
      try {
        const res = await fetch(`/.netlify/functions/amazon-serpapi?action=search&query=${encodeURIComponent(searchQuery)}&page=${pageNum + 1}`)
        const data = await res.json()
        if (data.success && data.results) {
          const formatted = data.results.map(item => ({
            Id: item.asin,
            Title: item.title,
            MainPictureUrl: item.image,
            Price: { OriginalPrice: item.price, OriginalCurrencyCode: 'USD' },
            OldPrice: item.oldPrice,
            Rating: item.rating,
            Reviews: item.reviews,
            Url: item.link,
            Badge: item.badge,
            BoughtLastMonth: item.boughtLastMonth,
            isSerpApi: true,
          }))
          setResults(formatted)
          setTotalCount(data.totalResults || formatted.length)
          // حفظ في Cache
          setCache(provider, searchQuery, sort, pageNum, formatted, data.totalResults || formatted.length)
        } else {
          setResults([])
          setTotalCount(0)
        }
      } catch (err) {
        console.error('SerpApi search error:', err)
        setResults([])
        setTotalCount(0)
      }
      setLoading(false)
      return
    }
    
    // تقصير النص الطويل جداً لأول 100 حرف
    let trimmedQuery = query.trim()
    if (trimmedQuery.length > 100) {
      // حفظ النص الأصلي للعرض
      const originalQuery = trimmedQuery
      trimmedQuery = trimmedQuery.substring(0, 100) + '...'
      
      // عرض رسالة للمستخدم
      setTimeout(() => {
        const toast = document.createElement('div')
        toast.className = 'fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-blue-500 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 min-w-[350px] animate-in slide-in-from-top'
        toast.innerHTML = `
          <svg class="w-5 h-5 text-white flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span class="text-sm font-medium flex-1">تم تقصير النص الطويل لأول 100 حرف للبحث الفعال</span>
        `
        document.body.appendChild(toast)
        setTimeout(() => {
          toast.style.opacity = '0'
          setTimeout(() => document.body.removeChild(toast), 300)
        }, 4000)
      }, 100)
    }
    
    setSearched(true)
    setPage(pageNum)
    setSelectedProduct(null)
    setProductDetail(null)
    setUrlError('')
    const sort = sortOverride ?? sortBy
    // التحقق من Cache أولاً
    const cached = await getCache(provider, trimmedQuery, sort, pageNum)
    if (cached) {
      setResults(cached.results)
      setTotalCount(cached.totalCount)
      return
    }
    setLoading(true)
    try {
      const orderTag = sort !== 'default' ? `<OrderBy>${sort === 'price' ? 'Price' : sort === '-price' ? 'Price:Desc' : 'Volume:Desc'}</OrderBy>` : ''
      const params = new URLSearchParams({
        _method: 'SearchItemsFrame',
        instanceKey: API_KEY,
        language: 'ar',
        signature: '',
        timestamp: '',
        sessionId: '',
        xmlParameters: `<SearchItemsParameters><Provider>${prov.key}</Provider><ItemTitle>${trimmedQuery}</ItemTitle>${orderTag}</SearchItemsParameters>`,
        framePosition: pageNum * PAGE_SIZE,
        frameSize: PAGE_SIZE,
      })
      const res = await fetch(`${PROXY_BASE}?${params}`)
      const data = await res.json()
      if (data.ErrorCode === 'Ok' && data.Result?.Items?.Content) {
        setResults(data.Result.Items.Content)
        setTotalCount(data.Result.Items.TotalCount || 0)
        // حفظ في Cache
        setCache(provider, trimmedQuery, sort, pageNum, data.Result.Items.Content, data.Result.Items.TotalCount || 0)
      } else {
        setResults([])
        setTotalCount(0)
      }
    } catch (err) {
      console.error('Search error:', err)
      setResults([])
    }
    setLoading(false)
  }

  const loadProductById = async (productId, providerKey) => {
    setUrlLoading(true)
    setUrlError('')
    setSelectedProduct(null)
    setProductDetail(null)
    setResults([])
    setSearched(false)
    try {
      // Amazon: استخدام SerpApi
      if (providerKey === 'amazon') {
        try {
          const res = await fetch(`/.netlify/functions/amazon-serpapi?action=product&asin=${encodeURIComponent(productId)}`)
          const data = await res.json()
          if (data.success && data.product) {
            const p = data.product
            const amazonItem = {
              Id: p.asin,
              Title: p.title,
              MainPictureUrl: p.mainImage || p.images?.[0] || '',
              Price: { OriginalPrice: p.price, OriginalCurrencyCode: 'USD' },
              OldPrice: p.oldPrice,
              Rating: p.rating,
              Reviews: p.reviews,
              Url: p.link,
              Badge: p.badge,
              isSerpApi: true,
            }
            const amazonDetail = {
              ...p,
              Pictures: (p.images || []).map(img => ({ Url: img })),
              Description: p.description,
              FeatureBullets: p.features,
              relatedProducts: data.relatedProducts || [],
            }
            amazonItem.BoughtLastMonth = p.boughtLastMonth || ''
            setSelectedProduct(amazonItem)
            setProductDetail(amazonDetail)
          } else {
            setUrlError('لم يتم العثور على المنتج')
          }
        } catch (err) {
          console.error('SerpApi product error:', err)
          setUrlError('حدث خطأ في جلب المنتج')
        }
        setUrlLoading(false)
        return
      }

      // Shein يستخدم scraping، 1688 يحتاج بادئة abb-
      if (providerKey === 'shein') {
        try {
          const sheinUrl = `https://ar.shein.com/p-${productId.replace('sh-', '')}.html`
          const res = await fetch(`/.netlify/functions/shein-product?url=${encodeURIComponent(sheinUrl)}`)
          const data = await res.json()
          
          if (data.success && data.product) {
            const p = data.product
            const sheinItem = {
              Id: `sh-${p.id}`,
              Title: p.title,
              MainPictureUrl: p.mainImage,
              Price: {
                OriginalPrice: p.salePrice || 0,
                OriginalCurrencyCode: p.currency || 'USD'
              },
              OldPrice: p.retailPrice || 0,
              Url: p.url || sheinUrl,
              isShein: true,
            }
            const detailPics = (p.images || []).map(img => ({ Url: img }))
            setSelectedProduct(sheinItem)
            setProductDetail({
              Pictures: detailPics.length > 0 ? detailPics : [{ Url: p.mainImage }],
              discountPercentage: p.discountPercentage,
            })
          } else {
            setUrlError('لم يتم العثور على المنتج')
          }
        } catch (err) {
          console.error('Shein product error:', err)
          setUrlError('حدث خطأ في جلب المنتج')
        }
        setUrlLoading(false)
        return
      }
      
      const itemId = providerKey === '1688' ? `abb-${productId}` : productId
      const params = new URLSearchParams({
        _method: 'GetItemFullInfo',
        instanceKey: API_KEY,
        language: 'ar',
        signature: '',
        timestamp: '',
        sessionId: '',
        itemId: itemId,
        blockList: '',
      })
      const res = await fetch(`${PROXY_BASE}?${params}`)
      const data = await res.json()
      if (data.ErrorCode === 'Ok' && data.OtapiItemFullInfo) {
        const item = data.OtapiItemFullInfo
        setSelectedProduct(item)
        setProductDetail(item)
        setActiveImage(0)
      } else {
        setUrlError('لم يتم العثور على المنتج. تأكد من الرابط.')
      }
    } catch (err) {
      console.error('URL product error:', err)
      setUrlError('حدث خطأ أثناء جلب المنتج')
    }
    setUrlLoading(false)
  }

  const handleUrlSearch = async () => {
    if (!urlInput.trim()) return
    setUrlError('')
    setSelectedProduct(null)
    setProductDetail(null)
    setResults([])
    setSearched(false)
    // استخراج أي رابط من النص الملصق (قد يحتوي على نص صيني ومعلومات إضافية)
    const input = urlInput.trim()
    const urlMatch = input.match(/https?:\/\/[^\s\u0600-\u06FF\u4e00-\u9fff」」]+/i)
    const cleanUrl = urlMatch ? urlMatch[0].replace(/[,，。、\s]+$/, '') : input

    // التحقق من رابط مختصر (e.tb.cn, m.tb.cn, a.co)
    if (/https?:\/\/(e|m)\.tb\.cn\//i.test(cleanUrl) || /https?:\/\/a\.co\//i.test(cleanUrl)) {
      setUrlLoading(true)
      setUrlError('')
      try {
        const res = await fetch(`/api/resolve-url?url=${encodeURIComponent(cleanUrl)}`)
        const data = await res.json()
        if (data.productId && data.provider) {
          loadProductById(data.productId, data.provider)
          return
        } else if (data.resolvedUrl) {
          const extracted = extractProductId(data.resolvedUrl)
          if (extracted) {
            loadProductById(extracted.id, extracted.detectedProvider)
            return
          }
        }
        setUrlError('لم يتم التعرف على المنتج من الرابط المختصر')
        setUrlLoading(false)
      } catch (err) {
        console.error('Resolve URL error:', err)
        setUrlError('حدث خطأ أثناء فك الرابط المختصر')
        setUrlLoading(false)
      }
      return
    }

    const extracted = extractProductId(cleanUrl)
    if (!extracted) {
      setUrlError('رابط غير صالح. الصق رابط منتج من Taobao أو 1688 أو Amazon أو Shein')
      return
    }
    loadProductById(extracted.id, extracted.detectedProvider)
  }

  const doImageSearch = async (imageUrl) => {
    if (!imageUrl) return
    setLoading(true)
    setSearched(true)
    setSelectedProduct(null)
    setProductDetail(null)
    setImageResults([])
    try {
      const res = await fetch(`/.netlify/functions/amazon-serpapi?action=image-search&image_url=${encodeURIComponent(imageUrl)}`)
      const data = await res.json()
      if (data.success && data.results) {
        setImageResults(data.results)
        setResults([])
        setTotalCount(data.totalResults || data.results.length)
      } else {
        setImageResults([])
        setTotalCount(0)
      }
    } catch (err) {
      console.error('Image search error:', err)
      setImageResults([])
    }
    setLoading(false)
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async () => {
      const base64 = reader.result.split(',')[1]
      setLoading(true)
      setSearched(true)
      setSearchMode('image')
      setUrlError('')
      setImageResults([])
      try {
        const uploadRes = await fetch('/.netlify/functions/image-upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ base64, filename: file.name, contentType: file.type })
        })
        const uploadData = await uploadRes.json()
        if (uploadData.success && uploadData.url) {
          setImageUrlInput(uploadData.url)
          await doImageSearch(uploadData.url)
        } else {
          setUrlError('فشل رفع الصورة: ' + (uploadData.error || 'خطأ غير معروف'))
          setLoading(false)
        }
      } catch (err) {
        console.error('Upload error:', err)
        setUrlError('حدث خطأ أثناء رفع الصورة')
        setLoading(false)
      }
    }
    reader.readAsDataURL(file)
  }

  const [loadingVariant, setLoadingVariant] = useState(null) // ASIN of variant being loaded

  const loadAmazonVariant = async (asin) => {
    if (!asin) return
    setLoadingVariant(asin)
    setActiveImage(0)
    try {
      const res = await fetch(`/.netlify/functions/amazon-serpapi?action=product&asin=${encodeURIComponent(asin)}`)
      const data = await res.json()
      if (data.success && data.product) {
        const p = data.product
        const detailPics = (p.images || []).map(img => ({ Url: img }))
        setProductDetail(prev => ({
          ...prev,
          ...p,
          Pictures: detailPics,
          Description: p.description,
          FeatureBullets: p.features,
          // تحديث variants لتعكس الاختيار الحالي
          variants: (prev?.variants || p.variants || []).map(v => ({
            ...v,
            items: (v.items || []).map(i => ({
              ...i,
              selected: i.asin === asin,
            }))
          })),
        }))
        setSelectedProduct(prev => ({
          ...prev,
          Id: p.asin || asin,
          Title: p.title || prev.Title,
          Price: { OriginalPrice: p.price || prev.Price?.OriginalPrice || 0, OriginalCurrencyCode: 'USD' },
          MainPictureUrl: p.mainImage || prev.MainPictureUrl,
          Url: p.link || prev.Url,
          Reviews: p.reviews || prev.Reviews,
          Rating: p.rating || prev.Rating,
          isSerpApi: true,
        }))
      }
    } catch (err) {
      console.error('Variant load error:', err)
    }
    setLoadingVariant(null)
  }

  const loadProductDetail = async (item) => {
    setSelectedProduct(item)
    setActiveImage(0)
    setLoadingDetail(true)
    setProductDetail(null)
    setSelectedConfigs({})
    try {
      // Amazon: استخدام SerpApi
      if (item.isSerpApi || prov.useSerpApi) {
        const res = await fetch(`/.netlify/functions/amazon-serpapi?action=product&asin=${encodeURIComponent(item.Id)}`)
        const data = await res.json()
        if (data.success && data.product) {
          const p = data.product
          const detailPics = (p.images || []).map(img => ({ Url: img }))
          setProductDetail({
            ...p,
            Pictures: detailPics,
            Description: p.description,
            FeatureBullets: p.features,
            relatedProducts: data.relatedProducts || [],
          })
          // تحديث selectedProduct بالسعر والصورة الصحيحة
          setSelectedProduct(prev => ({
            ...prev,
            Price: { OriginalPrice: p.price || prev.Price?.OriginalPrice || 0, OriginalCurrencyCode: 'USD' },
            MainPictureUrl: p.mainImage || prev.MainPictureUrl,
            Url: p.link || prev.Url,
            Reviews: p.reviews || prev.Reviews,
            Rating: p.rating || prev.Rating,
            OldPrice: p.oldPrice || prev.OldPrice || 0,
            Badge: p.badge || prev.Badge,
            BoughtLastMonth: p.boughtLastMonth || prev.BoughtLastMonth,
          }))
          setSelectedConfigs({})
        }
      } else if (item.isBestBuy || prov.useSearchApi) {
        // Best Buy: التفاصيل متوفرة من نتائج البحث مباشرة
        const detailPics = (item.Images || []).map(img => ({ Url: img }))
        setProductDetail({
          Pictures: detailPics.length > 0 ? detailPics : [{ Url: item.MainPictureUrl }],
        })
        setSelectedConfigs({})
      } else if (item.isSheinApi || item.isShein || provider === 'shein') {
        // Shein: استخدام Apify لجلب التفاصيل
        const productUrl = item.Url || `https://ar.shein.com/p-${item.Id.replace('sh-', '')}.html`
        const res = await fetch(`/.netlify/functions/shein-product?url=${encodeURIComponent(productUrl)}`)
        const data = await res.json()
        if (data.success && data.product) {
          const p = data.product
          const detailPics = (p.images || []).map(img => ({ Url: img }))
          setProductDetail({
            Pictures: detailPics.length > 0 ? detailPics : [{ Url: item.MainPictureUrl }],
            discountPercentage: p.discountPercentage,
          })
          setSelectedProduct(prev => ({
            ...prev,
            Title: p.title || prev.Title,
            Price: { OriginalPrice: p.salePrice || prev.Price?.OriginalPrice || 0, OriginalCurrencyCode: p.currency || 'USD' },
            MainPictureUrl: p.mainImage || prev.MainPictureUrl,
            OldPrice: p.retailPrice || prev.OldPrice || 0,
            Url: p.url || prev.Url,
          }))
          setSelectedConfigs({})
        }
      } else if (item.isIHerb || prov.useApify) {
        // iHerb: استخدام Apify لجلب التفاصيل الكاملة
        const productUrl = item.Url || `https://www.iherb.com/pr/${item.Id.replace('ih-', '')}`
        const res = await fetch(`/.netlify/functions/iherb-product?url=${encodeURIComponent(productUrl)}`)
        const data = await res.json()
        if (data.success && data.product) {
          const p = data.product
          const detailPics = (p.images || []).map(img => ({ Url: img }))
          setProductDetail({
            ...p,
            Pictures: detailPics.length > 0 ? detailPics : [{ Url: item.MainPictureUrl }],
            Description: p.description,
            FeatureBullets: p.suggestedUse ? [`<b>طريقة الاستخدام:</b> ${p.suggestedUse}`] : [],
            ingredients: p.ingredients,
            warnings: p.warnings,
            allergenInfo: p.allergenInfo,
          })
          setSelectedProduct(prev => ({
            ...prev,
            Price: { OriginalPrice: p.price || prev.Price?.OriginalPrice || 0, OriginalCurrencyCode: 'USD' },
            MainPictureUrl: (p.images && p.images[0]) || prev.MainPictureUrl,
            Rating: p.rating || prev.Rating,
            Reviews: p.reviewCount || prev.Reviews,
            Brand: p.brand || prev.Brand,
          }))
          setSelectedConfigs({})
        }
      } else if (prov.currency === 'USD') {
        // USD providers: use proxy API
        const params = new URLSearchParams({
          _method: 'GetItemFullInfo',
          instanceKey: API_KEY,
          language: 'ar',
          signature: '', timestamp: '', sessionId: '',
          itemId: item.Id,
          blockList: '',
        })
        const res = await fetch(`${PROXY_BASE}?${params}`)
        const data = await res.json()
        if (data.ErrorCode === 'Ok' && data.OtapiItemFullInfo) {
          setProductDetail(data.OtapiItemFullInfo)
          setSelectedConfigs({})
        }
      } else {
        const res = await fetch(`${REST_BASE}/${prov.restKey}/product/${item.Id}?language=ar`, {
          headers: { 'X-Api-Key': API_KEY }
        })
        const data = await res.json()
        if (data.Result) {
          setProductDetail(data.Result)
          setSelectedConfigs({})
        }
      }
      // حفظ المنتج كرائج
      const p = formatPrice(item.Price, prov.currency)
      savePopularProduct(item, provider, p.iqd)
    } catch (err) {
      console.error('Detail error:', err)
    }
    setLoadingDetail(false)
  }

  const addToCart = (item) => {
    // التحقق من وجود أنواع واختيارها
    if (productDetail?.Configurators && productDetail.Configurators.length > 0) {
      const hasRequiredSelections = productDetail.Configurators.every(cfg => 
        !cfg.Required || selectedConfigs[cfg.Pid]
      )
      
      if (!hasRequiredSelections) {
        // عرض رسالة للمستخدم
        const missingTypes = productDetail.Configurators
          .filter(cfg => cfg.Required && !selectedConfigs[cfg.Pid])
          .map(cfg => cfg.Name || 'خيار')
          .join(' و ')
        
        // عرض رسالة أنيقة بدل alert
        setAddedToast(false)
        setTimeout(() => {
          const toast = document.createElement('div')
          toast.className = 'fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-red-500 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 min-w-[300px] animate-in slide-in-from-top'
          toast.innerHTML = `
            <svg class="w-5 h-5 text-white flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"/>
            </svg>
            <span class="text-sm font-medium flex-1">يرجى اختيار ${missingTypes} قبل الإضافة</span>
          `
          document.body.appendChild(toast)
          setTimeout(() => {
            toast.style.opacity = '0'
            setTimeout(() => document.body.removeChild(toast), 300)
          }, 3000)
        }, 100)
        return
      }
    }

    // إنشاء معرف فريد للمنتج مع الأنواع المختارة
    const optionsKey = Object.keys(selectedConfigs).length > 0 
      ? JSON.stringify(selectedConfigs) 
      : 'default'
    
    const uniqueId = `${item.Id}_${optionsKey}`
    const existing = cart.find(c => c.uniqueId === uniqueId)
    
    if (existing) {
      setCart(cart.map(c => c.uniqueId === uniqueId ? { ...c, qty: c.qty + 1 } : c))
    } else {
      const price = formatPrice(item.Price, prov.currency)
      setCart([...cart, {
        uniqueId,
        id: item.Id,
        title: item.Title,
        image: item.MainPictureUrl,
        priceCny: price.cny,
        priceUsd: Math.round(price.usd * 100) / 100,
        priceIqd: price.iqd,
        provider: provider,
        providerLabel: prov.label,
        url: item.ExternalItemUrl || item.TaobaoItemUrl,
        selectedOptions: Object.keys(selectedConfigs).length > 0 ? { ...selectedConfigs } : null,
        qty: 1,
      }])
    }
    setAddedToast(true)
    setTimeout(() => setAddedToast(false), 3000)
  }

  const updateQty = (itemId, delta) => {
    setCart(prev => prev.map(c => {
      const match = c.uniqueId ? c.uniqueId === itemId : c.id === itemId
      if (!match) return c
      const newQty = c.qty + delta
      if (newQty <= 0) return { ...c, qty: 0 }
      return { ...c, qty: newQty }
    }).filter(c => c.qty > 0))
  }

  const removeFromCart = (itemId) => {
    setCart(prev => prev.filter(c => c.uniqueId ? c.uniqueId !== itemId : c.id !== itemId))
  }

  const cartTotal = cart.reduce((sum, c) => sum + c.priceIqd * c.qty, 0)
  const cartCount = cart.reduce((sum, c) => sum + c.qty, 0)
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  const formatNum = (n) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')

  // --- Product Detail View ---
  if (selectedProduct) {
    const item = selectedProduct
    const price = formatPrice(item.Price, prov.currency)
    const pics = (productDetail?.Pictures && productDetail.Pictures.length > 0) ? productDetail.Pictures : (item.Pictures || [])
    const iqd = price.iqd
    const inCart = cart.find(c => c.id === item.Id && Object.keys(c.selectedOptions || {}).length === Object.keys(selectedConfigs || {}).length)
    const sales = item.FeaturedValues?.find(f => f.Name === 'SalesInLast30Days')?.Value
    const reviews = item.FeaturedValues?.find(f => f.Name === 'reviews')?.Value || item.Reviews
    const provLabel = prov.currency === 'USD' ? 'Amazon' : prov.label
    const provFlag = null
    const discountPercent = item.OldPrice > 0 && item.OldPrice > (item.Price?.OriginalPrice || 0) ? Math.round((1 - (item.Price?.OriginalPrice || 0) / item.OldPrice) * 100) : 0

    return (
      <>
        <ProductView
          item={item} productDetail={productDetail} pics={pics} iqd={iqd} inCart={inCart}
          sales={sales} reviews={reviews} provLabel={provLabel} discountPercent={discountPercent}
          formatNum={formatNum} loadingDetail={loadingDetail} cartCount={cartCount}
          isFavorite={isFavorite} toggleFavorite={toggleFavorite} setShowCart={setShowCart}
          setSelectedProduct={setSelectedProduct} addToCart={addToCart} updateQty={updateQty}
          flyToCart={flyToCart} selectedConfigs={selectedConfigs} setSelectedConfigs={setSelectedConfigs}
          loadAmazonVariant={loadAmazonVariant} loadingVariant={loadingVariant}
          loadProductById={loadProductById} setShowExplainSheet={setShowExplainSheet}
          setExplainMessages={setExplainMessages} askExplain={askExplain}
          showExplainSheet={showExplainSheet} explainMessages={explainMessages}
          explainLoading={explainLoading} addedToast={addedToast} setAddedToast={setAddedToast}
          applyCommission={applyCommission} prov={prov} formatPrice={formatPrice}
          productImageRef={productImageRef} productInfoRef={productInfoRef}
          priceCountRef={priceCountRef} pageRef={pageRef}
          USD_TO_IQD={USD_TO_IQD} CNY_TO_USD={CNY_TO_USD}
          activeImage={activeImage} setActiveImage={setActiveImage}
        />
        {/* Cart overlay inside product view */}
        {showCart && (
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
                  <button onClick={() => setShowCart(false)} className="mt-6 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold text-sm active:scale-95 transition-all shadow-lg shadow-indigo-200/50">تصفح المنتجات</button>
                </div>
              ) : (
                <div className="p-4 space-y-3 pb-6">
                  {cart.map(c => (
                    <div key={c.uniqueId || c.id} className="flex gap-3 bg-white rounded-2xl p-3.5 border border-slate-100 shadow-sm">
                      <img src={c.image} alt="" className="w-20 h-20 rounded-xl object-cover flex-shrink-0 bg-slate-50" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-slate-700 line-clamp-2 leading-snug">{c.title}</p>
                        <span className="text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md font-semibold inline-block mt-1">{c.providerLabel}</span>
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
            {cart.length > 0 && (
              <div className="bg-white border-t border-slate-100 px-5 py-4 flex-shrink-0 space-y-3 shadow-2xl">
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
        )}
      </>
    )
  }

  
  // --- Search & Results View ---
  const categories = provider === 'iherb'
    ? [
        { img: 'https://cdn-icons-png.flaticon.com/128/3159/3159960.png', label: 'فيتامينات', q: 'vitamins', bg: 'bg-green-50', gradient: 'from-green-400 to-emerald-600', emoji: '💊' },
        { img: 'https://cdn-icons-png.flaticon.com/128/2927/2927347.png', label: 'بروتين', q: 'protein powder', bg: 'bg-orange-50', gradient: 'from-orange-400 to-red-500', emoji: '💪' },
        { img: 'https://cdn-icons-png.flaticon.com/128/1940/1940922.png', label: 'جمال', q: 'beauty skincare', bg: 'bg-pink-50', gradient: 'from-pink-400 to-rose-500', emoji: '💄' },
        { img: 'https://cdn-icons-png.flaticon.com/128/2913/2913520.png', label: 'أعشاب', q: 'herbs supplements', bg: 'bg-lime-50', gradient: 'from-lime-400 to-green-600', emoji: '🌿' },
        { img: 'https://cdn-icons-png.flaticon.com/128/3163/3163186.png', label: 'رياضة', q: 'sports nutrition', bg: 'bg-blue-50', gradient: 'from-blue-400 to-indigo-600', emoji: '🏋️' },
        { img: 'https://cdn-icons-png.flaticon.com/128/3082/3082044.png', label: 'أطفال', q: 'baby kids health', bg: 'bg-amber-50', gradient: 'from-amber-400 to-orange-500', emoji: '👶' },
        { img: 'https://cdn-icons-png.flaticon.com/128/706/706164.png', label: 'أوميغا', q: 'omega fish oil', bg: 'bg-cyan-50', gradient: 'from-cyan-400 to-blue-600', emoji: '🐟' },
        { img: 'https://cdn-icons-png.flaticon.com/128/1261/1261163.png', label: 'منزل', q: 'home essentials', bg: 'bg-teal-50', gradient: 'from-teal-400 to-cyan-600', emoji: '🏠' },
      ]
    : provider === 'amazon'
    ? [
        { img: 'https://cdn-icons-png.flaticon.com/128/3659/3659899.png', label: 'إلكترونيات', q: 'electronics', bg: 'bg-blue-50', gradient: 'from-blue-500 to-indigo-600', emoji: '🔌' },
        { img: 'https://cdn-icons-png.flaticon.com/128/2589/2589903.png', label: 'أحذية', q: 'shoes', bg: 'bg-orange-50', gradient: 'from-orange-400 to-red-500', emoji: '👟' },
        { img: 'https://cdn-icons-png.flaticon.com/128/679/679922.png', label: 'حقائب', q: 'bags', bg: 'bg-amber-50', gradient: 'from-amber-400 to-orange-500', emoji: '👜' },
        { img: 'https://cdn-icons-png.flaticon.com/128/1940/1940922.png', label: 'جمال', q: 'beauty', bg: 'bg-pink-50', gradient: 'from-pink-400 to-rose-500', emoji: '💄' },
        { img: 'https://cdn-icons-png.flaticon.com/128/3159/3159960.png', label: 'مكملات', q: 'supplements vitamins', bg: 'bg-green-50', gradient: 'from-green-400 to-emerald-600', emoji: '💊' },
        { img: 'https://cdn-icons-png.flaticon.com/128/1261/1261163.png', label: 'منزل', q: 'home kitchen', bg: 'bg-teal-50', gradient: 'from-teal-400 to-cyan-600', emoji: '🏠' },
        { img: 'https://cdn-icons-png.flaticon.com/128/2972/2972531.png', label: 'ساعات', q: 'watches', bg: 'bg-gray-100', gradient: 'from-slate-500 to-gray-700', emoji: '⌚' },
        { img: 'https://cdn-icons-png.flaticon.com/128/3163/3163186.png', label: 'رياضة', q: 'sports fitness', bg: 'bg-emerald-50', gradient: 'from-emerald-400 to-green-600', emoji: '🏋️' },
      ]
    : provider === '1688'
    ? [
        { img: 'https://cdn-icons-png.flaticon.com/128/863/863684.png', label: 'أزياء', q: 'ملابس', bg: 'bg-purple-50', gradient: 'from-purple-400 to-indigo-600', emoji: '👗' },
        { img: 'https://cdn-icons-png.flaticon.com/128/2589/2589903.png', label: 'أحذية', q: 'أحذية', bg: 'bg-orange-50', gradient: 'from-orange-400 to-red-500', emoji: '👟' },
        { img: 'https://cdn-icons-png.flaticon.com/128/679/679922.png', label: 'حقائب', q: 'حقائب', bg: 'bg-amber-50', gradient: 'from-amber-400 to-orange-500', emoji: '👜' },
        { img: 'https://cdn-icons-png.flaticon.com/128/1940/1940922.png', label: 'جمال', q: 'مكياج', bg: 'bg-pink-50', gradient: 'from-pink-400 to-rose-500', emoji: '💄' },
        { img: 'https://cdn-icons-png.flaticon.com/128/3659/3659899.png', label: 'إلكترونيات', q: 'إلكترونيات', bg: 'bg-blue-50', gradient: 'from-blue-500 to-indigo-600', emoji: '🔌' },
        { img: 'https://cdn-icons-png.flaticon.com/128/3082/3082044.png', label: 'ألعاب', q: 'العاب اطفال', bg: 'bg-red-50', gradient: 'from-red-400 to-pink-500', emoji: '🧸' },
      ]
    : [
        { img: 'https://cdn-icons-png.flaticon.com/128/863/863684.png', label: 'أزياء', q: 'فساتين', bg: 'bg-purple-50', gradient: 'from-purple-400 to-indigo-600', emoji: '👗' },
        { img: 'https://cdn-icons-png.flaticon.com/128/2589/2589903.png', label: 'أحذية', q: 'أحذية', bg: 'bg-orange-50', gradient: 'from-orange-400 to-red-500', emoji: '👟' },
        { img: 'https://cdn-icons-png.flaticon.com/128/679/679922.png', label: 'حقائب', q: 'حقائب', bg: 'bg-amber-50', gradient: 'from-amber-400 to-orange-500', emoji: '👜' },
        { img: 'https://cdn-icons-png.flaticon.com/128/1940/1940922.png', label: 'جمال', q: 'عطور', bg: 'bg-pink-50', gradient: 'from-pink-400 to-rose-500', emoji: '💄' },
        { img: 'https://cdn-icons-png.flaticon.com/128/3659/3659899.png', label: 'إلكترونيات', q: 'سماعات', bg: 'bg-blue-50', gradient: 'from-blue-500 to-indigo-600', emoji: '🔌' },
        { img: 'https://cdn-icons-png.flaticon.com/128/3082/3082044.png', label: 'ألعاب', q: 'العاب اطفال', bg: 'bg-red-50', gradient: 'from-red-400 to-pink-500', emoji: '🧸' },
      ]

  const trendingSearches = provider === 'iherb'
    ? ['Vitamin C', 'Omega 3', 'Collagen', 'Probiotics', 'Biotin', 'Zinc', 'Whey Protein', 'Creatine']
    : provider === 'amazon'
    ? ['AirPods Pro', 'Stanley Cup', 'Protein Powder', 'Gaming Mouse', 'Vitamin D', 'Running Shoes', 'Kindle', 'Smart Watch']
    : ['حقيبة يد', 'سماعة بلوتوث', 'فستان سهرة', 'حذاء رياضي', 'عطر', 'ساعة يد', 'مكياج', 'العاب']

  const provColor = provider === 'amazon' ? 'from-slate-800 to-slate-900' : provider === 'shein' ? 'from-pink-500 to-pink-600' : provider === 'iherb' ? 'from-green-500 to-emerald-600' : 'from-indigo-500 to-indigo-600'
  const provAccent = provider === 'amazon' ? 'bg-indigo-600' : provider === 'shein' ? 'bg-pink-500' : provider === 'iherb' ? 'bg-green-600' : 'bg-indigo-600'

  // دالة البحث بعد التوقف عن الكتابة - حقل ذكي يكتشف نص أو رابط
  const isUrl = (text) => /^https?:\/\//i.test(text.trim()) || /^(e|m)\.tb\.cn\//i.test(text.trim()) || /^a\.co\//i.test(text.trim())
  const handleSmartInput = (val) => {
    setQuery(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const trimmed = val.trim()
    if (trimmed.length < 2) return
    if (isUrl(trimmed)) {
      setUrlInput(trimmed)
      debounceRef.current = setTimeout(() => handleUrlSearch(), 600)
    } else {
      debounceRef.current = setTimeout(() => doSearch(0), 800)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20" dir="rtl">
      <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleImageUpload} />
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-2.5">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-slate-100 transition-all active:scale-95 flex-shrink-0">
              <ArrowRight className="w-5 h-5 text-slate-600" />
            </button>
            {/* Provider Logo */}
            <div className="flex-1 flex items-center justify-center">
              {provider === 'amazon' ? (
                <div className="flex items-center gap-0">
                  <span className="text-[20px] font-black text-slate-900 tracking-tight" style={{ fontFamily: 'Arial, sans-serif' }}>amazon</span>
                  <svg viewBox="0 0 40 16" className="w-8 h-3 mt-1" fill="none"><path d="M2 8C8 14 16 16 24 12C28 10 32 7 38 6" stroke="#FF9900" strokeWidth="3" strokeLinecap="round" fill="none"/><path d="M30 2L38 6L30 8" fill="#FF9900"/></svg>
                </div>
              ) : (
                <h1 className="text-[16px] font-black text-slate-900 tracking-tight">{prov.label}</h1>
              )}
            </div>
            <button onClick={() => setShowCart(true)} className="relative w-9 h-9 rounded-xl flex items-center justify-center hover:bg-slate-100 transition-all active:scale-95 flex-shrink-0">
              <ShoppingCart className="w-5 h-5 text-slate-600" />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-indigo-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">{cartCount}</span>
              )}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto">
        {/* Search Section */}
        <div className="mx-4 mt-4">
          {/* Smart Search Bar */}
          <div className="relative">
            <Search className="w-[18px] h-[18px] absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
            <input
              ref={searchRef}
              type="text"
              dir="auto"
              placeholder={!query && !searched ? `${searchSuggestions[activeSuggestion]}...` : 'ابحث عن أي منتج تريده...'}
              value={query}
              onChange={e => handleSmartInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); const t = query.trim(); if (isUrl(t)) { setUrlInput(t); setTimeout(() => handleUrlSearch(), 50) } else { doSearch(0) } } }}
              className="w-full h-[52px] pl-11 pr-24 bg-white rounded-2xl text-[14px] outline-none transition-all focus:ring-2 focus:ring-indigo-100 border border-slate-200 focus:border-indigo-300 placeholder:text-slate-400 shadow-sm"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 z-20">
              {query ? (
                <button onClick={() => { setQuery(''); setUrlInput(''); setUrlError(''); setSearched(false); setResults([]); searchRef.current?.focus() }} className="w-9 h-9 flex items-center justify-center hover:bg-gray-100 rounded-full transition active:scale-90">
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              ) : (
                <>
                  <button onClick={() => fileInputRef.current?.click()} className="w-9 h-9 flex items-center justify-center hover:bg-gray-100 rounded-xl transition active:scale-90" title="بحث بالصورة">
                    <Camera className="w-[18px] h-[18px] text-gray-400" />
                  </button>
                  <button onClick={() => { if (!query && searchSuggestions[activeSuggestion]) { setQuery(searchSuggestions[activeSuggestion]); doSearch(0) } else { doSearch(0) } }}
                    className="w-9 h-9 flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 rounded-xl transition active:scale-90 shadow-sm">
                    <Search className="w-4 h-4 text-white" />
                  </button>
                </>
              )}
            </div>
          </div>
          {isUrl(query.trim()) && !loading && (
            <div className="flex items-center gap-2 mt-2 px-1">
              <LinkIcon className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
              <span className="text-[11px] text-blue-600">تم الكشف عن رابط - اضغط Enter لفتح المنتج</span>
            </div>
          )}
          {urlError && <p className="text-[11px] text-red-500 mt-1.5 px-1">{urlError}</p>}
        </div>

        {/* ═══ Amazon-style Homepage (only when not searched) ═══ */}
        {!searched && !loading && !urlLoading && (
          <>
            {/* ── Hero Banner Carousel (Products + Promos) ── */}
            <div className="mx-4 mt-4">
              <div className="relative overflow-hidden rounded-2xl shadow-lg" style={{ minHeight: 160 }}>
                {banners.map((b, i) => (
                  <div key={i}
                    onClick={() => b.type === 'product' ? loadProductById(b.productId, b.productProvider) : null}
                    className={`absolute inset-0 bg-gradient-to-l ${b.gradient} transition-all duration-700 ease-in-out ${i === activeBanner ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'} ${b.type === 'product' ? 'cursor-pointer' : ''}`}>
                    {/* Product banner with real image */}
                    {b.type === 'product' ? (
                      <>
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 w-[110px] h-[110px] bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center p-2">
                          <img src={b.image} alt="" className="w-full h-full object-contain drop-shadow-lg" loading="lazy"
                            onError={e => { e.target.style.display = 'none' }} />
                        </div>
                        <div className="relative h-full flex flex-col justify-center pr-5 pl-[130px] py-4">
                          <span className={`${b.badgeColor} text-white text-[10px] font-bold px-2.5 py-1 rounded-lg self-start mb-2`}>{b.badge}</span>
                          <p className="text-[13px] text-white/90 font-bold leading-snug line-clamp-2">{b.title}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-[18px] font-black text-white">{formatNum(b.priceRaw)}</span>
                            <span className="text-[11px] text-white/50">د.ع</span>
                          </div>
                          <span className="text-[10px] text-white/40 mt-1 flex items-center gap-1">
                            <ChevronLeft className="w-3 h-3" /> اضغط لعرض المنتج
                          </span>
                        </div>
                      </>
                    ) : (
                      /* Static promo banner */
                      <div className="relative h-full flex flex-col justify-center px-5 py-5">
                        <span className={`${b.badgeColor} text-white text-[10px] font-bold px-2.5 py-1 rounded-lg self-start mb-2`}>{b.badge}</span>
                        <h2 className="text-[20px] font-black text-white leading-tight">{b.title}</h2>
                        <p className="text-[13px] text-white/70 mt-1">{b.subtitle}</p>
                      </div>
                    )}
                  </div>
                ))}
                {/* Dots */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                  {banners.map((_, i) => (
                    <button key={i} onClick={(e) => { e.stopPropagation(); setActiveBanner(i) }}
                      className={`h-[5px] rounded-full transition-all duration-300 ${i === activeBanner ? 'w-6 bg-white' : 'w-2 bg-white/40'}`} />
                  ))}
                </div>
              </div>
            </div>

            {/* ── Quick Categories Row ── */}
            {provider !== 'shein' && (
              <div className="mt-4 px-4">
                <div className="flex gap-2.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                  {categories.map(cat => (
                    <button key={cat.label}
                      onClick={() => { setQuery(cat.q); doSearch(0) }}
                      className="flex flex-col items-center gap-1.5 flex-shrink-0 active:scale-95 transition-all">
                      <div className={`w-[60px] h-[60px] rounded-2xl ${cat.bg} flex items-center justify-center border border-slate-100 shadow-sm`}>
                        <img src={cat.img} alt={cat.label} className="w-8 h-8 object-contain" loading="lazy" />
                      </div>
                      <span className="text-[10px] font-semibold text-slate-600 whitespace-nowrap">{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Trending Searches ── */}
            <div className="mt-5 px-4">
              <h3 className="text-[14px] font-bold text-slate-800 mb-2.5 flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-orange-500" /> الأكثر بحثاً
              </h3>
              <div className="flex flex-wrap gap-2">
                {trendingSearches.map((term, i) => (
                  <button key={term}
                    onClick={() => { setQuery(term); doSearch(0) }}
                    className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-all active:scale-95 ${
                      i < 3
                        ? 'bg-[#232F3E] text-[#FF9900] font-bold'
                        : 'bg-white text-slate-600 border border-slate-200 hover:border-[#FF9900] hover:text-[#232F3E]'
                    }`}>
                    {i < 3 && <span className="text-[10px] mr-1 opacity-70">#{i + 1}</span>}
                    {term}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Provider Toggle ── */}
            {(provider === 'taobao' || provider === '1688') && (
              <div className="flex gap-2 mx-4 mt-4">
                <button onClick={() => navigate('/china/taobao')}
                  className={`flex-1 h-10 rounded-xl flex items-center justify-center gap-2 font-bold text-[12px] transition-all active:scale-[0.97] ${
                    provider === 'taobao' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200'
                  }`}>
                  <ShoppingBag className="w-3.5 h-3.5" /> Taobao
                </button>
                <button onClick={() => navigate('/china/1688')}
                  className={`flex-1 h-10 rounded-xl flex items-center justify-center gap-2 font-bold text-[12px] transition-all active:scale-[0.97] ${
                    provider === '1688' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200'
                  }`}>
                  <Package className="w-3.5 h-3.5" /> 1688
                </button>
              </div>
            )}

            {/* ── Shop by Category (Big Cards) ── */}
            {provider !== 'shein' && (
              <div className="mt-5 px-4">
                <h3 className="text-[14px] font-bold text-slate-800 mb-3 flex items-center gap-1.5">
                  <Filter className="w-4 h-4 text-indigo-500" /> تسوّق حسب التصنيف
                </h3>
                <div className="grid grid-cols-3 gap-2.5">
                  {categories.slice(0, 6).map(cat => (
                    <button key={cat.label + '-big'}
                      onClick={() => { setQuery(cat.q); doSearch(0) }}
                      className="bg-white rounded-2xl border border-slate-100 p-3 flex flex-col items-center gap-2 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-[0.97] transition-all">
                      <div className={`w-14 h-14 rounded-xl ${cat.bg} flex items-center justify-center`}>
                        <img src={cat.img} alt={cat.label} className="w-9 h-9 object-contain" loading="lazy" />
                      </div>
                      <span className="text-[11px] font-bold text-slate-700">{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Popular / Picked for You ── */}
            {popularProducts.length > 0 && (
              <div className="mt-5 px-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[14px] font-bold text-slate-800 flex items-center gap-1.5">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" /> اخترنا لك
                  </h3>
                  <span className="text-[11px] text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg">{popularProducts.length} منتج</span>
                </div>
                {/* Horizontal scroll for first 4 */}
                <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                  {popularProducts.slice(0, 6).map((pp, idx) => (
                    <div key={pp.id}
                      onClick={() => loadProductById(pp.product_id, pp.provider)}
                      className="flex-shrink-0 w-[160px] bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-lg active:scale-[0.97] transition-all cursor-pointer group">
                      <div className="relative aspect-square bg-gradient-to-b from-slate-50 to-white overflow-hidden">
                        <img src={pp.image} alt={pp.title} className="w-full h-full object-contain p-3 group-hover:scale-105 transition-transform" loading="lazy"
                          onError={e => { e.target.style.display = 'none' }} />
                        {idx < 3 && (
                          <span className="absolute top-2 right-2 text-[9px] bg-[#232F3E] text-[#FF9900] px-2 py-0.5 rounded-md font-bold">
                            #{idx + 1} رائج
                          </span>
                        )}
                      </div>
                      <div className="p-2.5">
                        <p className="text-[11px] text-slate-700 font-medium line-clamp-2 min-h-[30px] leading-snug">{pp.title}</p>
                        <p className="text-[14px] font-black text-slate-900 mt-1.5">
                          {formatNum(pp.price_iqd)}
                          <span className="text-[9px] text-slate-400 font-normal mr-0.5"> د.ع</span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Grid for rest */}
                {popularProducts.length > 6 && (
                  <div ref={popularRef} className="grid grid-cols-2 gap-3 mt-3">
                    {popularProducts.slice(6).map((pp, idx) => (
                      <div key={pp.id}
                        onClick={() => loadProductById(pp.product_id, pp.provider)}
                        className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-lg active:scale-[0.97] transition-all cursor-pointer group">
                        <div className="relative aspect-square bg-gradient-to-b from-slate-50 to-white overflow-hidden">
                          <img src={pp.image} alt={pp.title} className="w-full h-full object-contain p-3 group-hover:scale-105 transition-transform" loading="lazy"
                            onError={e => { e.target.style.display = 'none' }} />
                        </div>
                        <div className="p-2.5">
                          <p className="text-[11px] text-slate-700 font-medium line-clamp-2 min-h-[30px] leading-snug">{pp.title}</p>
                          <p className="text-[14px] font-black text-slate-900 mt-1.5">
                            {formatNum(pp.price_iqd)}
                            <span className="text-[9px] text-slate-400 font-normal mr-0.5"> د.ع</span>
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Features Bar ── */}
            <div className="mx-4 mb-6 mt-2 grid grid-cols-3 gap-2">
              <div className="bg-white rounded-xl border border-slate-100 p-3 flex flex-col items-center text-center">
                <Truck className="w-5 h-5 text-emerald-500 mb-1.5" />
                <p className="text-[10px] font-bold text-slate-700">شحن مجاني</p>
                <p className="text-[9px] text-slate-400">للعراق</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-100 p-3 flex flex-col items-center text-center">
                <Star className="w-5 h-5 text-amber-500 fill-amber-500 mb-1.5" />
                <p className="text-[10px] font-bold text-slate-700">منتجات أصلية</p>
                <p className="text-[9px] text-slate-400">100% مضمونة</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-100 p-3 flex flex-col items-center text-center">
                <Headphones className="w-5 h-5 text-indigo-500 mb-1.5" />
                <p className="text-[10px] font-bold text-slate-700">دعم 24/7</p>
                <p className="text-[9px] text-slate-400">مساعدة ذكية</p>
              </div>
            </div>
          </>
        )}


        {/* Loading - Skeleton Grid */}
        {(loading || urlLoading) && (
          <div className="px-4 mt-4">
            <SearchSkeleton />
          </div>
        )}

        {/* Image Search Results */}
        {imageResults.length > 0 && !loading && (
          <div className="px-4 mb-6 mt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[15px] font-bold text-slate-800 flex items-center gap-2">
                <span className="w-1 h-5 bg-indigo-500 rounded-full"></span>
                نتائج البحث بالصورة
              </h3>
              <span className="text-[12px] text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg">{imageResults.length} نتيجة</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {imageResults.map((item, idx) => (
                <div key={idx}
                  onClick={() => {
                    if (item.asin) {
                      loadProductById(item.asin, 'amazon')
                    } else if (item.link) {
                      const asinFromLink = item.link.match(/(?:\/dp\/|\/product\/|\/gp\/product\/)([A-Z0-9]{10})/i)
                      if (asinFromLink) loadProductById(asinFromLink[1], 'amazon')
                    }
                  }}
                  className="bg-white rounded-2xl overflow-hidden border border-slate-100 hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer active:scale-[0.97]">
                  <div className="relative aspect-square bg-slate-50 overflow-hidden">
                    <img src={item.image} alt={item.title} className="w-full h-full object-contain p-3" loading="lazy"
                      onError={e => { e.target.style.display = 'none' }} />
                    <span className="absolute top-2 right-2 text-[9px] bg-indigo-600/90 backdrop-blur-sm text-white px-2 py-0.5 rounded-lg font-bold">Amazon</span>
                  </div>
                  <div className="p-3">
                    <p className="text-[12px] text-slate-700 font-medium line-clamp-2 mb-2 leading-snug">{item.title}</p>
                    {item.price > 0 && (
                      <p className="text-[14px] font-black text-slate-900">{formatNum(applyCommission(Math.round(item.price * USD_TO_IQD)))} <span className="text-[10px] text-slate-400 font-normal">د.ع</span></p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {searched && !loading && imageResults.length === 0 && (
          <div className="px-4 mt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[15px] font-bold text-slate-800">
                {totalCount > 0 ? (
                  <span className="flex items-center gap-2">
                    <span className="w-1 h-5 bg-indigo-500 rounded-full"></span>
                    {formatNum(totalCount)} نتيجة
                  </span>
                ) : 'لا توجد نتائج'}
              </h3>
              {totalCount > 0 && (
                <span className="text-[12px] text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg">صفحة {page + 1}</span>
              )}
            </div>

            {/* Sort */}
            {totalCount > 0 && (
              <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
                {[
                  { key: 'default', label: 'الافتراضي' },
                  { key: 'price', label: 'الأرخص' },
                  { key: '-price', label: 'الأغلى' },
                  { key: 'volume', label: 'الأكثر مبيعاً' },
                ].map(s => (
                  <button key={s.key} onClick={() => { setSortBy(s.key); doSearch(0, s.key) }}
                    className={`whitespace-nowrap px-4 py-2 rounded-xl text-[12px] font-bold transition-all active:scale-95 ${
                      sortBy === s.key
                        ? `${provAccent} text-white shadow-md`
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}>
                    {s.label}
                  </button>
                ))}
              </div>
            )}

            {results.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-slate-300" />
                </div>
                <p className="text-sm font-bold text-slate-500">لا توجد نتائج لـ "{query}"</p>
                <p className="text-[12px] text-slate-400 mt-1">جرب كلمات بحث مختلفة</p>
              </div>
            ) : (
              <div ref={resultsGridRef} className="grid grid-cols-2 gap-3">
                {results.map(item => {
                  const price = formatPrice(item.Price, prov.currency)
                  const iqd = price.iqd
                  const inCart = cart.find(c => c.id === item.Id && Object.keys(c.selectedOptions || {}).length === Object.keys(selectedConfigs || {}).length)
                  const sales = item.FeaturedValues?.find(f => f.Name === 'SalesInLast30Days')?.Value

                  if (item.isIframe) return null

                  return (
                    <div key={item.Id}
                      className="bg-white rounded-2xl overflow-hidden border border-slate-100 hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer active:scale-[0.97]"
                      onClick={() => loadProductDetail(item)}>
                      {/* Image */}
                      <div className="relative aspect-square bg-gradient-to-b from-slate-50 to-white overflow-hidden">
                        {item.MainPictureUrl ? (
                          <img src={item.MainPictureUrl} alt="" className="w-full h-full object-contain p-3" loading="lazy" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-10 h-10 text-slate-200" />
                          </div>
                        )}
                        {/* Provider badge */}
                        <span className={`absolute top-2.5 right-2.5 text-[9px] ${prov.color}/90 backdrop-blur-sm text-white px-2 py-0.5 rounded-lg font-bold`}>
                          {prov.label}
                        </span>
                        {/* Favorite button */}
                        <button onClick={(e) => { e.stopPropagation(); heartPulse(e.currentTarget); toggleFavorite(item) }}
                          className="absolute top-2.5 left-2.5 w-8 h-8 bg-white/80 backdrop-blur rounded-full flex items-center justify-center shadow-sm active:scale-90 transition-all z-10">
                          <Heart className={`w-4 h-4 ${isFavorite(item.Id) ? 'text-red-500 fill-red-500' : 'text-slate-400'}`} />
                        </button>
                        {inCart && (
                          <div className="absolute top-12 left-2.5 w-6 h-6 bg-indigo-600 rounded-lg flex items-center justify-center shadow-sm z-10">
                            <span className="text-white text-[10px] font-bold">{inCart.qty}</span>
                          </div>
                        )}
                        {sales && parseInt(sales) > 1000 && (
                          <span className="absolute bottom-2.5 left-2.5 bg-indigo-600/90 backdrop-blur-sm text-white text-[9px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-0.5"><Flame className="w-3 h-3" /> HOT</span>
                        )}
                      </div>
                      {/* Info */}
                      <div className="p-3">
                        <p className="text-[12px] text-slate-700 font-medium line-clamp-2 min-h-[34px] leading-snug">{item.Title}</p>
                        <div className="mt-2.5 flex items-end justify-between">
                          <p className="text-[15px] font-black text-slate-900">
                            {formatNum(iqd)}
                            <span className="text-[10px] text-slate-400 font-normal mr-0.5">?.?</span>
                          </p>
                          <div className={`w-7 h-7 ${provAccent} rounded-lg flex items-center justify-center shadow-sm`}>
                            <Plus className="w-4 h-4 text-white" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-8 mb-24">
                <button onClick={() => doSearch(page - 1)} disabled={page === 0}
                  className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center disabled:opacity-30 hover:bg-slate-200 transition-all active:scale-95">
                  <ChevronRight className="w-5 h-5 text-slate-600" />
                </button>
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-2.5">
                  <span className="text-[13px] text-indigo-700 font-bold">{page + 1} / {Math.min(totalPages, 100)}</span>
                </div>
                <button onClick={() => doSearch(page + 1)} disabled={page >= totalPages - 1 || page >= 99}
                  className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center disabled:opacity-30 hover:bg-slate-200 transition-all active:scale-95">
                  <ChevronLeft className="w-5 h-5 text-slate-600" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Toast */}
      {addedToast && (
        <div ref={el => { if (el) toastAnim(el, true) }} className="fixed top-14 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-emerald-600 text-white px-5 py-3.5 rounded-2xl shadow-2xl shadow-emerald-200/50 flex items-center gap-3 min-w-[280px]">
            <CheckCircle2 className="w-5 h-5 text-emerald-200 flex-shrink-0" />
            <span className="text-sm font-semibold flex-1">تمت الإضافة للسلة</span>
            <button onClick={() => { setAddedToast(false); setShowCart(true) }}
              className="text-sm font-bold text-emerald-200 hover:text-white whitespace-nowrap">
              عرض ←
            </button>
          </div>
        </div>
      )}

      {/* Bottom Tab Bar */}
      <BottomTabBar
        cartCount={cartCount}
        favCount={favorites.length}
        onCartClick={() => setShowCart(true)}
        onFavClick={() => setShowFavorites(true)}
        onAiClick={() => setOpenAiChat(true)}
      />

      {/* Cart Full Page */}
      {showCart && (
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
                      
                      {c.selectedOptions && Object.keys(c.selectedOptions).length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {Object.entries(c.selectedOptions).map(([pid, vid]) => {
                            const config = productDetail?.Configurators?.find(cfg => cfg.Pid === pid)
                            const value = config?.Values?.find(v => v.Vid === vid)
                            return (
                              <span key={`${pid}-${vid}`} className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md">
                                {config?.Name}: {value?.Name || value?.Value || vid}
                              </span>
                            )
                          })}
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
      )}

      {/* Favorites Full Page */}
      {showFavorites && (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-50" dir="rtl">
          <div className="bg-white/95 backdrop-blur-md flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-100 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-pink-50 rounded-xl flex items-center justify-center">
                <Heart className="w-5 h-5 text-pink-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">المفضلة</h3>
                <p className="text-[12px] text-slate-400">{favorites.length} منتج</p>
              </div>
            </div>
            <button onClick={() => setShowFavorites(false)} className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center hover:bg-slate-200 transition-all active:scale-95">
              <X className="w-4 h-4 text-slate-500" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {favorites.length === 0 ? (
              <div className="text-center py-32 px-6">
                <div className="w-24 h-24 bg-pink-50 rounded-3xl flex items-center justify-center mx-auto mb-5">
                  <Heart className="w-12 h-12 text-pink-300" />
                </div>
                <p className="text-lg font-bold text-slate-600">لا توجد مفضلات بعد</p>
                <p className="text-sm text-slate-400 mt-2">اضغط على القلب لحفظ المنتجات</p>
                <button onClick={() => setShowFavorites(false)} className="mt-6 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold text-sm active:scale-95 transition-all shadow-lg shadow-indigo-200/50">
                  تصفح المنتجات
                </button>
              </div>
            ) : (
              <div className="p-4 space-y-3 pb-8">
                {favorites.map(item => {
                  const pr = formatPrice(item.Price, item.isSerpApi ? 'USD' : provCurrency)
                  return (
                    <div key={item.Id} className="flex gap-3 bg-white rounded-2xl p-3.5 border border-slate-100 shadow-sm">
                      <img src={item.MainPictureUrl} alt="" className="w-20 h-20 rounded-xl object-cover bg-slate-50 flex-shrink-0 cursor-pointer" onClick={() => { setShowFavorites(false); setSelectedProduct(item) }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-slate-800 line-clamp-2 cursor-pointer" onClick={() => { setShowFavorites(false); setSelectedProduct(item) }}>{item.Title}</p>
                        <p className="text-[14px] font-black text-indigo-600 mt-1">{formatNum(pr.iqd)} ?.?</p>
                      </div>
                      <button onClick={() => toggleFavorite(item)} className="w-8 h-8 flex-shrink-0 flex items-center justify-center">
                        <Heart className="w-5 h-5 text-red-500 fill-red-500" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      <AiChat provider={provider} externalOpen={openAiChat} onExternalClose={() => setOpenAiChat(false)} initialMessage={aiInitialMessage} onInitialMessageSent={() => setAiInitialMessage(null)} onSearchResults={(serpResults, totalCount) => {
        const formatted = serpResults.map(item => ({
          Id: item.asin,
          Title: item.title,
          MainPictureUrl: item.image,
          Price: { OriginalPrice: item.price, OriginalCurrencyCode: 'USD' },
          OldPrice: item.oldPrice,
          Rating: item.rating,
          Reviews: item.reviews,
          Url: item.link,
          Badge: item.badge,
          BoughtLastMonth: item.boughtLastMonth,
          isSerpApi: true,
        }))
        setResults(formatted)
        setTotalCount(totalCount || formatted.length)
        setSearched(true)
      }} />

      {/* ═══ Floating Bottom Bar - Image Search + AI Assistant ═══ */}
      {!selectedProduct && !showCart && !showFavorites && !openAiChat && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-32px)] max-w-md">
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl shadow-black/15 border border-slate-200/80 px-2 py-2 flex items-center gap-2">
            <button onClick={() => fileInputRef.current?.click()}
              className="flex-1 h-12 bg-gradient-to-r from-violet-500 to-indigo-600 rounded-xl flex items-center justify-center gap-2 active:scale-[0.96] transition-all shadow-md shadow-indigo-200/40">
              <Camera className="w-5 h-5 text-white" />
              <span className="text-[13px] font-bold text-white">بحث بالصورة</span>
            </button>
            <button onClick={() => setOpenAiChat(true)}
              className="flex-1 h-12 bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl flex items-center justify-center gap-2 active:scale-[0.96] transition-all shadow-md shadow-slate-400/30">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <span className="text-[13px] font-bold text-white">المساعد الذكي</span>
            </button>
          </div>
        </div>
      )}

  </div>
  )
}

// ─── Bottom Tab Bar Component ───
function BottomTabBar({ cartCount, favCount, onCartClick, onFavClick, onAiClick }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-gray-200/80" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="max-w-lg mx-auto flex items-center justify-around px-2 py-1.5">
        {/* السلة */}
        <button onClick={onCartClick} className="flex flex-col items-center gap-0.5 px-5 py-1.5 rounded-xl transition-all active:scale-90 group">
          <div className="relative">
            <svg className="w-6 h-6 text-gray-500 group-active:text-blue-600 transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
            </svg>
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">{cartCount}</span>
            )}
          </div>
          <span className="text-[10px] font-medium text-gray-500 group-active:text-blue-600">السلة</span>
        </button>

        {/* المفضلة */}
        <button onClick={onFavClick} className="flex flex-col items-center gap-0.5 px-5 py-1.5 rounded-xl transition-all active:scale-90 group">
          <div className="relative">
            <svg className="w-6 h-6 text-gray-500 group-active:text-pink-500 transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
            </svg>
            {favCount > 0 && (
              <span className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] bg-pink-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">{favCount}</span>
            )}
          </div>
          <span className="text-[10px] font-medium text-gray-500 group-active:text-pink-500">المفضلة</span>
        </button>

        {/* المساعد الذكي */}
        <button onClick={onAiClick} className="flex flex-col items-center gap-0.5 px-5 py-1.5 rounded-xl transition-all active:scale-90 group">
          <div className="relative">
            <svg className="w-6 h-6 text-gray-500 group-active:text-blue-600 transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
            </svg>
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">AI</span>
          </div>
          <span className="text-[10px] font-medium text-gray-500 group-active:text-blue-600">المساعد</span>
        </button>
      </div>
    </div>
  )
}

// ─── AI Chat Component ───
function AiChat({ provider, onSearchResults, externalOpen, onExternalClose, initialMessage, onInitialMessageSent }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const initialMsgSentRef = useRef(false)

  useEffect(() => {
    if (externalOpen) setOpen(true)
  }, [externalOpen])

  const closeChat = () => {
    setOpen(false)
    if (onExternalClose) onExternalClose()
  }

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: 'هلا! 👋 أنا مساعدك الذكي للتسوق.\nاكتب لي شنو تدور عليه وأساعدك تلاقيه بأفضل سعر! 🛍️'
      }])
    }
  }, [open])

  useEffect(() => {
    if (open && initialMessage && !initialMsgSentRef.current && !loading) {
      initialMsgSentRef.current = true
      setTimeout(() => {
        if (typeof initialMessage === 'object' && initialMessage.displayText) {
          sendMessage(initialMessage.displayText, initialMessage.context)
        } else if (typeof initialMessage === 'string') {
          sendMessage(initialMessage)
        }
        if (onInitialMessageSent) onInitialMessageSent()
        initialMsgSentRef.current = false
      }, 500)
    }
  }, [open, initialMessage])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  const sendMessage = async (directText, hiddenContext) => {
    const text = (typeof directText === 'string' ? directText : input).trim()
    if (!text || loading) return
    
    const userMsg = { role: 'user', content: text }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    const apiMessages = newMessages.filter(m => m.role !== 'system')
    if (hiddenContext) {
      apiMessages.push({ role: 'user', content: `[سياق المنتج - لا تعرضه للمستخدم، استخدمه فقط للإجابة]:\n${hiddenContext}` })
    }

    try {
      const res = await fetch('/.netlify/functions/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
        })
      })
      const data = await res.json()
      
      if (data.action === 'search' && data.searchQuery) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply + '\n\n🔍 جاري البحث...' }])
        // Search using existing amazon-serpapi function and show in main page
        try {
          const searchRes = await fetch(`/.netlify/functions/amazon-serpapi?action=search&query=${encodeURIComponent(data.searchQuery)}&page=1`)
          const searchData = await searchRes.json()
          if (searchData.success && searchData.results && searchData.results.length > 0 && onSearchResults) {
            onSearchResults(searchData.results, searchData.totalResults || searchData.results.length)
            setMessages(prev => {
              const updated = [...prev]
              updated[updated.length - 1] = { role: 'assistant', content: data.reply + '\n\n📦 تم عرض المنتجات في صفحة البحث!' }
              return updated
            })
            setTimeout(() => closeChat(), 1200)
          } else {
            setMessages(prev => {
              const updated = [...prev]
              updated[updated.length - 1] = { role: 'assistant', content: data.reply + '\n\n⚠️ لم يتم العثور على نتائج، جرب وصف مختلف.' }
              return updated
            })
          }
        } catch (searchErr) {
          console.error('Search error:', searchErr)
          setMessages(prev => {
            const updated = [...prev]
            updated[updated.length - 1] = { role: 'assistant', content: data.reply + '\n\n⚠️ حدث خطأ بالبحث.' }
            return updated
          })
        }
      } else if (data.reply) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'عذراً، حدث خطأ. حاول مرة ثانية 🙏' }])
    }
    setLoading(false)
  }

  const quickActions = [
    { label: '🎁 أبحث عن هدية', msg: 'أبي هدية حلوة' },
    { label: '💄 منتجات عناية', msg: 'أريد منتجات عناية بالبشرة' },
    { label: '💪 مكملات', msg: 'أريد فيتامينات ومكملات' },
    { label: '📱 إلكترونيات', msg: 'أبي سماعات أو أجهزة إلكترونية' },
  ]

  return (
    <>
      {/* Chat Window */}
      {open && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-white" dir="rtl">
          {/* Chat Header */}
          <div className="bg-gradient-to-l from-blue-500 to-blue-600 px-4 py-3 flex items-center gap-3 flex-shrink-0">
            <button onClick={closeChat} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <X className="w-4 h-4 text-white" />
            </button>
            <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-[14px] font-bold text-white">مساعد الشراء الذكي</p>
              <p className="text-[11px] text-blue-100">يساعدك تلاقي أفضل المنتجات</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50">
            {messages.map((msg, i) => (
              <div key={i}>
                <div className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-5 py-3 text-[15px] leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user' 
                      ? 'bg-blue-500 text-white rounded-tl-sm' 
                      : 'bg-white text-gray-800 shadow-sm border border-gray-100 rounded-tr-sm'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {loading && (
              <div className="flex justify-end">
                <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100 rounded-tr-sm">
                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Actions - only show at start */}
            {messages.length <= 1 && !loading && (
              <div className="flex flex-wrap gap-2 justify-end mt-2">
                {quickActions.map((a, i) => (
                  <button key={i}
                    onClick={() => sendMessage(a.msg)}
                    className="bg-white border border-gray-200 rounded-full px-3.5 py-2 text-[12px] text-gray-600 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-all active:scale-95 shadow-sm">
                    {a.label}
                  </button>
                ))}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="bg-white border-t border-gray-100 px-3 py-3 flex items-center gap-2 flex-shrink-0">
            <input
              ref={inputRef}
              type="text"
              dir="auto"
              placeholder="اكتب سؤالك هنا..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); sendMessage() } }}
              className="flex-1 h-11 px-4 bg-gray-100 rounded-full text-[14px] outline-none focus:bg-white focus:ring-2 focus:ring-blue-200 border border-gray-200 focus:border-blue-300 placeholder:text-gray-400"
            />
            <button 
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              className="w-11 h-11 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 rounded-full flex items-center justify-center transition-all active:scale-90 flex-shrink-0">
              {loading ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : <Send className="w-5 h-5 text-white" />}
            </button>
          </div>
        </div>
      )}

    </>
  )
}
