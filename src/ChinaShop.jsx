import { useState, useEffect, useRef } from 'react'
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

const API_KEY = 'ccaff9b1-804a-4041-8118-70ce26977867'
const PROXY_BASE = '/api/otapi-proxy'
const REST_BASE = 'https://rest.otapi.net/v1'

const PROVIDERS = {
  taobao: { key: 'Taobao', restKey: 'taobao', label: 'تاوباو', color: 'bg-orange-500', emoji: '淘宝', currency: 'CNY' },
  '1688': { key: 'Taobao', restKey: 'alibaba1688', label: '1688', color: 'bg-orange-600', emoji: '1688', currency: 'CNY' },
  amazon: { key: 'Amazon', restKey: 'amazon', label: 'أمازون', color: 'bg-gray-900', emoji: 'AZ', currency: 'USD', useSerpApi: true },
  shein: { key: 'Shein', restKey: 'shein', label: 'شين', color: 'bg-pink-500', emoji: 'SH', currency: 'USD' },
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

  const searchRef = useRef(null)
  const debounceRef = useRef(null)
  const PAGE_SIZE = 20

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
    
    // Shein: البحث عبر الموقع المباشر
    if (provider === 'shein') {
      setSheinUrl(`/.netlify/functions/shein-proxy-page?url=${encodeURIComponent('https://ar.shein.com/pdsearch/' + encodeURIComponent(query.trim()) + '/')}`)
      setSearched(true)
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
          const res = await fetch('/.netlify/functions/shein-scraper', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'get-product',
              productId: productId.replace('sh-', '')
            })
          })
          const data = await res.json()
          
          if (data.success && data.product) {
            // تحويل بيانات Shein للتنسيق الموحد
            const sheinItem = {
              Id: `sh-${data.product.id}`,
              Title: data.product.title,
              MainPictureUrl: data.product.image,
              Price: {
                OriginalPrice: parseFloat(data.product.price.replace(/[^0-9.]/g, '')) || 0,
                OriginalCurrencyCode: data.product.currency || 'USD'
              },
              OriginalPrice: parseFloat(data.product.originalPrice.replace(/[^0-9.]/g, '')) || 0,
              DiscountPrice: parseFloat(data.product.price.replace(/[^0-9.]/g, '')) || 0,
              Images: data.product.images || [],
              Url: `https://ar.shein.com/p-${data.product.id}.html`,
              Description: data.product.description || '',
              isScraped: true
            }
            setSelectedProduct(sheinItem)
            setProductDetail(data.product)
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

  const updateQty = (uniqueId, delta) => {
    setCart(cart.map(c => {
      if (c.uniqueId !== uniqueId) return c
      const newQty = c.qty + delta
      return newQty > 0 ? { ...c, qty: newQty } : c
    }).filter(c => c.qty > 0))
  }

  const removeFromCart = (uniqueId) => {
    setCart(cart.filter(c => c.uniqueId !== uniqueId))
  }

  const cartTotal = cart.reduce((sum, c) => sum + c.priceIqd * c.qty, 0)
  const cartCount = cart.reduce((sum, c) => sum + c.qty, 0)
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  const formatNum = (n) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')

  // ─── Product Detail View ───
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
      <div className="min-h-screen bg-white pb-20" dir="rtl">
        {/* Floating Header */}
        <header className="fixed top-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-100/50">
          <div className="max-w-2xl mx-auto px-4 h-12 flex items-center justify-between">
            <button onClick={() => setSelectedProduct(null)} className="w-9 h-9 bg-gray-100/80 backdrop-blur rounded-full flex items-center justify-center hover:bg-gray-200/80 transition-all active:scale-95">
              <ArrowRight className="w-5 h-5 text-gray-700" />
            </button>
            <p className="text-[13px] font-semibold text-gray-600 truncate max-w-[45%]">{item.Title?.substring(0, 25)}</p>
            <div className="flex items-center gap-1.5">
              <button onClick={() => toggleFavorite(item)} className="w-9 h-9 bg-gray-100/80 backdrop-blur rounded-full flex items-center justify-center hover:bg-gray-200/80 transition-all active:scale-95">
                <Heart className={`w-[18px] h-[18px] ${isFavorite(item.Id) ? 'text-red-500 fill-red-500' : 'text-gray-600'}`} />
              </button>
              <button onClick={() => setShowCart(true)} className="relative w-9 h-9 bg-gray-100/80 backdrop-blur rounded-full flex items-center justify-center hover:bg-gray-200/80 transition-all active:scale-95">
                <ShoppingCart className="w-[18px] h-[18px] text-gray-600" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">{cartCount}</span>
                )}
              </button>
            </div>
          </div>
        </header>

        {/* Loading Detail - Skeleton */}
        {loadingDetail && (
          <div className="max-w-2xl mx-auto pt-14 px-4">
            <ProductSkeleton />
          </div>
        )}

        <div className={`max-w-2xl mx-auto pt-12 pb-28 ${loadingDetail ? 'hidden' : ''}`}>
          {/* Image Gallery - Full bleed */}
          <div className="relative bg-gradient-to-b from-gray-50 to-white aspect-square overflow-hidden">
            {pics.length > 0 ? (
              <>
                <img src={pics[activeImage]?.Large?.Url || pics[activeImage]?.Url} alt="" className="w-full h-full object-contain p-6" />
                {/* Thumbnail strip */}
                {pics.length > 1 && (
                  <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2 px-4">
                    {pics.slice(0, 6).map((pic, i) => (
                      <button key={i} onClick={() => setActiveImage(i)}
                        className={`w-12 h-12 rounded-xl overflow-hidden border-2 transition-all ${i === activeImage ? 'border-blue-500 shadow-lg shadow-blue-200/50 scale-110' : 'border-white/80 shadow-sm opacity-70'}`}>
                        <img src={pic.Large?.Url || pic.Url} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : item.MainPictureUrl ? (
              <img src={item.MainPictureUrl} alt="" className="w-full h-full object-contain p-6" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-50">
                <Package className="w-20 h-20 text-gray-200" />
              </div>
            )}
            {/* Discount badge */}
            {discountPercent > 0 && (
              <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1.5 rounded-xl text-sm font-black shadow-lg shadow-red-200/50">
                -{discountPercent}%
              </div>
            )}
            {/* Image counter */}
            {pics.length > 1 && (
              <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-sm text-white text-[11px] font-bold px-2.5 py-1 rounded-lg">
                {activeImage + 1}/{pics.length}
              </div>
            )}
          </div>

          {/* Price + Title Card */}
          <div className="px-5 py-5">
            {/* Provider + Rating row */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[11px] font-bold bg-blue-50 text-blue-600 px-2.5 py-1 rounded-lg">{provLabel}</span>
              {(item.Rating > 0 || reviews) && (
                <div className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  <span className="text-[12px] text-gray-600 font-semibold">{item.Rating || 0}</span>
                  {reviews && <span className="text-[11px] text-gray-400">({formatNum(reviews)})</span>}
                </div>
              )}
              {sales && parseInt(sales) > 100 && (
                <span className="text-[11px] text-gray-400">{formatNum(sales)} مبيعة</span>
              )}
            </div>
            
            <h1 className="text-[17px] font-bold text-gray-800 leading-[1.6]">{item.Title}</h1>
            {item.Badge && (
              <p className="text-[13px] text-gray-400 mt-1.5">{item.Badge}</p>
            )}

            {/* Price */}
            <div className="mt-4 bg-gradient-to-l from-orange-50 via-amber-50 to-yellow-50 rounded-2xl p-4 border border-orange-100/50">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-[11px] text-gray-400 font-medium mb-0.5">السعر</p>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-black text-gray-900">{formatNum(iqd)}</span>
                    <span className="text-sm font-bold text-gray-500">د.ع</span>
                  </div>
                  {item.OldPrice > 0 && item.OldPrice > (item.Price?.OriginalPrice || 0) && (
                    <span className="text-sm text-gray-400 line-through">{formatNum(applyCommission(Math.round(item.OldPrice * (prov.currency === 'USD' ? USD_TO_IQD : USD_TO_IQD / CNY_TO_USD))))} د.ع</span>
                  )}
                </div>
              </div>
              {(item.BoughtLastMonth || productDetail?.boughtLastMonth) && (
                <div className="mt-3 pt-3 border-t border-orange-200/50 flex items-center gap-2">
                  <span className="text-[12px] text-orange-600 font-bold flex items-center gap-1"><Flame className="w-3.5 h-3.5" /> {item.BoughtLastMonth || productDetail?.boughtLastMonth} اشتروه الشهر الماضي</span>
                </div>
              )}
            </div>
          </div>

          {/* AI Explain Button */}
          <div className="px-5 pb-4">
            <button onClick={() => {
              setShowExplainSheet(true)
              setExplainMessages([])
              const ctx = `اشرح هذا المنتج بالعربي العراقي بشكل مبسط وواضح. اذكر: شنو هذا المنتج، فوائده الرئيسية، ولمن مناسب. لا تسأل المستخدم أي سؤال، اشرح مباشرة:\n\nProduct: ${item.Title}\nPrice: ${formatNum(iqd)} IQD\nRating: ${item.Rating || 'N/A'}${item.Badge ? `\nBadge: ${item.Badge}` : ''}${reviews ? `\nReviews count: ${reviews}` : ''}${item.BoughtLastMonth ? `\nBought last month: ${item.BoughtLastMonth}` : ''}`
              askExplain('اشرح لي هذا المنتج', ctx)
            }} className="w-full flex items-center justify-center gap-3 bg-gradient-to-l from-blue-500 to-indigo-600 rounded-2xl px-5 py-4 active:scale-[0.97] transition-all shadow-lg shadow-blue-200/50">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
                </svg>
              </div>
              <div className="text-right">
                <p className="text-[15px] font-bold text-white">اشرح لي هذا المنتج</p>
                <p className="text-[11px] text-blue-100">وصف بالعربي + أسئلة إضافية</p>
              </div>
              <ChevronLeft className="w-5 h-5 text-white/70 mr-auto" />
            </button>
          </div>

          {/* Variants / Options */}
          {((productDetail?.Configurators && productDetail.Configurators.length > 0) || (productDetail?.variants && productDetail.variants.length > 0)) && (
            <div className="px-5 pb-5">
              <div className="bg-gray-50 rounded-2xl p-4">
                <h3 className="text-[15px] font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <span className="w-1 h-5 bg-blue-500 rounded-full"></span>
                  الخيارات المتاحة
                </h3>

                {/* OT API Configurators */}
                {productDetail?.Configurators && productDetail.Configurators.map(cfg => (
                  <div key={cfg.Pid} className="mb-5 last:mb-0">
                    <p className="text-[13px] font-semibold text-gray-500 mb-3">{cfg.Name || 'خيار'}</p>
                    <div className="flex gap-2.5 overflow-x-auto pb-2">
                      {(cfg.Values || []).map(val => {
                        const isSelected = selectedConfigs[cfg.Pid] === val.Vid
                        return (
                          <button key={val.Vid}
                            onClick={() => setSelectedConfigs(prev => ({ ...prev, [cfg.Pid]: isSelected ? undefined : val.Vid }))}
                            className={`flex-shrink-0 rounded-2xl border-2 overflow-hidden transition-all active:scale-95 ${
                              isSelected ? 'border-blue-500 bg-blue-50 shadow-md shadow-blue-100/50' : 'border-gray-200 bg-white hover:border-gray-300'
                            } ${val.ImageUrl ? 'w-[110px]' : 'px-4 py-2.5'}`}>
                            {val.ImageUrl && (
                              <div className="w-full h-[80px] bg-white">
                                <img src={val.ImageUrl} alt="" className="w-full h-full object-contain p-1.5" />
                              </div>
                            )}
                            <div className={`${val.ImageUrl ? 'p-2' : ''} text-center`}>
                              <p className={`text-[12px] font-medium line-clamp-2 ${isSelected ? 'text-blue-700' : 'text-gray-600'}`}>{val.Name || val.Value || `#${val.Vid}`}</p>
                              {isSelected && <CheckCircle2 className="w-4 h-4 text-blue-500 mx-auto mt-1" />}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}

                {/* Amazon Variants */}
                {productDetail?.variants && productDetail.variants.map((variant, vi) => (
                  <div key={vi} className="mb-5 last:mb-0">
                    <p className="text-[13px] font-semibold text-gray-500 mb-3">{variant.title || 'خيار'}</p>
                    <div className="flex gap-2.5 overflow-x-auto pb-2">
                      {(variant.items || []).map((opt, oi) => {
                        const isLoading = loadingVariant === opt.asin
                        const isCurrent = opt.selected || opt.asin === item.Id
                        return (
                          <button key={opt.asin || oi}
                            disabled={isLoading || !!loadingVariant}
                            onClick={() => { if (opt.asin && !isCurrent) loadAmazonVariant(opt.asin) }}
                            className={`flex-shrink-0 px-4 py-2.5 rounded-2xl border-2 transition-all active:scale-95 ${
                              isCurrent ? 'border-blue-500 bg-blue-50 shadow-md shadow-blue-100/50'
                                : isLoading ? 'border-blue-300 bg-blue-50/50 animate-pulse'
                                : loadingVariant ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                                : 'border-gray-200 bg-white hover:border-gray-300'
                            }`}>
                            {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500 mx-auto mb-1" />}
                            <p className={`text-[12px] font-medium line-clamp-2 ${isCurrent ? 'text-blue-700' : 'text-gray-600'}`}>{opt.name || opt.asin}</p>
                            {isCurrent && <CheckCircle2 className="w-4 h-4 text-blue-500 mx-auto mt-1" />}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Store Info */}
          <div className="mx-5 mb-4 bg-gradient-to-l from-gray-50 to-gray-100/50 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-white rounded-xl flex items-center justify-center shadow-sm border border-gray-100">
                <ShoppingCart className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="text-[13px] font-bold text-gray-800">{item.VendorDisplayName || provLabel}</p>
                <p className="text-[11px] text-gray-400">متجر موثوق</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-blue-500">
              <span className="text-[12px] font-semibold">زيارة</span>
              <ChevronLeft className="w-4 h-4" />
            </div>
          </div>

          {/* Product Info Tags */}
          <div className="px-5 mb-4">
            <div className="flex gap-2 overflow-x-auto pb-1">
              <div className="flex items-center gap-1.5 bg-emerald-50 rounded-xl px-3.5 py-2.5 border border-emerald-100 flex-shrink-0">
                <span className="text-[11px]">✅</span>
                <span className="text-[12px] text-emerald-700 font-semibold">
                  {productDetail?.stock === 'In Stock' || !productDetail?.stock ? 'متوفر' : 'غير متوفر'}
                </span>
              </div>
              {item.Id && (
                <div className="flex items-center gap-1.5 bg-gray-50 rounded-xl px-3.5 py-2.5 border border-gray-100 flex-shrink-0">
                  <span className="text-[12px] text-gray-500 font-medium">SKU: {item.Id.substring(0, 12)}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 bg-blue-50 rounded-xl px-3.5 py-2.5 border border-blue-100 flex-shrink-0">
                <Truck className="w-3.5 h-3.5 text-blue-500" />
                <span className="text-[12px] text-blue-700 font-semibold">شحن دولي</span>
              </div>
            </div>
          </div>

          {/* Description section */}
          {(productDetail?.Description || (productDetail?.FeatureBullets && productDetail.FeatureBullets.length > 0)) && (
            <div className="mx-5 mb-4 bg-gray-50 rounded-2xl p-5">
              <h3 className="text-[15px] font-bold text-gray-800 mb-4 flex items-center gap-2">
                <span className="w-1 h-5 bg-blue-500 rounded-full"></span>
                وصف المنتج
              </h3>

              {/* Feature Bullets */}
              {productDetail?.FeatureBullets && productDetail.FeatureBullets.length > 0 && (
                <div className="space-y-2.5 mb-4">
                  {productDetail.FeatureBullets.map((bullet, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2 flex-shrink-0"></span>
                      <p className="text-[13px] text-gray-600 leading-relaxed">{bullet}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Description text */}
              {productDetail?.Description && (
                <p className="text-[13px] text-gray-500 leading-[1.9]">
                  {productDetail.Description}
                </p>
              )}
            </div>
          )}

          {/* Description Images */}
          {pics.length > 2 && (
            <div className="mx-5 mb-4 rounded-2xl overflow-hidden">
              {pics.slice(2).map((p, i) => (
                <img key={i} src={p.Large?.Url || p.Url} alt="" className="w-full" loading="lazy" />
              ))}
            </div>
          )}

          {/* Related Products */}
          {productDetail?.relatedProducts && productDetail.relatedProducts.length > 0 && (
            <div className="px-5 pb-5">
              <h3 className="text-[15px] font-bold text-gray-800 mb-4 flex items-center gap-2">
                <span className="w-1 h-5 bg-orange-500 rounded-full"></span>
                منتجات قد تعجبك
              </h3>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {productDetail.relatedProducts.map((rp, i) => {
                  const rpPrice = rp.price ? formatPrice({ OriginalPrice: rp.price, OriginalCurrencyCode: 'USD' }, 'USD') : null
                  return (
                    <button key={rp.asin || i}
                      onClick={() => { if (rp.asin) loadProductById(rp.asin, 'amazon') }}
                      className="flex-shrink-0 w-[140px] bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all active:scale-[0.97]">
                      <div className="w-full h-[120px] bg-gray-50 relative">
                        {rp.image && <img src={rp.image} alt="" className="w-full h-full object-contain p-2" />}
                      </div>
                      <div className="p-2.5">
                        <p className="text-[11px] text-gray-600 line-clamp-2 leading-snug font-medium mb-2">{rp.title}</p>
                        {rpPrice && (
                          <p className="text-[13px] font-bold text-gray-900">{formatNum(rpPrice.iqd)} <span className="text-[10px] text-gray-400 font-normal">د.ع</span></p>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Toast */}
        {addedToast && (
          <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50">
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

        <ExplainSheet show={showExplainSheet} onClose={() => setShowExplainSheet(false)} productTitle={item.Title} messages={explainMessages} loading={explainLoading} onAskExplain={(q) => askExplain(q)} />

        {/* Fixed Bottom Bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-gray-100 z-30">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
            {/* Price summary */}
            <div className="flex-shrink-0">
              <p className="text-[11px] text-gray-400">المجموع</p>
              <p className="text-lg font-black text-gray-900">{formatNum(iqd * (inCart?.qty || 1))} <span className="text-[11px] text-gray-400 font-normal">د.ع</span></p>
            </div>
            {inCart ? (
              <>
                <div className="flex items-center bg-gray-100 rounded-xl overflow-hidden">
                  <button onClick={() => updateQty(item.Id, -1)} className="w-9 h-9 flex items-center justify-center hover:bg-gray-200 transition active:scale-90">
                    <Minus className="w-4 h-4 text-gray-600" />
                  </button>
                  <span className="w-7 text-center text-sm font-bold text-gray-800">{inCart.qty}</span>
                  <button onClick={() => updateQty(item.Id, 1)} className="w-9 h-9 flex items-center justify-center hover:bg-gray-200 transition active:scale-90">
                    <Plus className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
                <button onClick={() => setShowCart(true)}
                  className="flex-1 h-12 bg-gradient-to-l from-blue-600 to-blue-700 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.97] shadow-lg shadow-blue-200/50">
                  <ShoppingCart className="w-5 h-5" />
                  عرض السلة
                </button>
              </>
            ) : (
              <button onClick={() => addToCart(item)}
                className="flex-1 h-12 bg-gradient-to-l from-blue-600 to-blue-700 text-white rounded-2xl font-bold text-[15px] flex items-center justify-center gap-2.5 transition-all active:scale-[0.97] shadow-lg shadow-blue-200/50">
                <Plus className="w-5 h-5" />
                أضف إلى السلة
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  
  // ─── Search & Results View ───
  const categories = provider === 'amazon'
    ? [
        { img: 'https://cdn-icons-png.flaticon.com/128/3659/3659899.png', label: 'إلكترونيات', q: 'electronics', bg: 'bg-blue-50' },
        { img: 'https://cdn-icons-png.flaticon.com/128/2589/2589903.png', label: 'أحذية', q: 'shoes', bg: 'bg-orange-50' },
        { img: 'https://cdn-icons-png.flaticon.com/128/679/679922.png', label: 'حقائب', q: 'bags', bg: 'bg-amber-50' },
        { img: 'https://cdn-icons-png.flaticon.com/128/1940/1940922.png', label: 'جمال', q: 'beauty', bg: 'bg-pink-50' },
        { img: 'https://cdn-icons-png.flaticon.com/128/3159/3159960.png', label: 'مكملات', q: 'supplements vitamins', bg: 'bg-green-50' },
        { img: 'https://cdn-icons-png.flaticon.com/128/1261/1261163.png', label: 'منزل', q: 'home kitchen', bg: 'bg-teal-50' },
        { img: 'https://cdn-icons-png.flaticon.com/128/2972/2972531.png', label: 'ساعات', q: 'watches', bg: 'bg-gray-100' },
        { img: 'https://cdn-icons-png.flaticon.com/128/3163/3163186.png', label: 'رياضة', q: 'sports fitness', bg: 'bg-emerald-50' },
      ]
    : provider === '1688'
    ? [
        { img: 'https://cdn-icons-png.flaticon.com/128/863/863684.png', label: 'أزياء', q: 'ملابس', bg: 'bg-purple-50' },
        { img: 'https://cdn-icons-png.flaticon.com/128/2589/2589903.png', label: 'أحذية', q: 'أحذية', bg: 'bg-orange-50' },
        { img: 'https://cdn-icons-png.flaticon.com/128/679/679922.png', label: 'حقائب', q: 'حقائب', bg: 'bg-amber-50' },
        { img: 'https://cdn-icons-png.flaticon.com/128/1940/1940922.png', label: 'جمال', q: 'مكياج', bg: 'bg-pink-50' },
        { img: 'https://cdn-icons-png.flaticon.com/128/3659/3659899.png', label: 'إلكترونيات', q: 'إلكترونيات', bg: 'bg-blue-50' },
        { img: 'https://cdn-icons-png.flaticon.com/128/3082/3082044.png', label: 'ألعاب', q: 'العاب اطفال', bg: 'bg-red-50' },
      ]
    : [
        { img: 'https://cdn-icons-png.flaticon.com/128/863/863684.png', label: 'أزياء', q: 'فساتين', bg: 'bg-purple-50' },
        { img: 'https://cdn-icons-png.flaticon.com/128/2589/2589903.png', label: 'أحذية', q: 'أحذية', bg: 'bg-orange-50' },
        { img: 'https://cdn-icons-png.flaticon.com/128/679/679922.png', label: 'حقائب', q: 'حقائب', bg: 'bg-amber-50' },
        { img: 'https://cdn-icons-png.flaticon.com/128/1940/1940922.png', label: 'جمال', q: 'عطور', bg: 'bg-pink-50' },
        { img: 'https://cdn-icons-png.flaticon.com/128/3659/3659899.png', label: 'إلكترونيات', q: 'سماعات', bg: 'bg-blue-50' },
        { img: 'https://cdn-icons-png.flaticon.com/128/3082/3082044.png', label: 'ألعاب', q: 'العاب اطفال', bg: 'bg-red-50' },
      ]

  const provColor = provider === 'amazon' ? 'from-gray-800 to-gray-900' : provider === 'shein' ? 'from-pink-500 to-pink-600' : 'from-orange-500 to-orange-600'
  const provAccent = provider === 'amazon' ? 'bg-amber-500' : provider === 'shein' ? 'bg-pink-500' : 'bg-orange-500'

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
    <div className="min-h-screen bg-gray-50 pb-20" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 py-2.5">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-100 transition-all active:scale-95 flex-shrink-0">
              <ArrowRight className="w-5 h-5 text-gray-600" />
            </button>
            {/* Provider Logo */}
            <div className="flex-1 flex items-center justify-center">
              {provider === 'amazon' ? (
                <div className="flex items-center gap-0">
                  <span className="text-[20px] font-black text-gray-900 tracking-tight" style={{ fontFamily: 'Arial, sans-serif' }}>amazon</span>
                  <svg viewBox="0 0 40 16" className="w-8 h-3 mt-1" fill="none"><path d="M2 8C8 14 16 16 24 12C28 10 32 7 38 6" stroke="#FF9900" strokeWidth="3" strokeLinecap="round" fill="none"/><path d="M30 2L38 6L30 8" fill="#FF9900"/></svg>
                </div>
              ) : (
                <h1 className="text-[16px] font-black text-gray-900 tracking-tight">{prov.label}</h1>
              )}
            </div>
            <button onClick={() => setShowCart(true)} className="relative w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-100 transition-all active:scale-95 flex-shrink-0">
              <ShoppingCart className="w-5 h-5 text-gray-600" />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">{cartCount}</span>
              )}
            </button>
          </div>
        </div>
      </header>

      <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleImageUpload} />

      <div className="max-w-3xl mx-auto">
        {/* Search Section */}
        <div className="bg-white px-4 pt-4 pb-2">
          {/* Smart Search Bar */}
          <div className="relative">
            <Search className="w-[18px] h-[18px] absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 z-10" />
            <input
              ref={searchRef}
              type="text"
              dir="auto"
              placeholder={provider === 'amazon' ? 'بحث أو لصق رابط منتج...' : `بحث أو لصق رابط منتج...`}
              value={query}
              onChange={e => handleSmartInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); const t = query.trim(); if (isUrl(t)) { setUrlInput(t); setTimeout(() => handleUrlSearch(), 50) } else { doSearch(0) } } }}
              className="w-full h-12 pl-11 pr-12 bg-gray-100 rounded-2xl text-[14px] outline-none transition-all focus:bg-white focus:ring-2 focus:ring-gray-300 border border-gray-200 focus:border-gray-400 placeholder:text-gray-400"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {query ? (
                <button onClick={() => { setQuery(''); setUrlInput(''); setUrlError(''); setSearched(false); setResults([]); searchRef.current?.focus() }} className="p-1.5 hover:bg-gray-200 rounded-full transition">
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              ) : (
                <button onClick={() => fileInputRef.current?.click()} className="p-1.5 hover:bg-gray-200 rounded-full transition" title="بحث بالصورة">
                  <Camera className="w-5 h-5 text-gray-500" />
                </button>
              )}
            </div>
          </div>
          {/* Smart hint */}
          {!searched && !loading && !query && (
            <div className="flex items-center justify-center gap-3 mt-2 text-[11px] text-gray-400">
              <span className="flex items-center gap-1"><Search className="w-3 h-3" /> اكتب للبحث</span>
              <span>·</span>
              <span className="flex items-center gap-1"><LinkIcon className="w-3 h-3" /> ألصق رابط</span>
              <span>·</span>
              <span className="flex items-center gap-1"><Camera className="w-3 h-3" /> صورة</span>
            </div>
          )}
          {isUrl(query.trim()) && !loading && (
            <div className="flex items-center gap-2 mt-2 px-1">
              <LinkIcon className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
              <span className="text-[11px] text-blue-600">تم الكشف عن رابط - اضغط Enter لفتح المنتج</span>
            </div>
          )}
          {urlError && <p className="text-[11px] text-red-500 mt-1.5 px-1">{urlError}</p>}
          {/* Categories - Grid */}
          {!searched && !loading && provider !== 'shein' && (
            <div className="mt-5 pb-2">
              <div className="grid grid-cols-4 gap-3">
                {categories.map(cat => (
                  <button key={cat.label}
                    onClick={() => { setQuery(cat.q); doSearch(0) }}
                    className="flex flex-col items-center gap-2 active:scale-95 transition-all">
                    <div className={`w-16 h-16 rounded-full ${cat.bg} flex items-center justify-center shadow-sm border border-gray-100`}>
                      <img src={cat.img} alt={cat.label} className="w-9 h-9 object-contain" loading="lazy" />
                    </div>
                    <span className="text-[11px] font-semibold text-gray-700">{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Provider Toggle */}
        {(provider === 'taobao' || provider === '1688') && !searched && !loading && (
          <div className="flex gap-2 mx-4 mt-3">
            <button onClick={() => navigate('/china/taobao')}
              className={`flex-1 h-10 rounded-xl flex items-center justify-center gap-2 font-bold text-[12px] transition-all active:scale-[0.97] ${
                provider === 'taobao' ? 'bg-orange-500 text-white' : 'bg-white text-gray-500 border border-gray-200'
              }`}>
              <ShoppingBag className="w-3.5 h-3.5" />
              Taobao
            </button>
            <button onClick={() => navigate('/china/1688')}
              className={`flex-1 h-10 rounded-xl flex items-center justify-center gap-2 font-bold text-[12px] transition-all active:scale-[0.97] ${
                provider === '1688' ? 'bg-orange-500 text-white' : 'bg-white text-gray-500 border border-gray-200'
              }`}>
              <Package className="w-3.5 h-3.5" />
              1688
            </button>
          </div>
        )}

        {/* Popular Products */}
        {!searched && !loading && !urlLoading && popularProducts.length > 0 && (
          <div className="mt-4 px-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[14px] font-bold text-gray-800 flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-orange-500" /> الأكثر رواجاً
              </h3>
              <span className="text-[11px] text-gray-400">{popularProducts.length} منتج</span>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {popularProducts.map(pp => (
                <div key={pp.id}
                  onClick={() => loadProductById(pp.product_id, pp.provider)}
                  className="bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-md transition-all cursor-pointer active:scale-[0.97]">
                  <div className="relative aspect-square bg-gray-50 overflow-hidden">
                    <img src={pp.image} alt={pp.title} className="w-full h-full object-contain p-3" loading="lazy"
                      onError={e => { e.target.style.display = 'none' }} />
                    {pp.search_count > 3 && (
                      <span className="absolute top-2 right-2 text-[9px] bg-red-500/90 backdrop-blur-sm text-white px-1.5 py-0.5 rounded-md font-bold flex items-center gap-0.5"><Flame className="w-2.5 h-2.5" /> رائج</span>
                    )}
                  </div>
                  <div className="p-2.5">
                    <p className="text-[11px] text-gray-600 font-medium line-clamp-2 min-h-[30px] leading-snug">{pp.title}</p>
                    <p className="text-[14px] font-black text-gray-900 mt-1.5">
                      {formatNum(pp.price_iqd)}
                      <span className="text-[9px] text-gray-400 font-normal mr-0.5">د.ع</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Shein iframe */}
        {provider === 'shein' && !selectedProduct && !urlLoading && (
          <div className="mx-4 mt-4 bg-white rounded-2xl border border-pink-200 overflow-hidden shadow-lg">
            <div className="bg-gradient-to-r from-pink-500 to-pink-600 text-white px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xl font-black">SHEIN</span>
                <span className="text-xs opacity-80">الموقع العربي</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setSheinUrl('/.netlify/functions/shein-proxy-page?url=' + encodeURIComponent('https://ar.shein.com'))}
                  className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-colors">
                  <Home className="w-3.5 h-3.5 inline" /> الرئيسية
                </button>
                <button onClick={() => setShowCart(true)}
                  className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
                  <ShoppingCart className="w-3.5 h-3.5 inline" /> السلة ({cart.length})
                </button>
              </div>
            </div>
            <div className="relative" style={{ height: 'calc(100vh - 200px)', minHeight: '500px' }}>
              <iframe src={sheinUrl} className="w-full h-full border-0" title="Shein Arabic" loading="lazy" />
            </div>
            <div className="bg-gray-50 border-t border-pink-100 p-3">
              <p className="text-xs text-gray-500 text-center flex items-center justify-center gap-1"><Lightbulb className="w-3.5 h-3.5" /> انسخ رابط المنتج من الموقع وألصقه في البحث</p>
            </div>
          </div>
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
              <h3 className="text-[15px] font-bold text-gray-800 flex items-center gap-2">
                <span className="w-1 h-5 bg-blue-500 rounded-full"></span>
                نتائج البحث بالصورة
              </h3>
              <span className="text-[12px] text-gray-400 bg-gray-100 px-2.5 py-1 rounded-lg">{imageResults.length} نتيجة</span>
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
                  className="bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-lg transition-all cursor-pointer active:scale-[0.97]">
                  <div className="relative aspect-square bg-gray-50 overflow-hidden">
                    <img src={item.image} alt={item.title} className="w-full h-full object-contain p-3" loading="lazy"
                      onError={e => { e.target.style.display = 'none' }} />
                    <span className="absolute top-2 right-2 text-[9px] bg-gray-900/80 backdrop-blur-sm text-white px-2 py-0.5 rounded-lg font-bold">Amazon</span>
                  </div>
                  <div className="p-3">
                    <p className="text-[12px] text-gray-700 font-medium line-clamp-2 mb-2 leading-snug">{item.title}</p>
                    {item.price > 0 && (
                      <p className="text-[14px] font-black text-gray-900">{formatNum(applyCommission(Math.round(item.price * USD_TO_IQD)))} <span className="text-[10px] text-gray-400 font-normal">د.ع</span></p>
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
              <h3 className="text-[15px] font-bold text-gray-800">
                {totalCount > 0 ? (
                  <span className="flex items-center gap-2">
                    <span className="w-1 h-5 bg-orange-500 rounded-full"></span>
                    {formatNum(totalCount)} نتيجة
                  </span>
                ) : 'لا توجد نتائج'}
              </h3>
              {totalCount > 0 && (
                <span className="text-[12px] text-gray-400 bg-gray-100 px-2.5 py-1 rounded-lg">صفحة {page + 1}</span>
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
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}>
                    {s.label}
                  </button>
                ))}
              </div>
            )}

            {results.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-gray-300" />
                </div>
                <p className="text-sm font-bold text-gray-500">لم نجد نتائج لـ "{query}"</p>
                <p className="text-[12px] text-gray-400 mt-1">جرب كلمات بحث مختلفة</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {results.map(item => {
                  const price = formatPrice(item.Price, prov.currency)
                  const iqd = price.iqd
                  const inCart = cart.find(c => c.id === item.Id && Object.keys(c.selectedOptions || {}).length === Object.keys(selectedConfigs || {}).length)
                  const sales = item.FeaturedValues?.find(f => f.Name === 'SalesInLast30Days')?.Value

                  if (item.isIframe) return null

                  return (
                    <div key={item.Id}
                      className="bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-lg transition-all cursor-pointer active:scale-[0.97]"
                      onClick={() => loadProductDetail(item)}>
                      {/* Image */}
                      <div className="relative aspect-square bg-gradient-to-b from-gray-50 to-white overflow-hidden">
                        {item.MainPictureUrl ? (
                          <img src={item.MainPictureUrl} alt="" className="w-full h-full object-contain p-3" loading="lazy" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-10 h-10 text-gray-200" />
                          </div>
                        )}
                        {/* Provider badge */}
                        <span className={`absolute top-2.5 right-2.5 text-[9px] ${prov.color}/90 backdrop-blur-sm text-white px-2 py-0.5 rounded-lg font-bold`}>
                          {prov.label}
                        </span>
                        {/* Favorite button */}
                        <button onClick={(e) => { e.stopPropagation(); toggleFavorite(item) }}
                          className="absolute top-2.5 left-2.5 w-8 h-8 bg-white/80 backdrop-blur rounded-full flex items-center justify-center shadow-sm active:scale-90 transition-all z-10">
                          <Heart className={`w-4 h-4 ${isFavorite(item.Id) ? 'text-red-500 fill-red-500' : 'text-gray-400'}`} />
                        </button>
                        {inCart && (
                          <div className="absolute top-12 left-2.5 w-6 h-6 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm z-10">
                            <span className="text-white text-[10px] font-bold">{inCart.qty}</span>
                          </div>
                        )}
                        {sales && parseInt(sales) > 1000 && (
                          <span className="absolute bottom-2.5 left-2.5 bg-red-500/90 backdrop-blur-sm text-white text-[9px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-0.5"><Flame className="w-3 h-3" /> HOT</span>
                        )}
                      </div>
                      {/* Info */}
                      <div className="p-3">
                        <p className="text-[12px] text-gray-700 font-medium line-clamp-2 min-h-[34px] leading-snug">{item.Title}</p>
                        <div className="mt-2.5 flex items-end justify-between">
                          <p className="text-[15px] font-black text-gray-900">
                            {formatNum(iqd)}
                            <span className="text-[10px] text-gray-400 font-normal mr-0.5">د.ع</span>
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
                  className="w-11 h-11 rounded-xl bg-gray-100 flex items-center justify-center disabled:opacity-30 hover:bg-gray-200 transition-all active:scale-95">
                  <ChevronRight className="w-5 h-5 text-gray-600" />
                </button>
                <div className="bg-gray-100 rounded-xl px-4 py-2.5">
                  <span className="text-[13px] text-gray-700 font-bold">{page + 1} / {Math.min(totalPages, 100)}</span>
                </div>
                <button onClick={() => doSearch(page + 1)} disabled={page >= totalPages - 1 || page >= 99}
                  className="w-11 h-11 rounded-xl bg-gray-100 flex items-center justify-center disabled:opacity-30 hover:bg-gray-200 transition-all active:scale-95">
                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Toast */}
      {addedToast && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50">
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
        <div className="fixed inset-0 z-50 flex flex-col bg-white" dir="rtl">
          <div className="bg-white flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-100 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">سلة التسوق</h3>
                <p className="text-[12px] text-gray-400">{cartCount} منتج</p>
              </div>
            </div>
            <button onClick={() => setShowCart(false)} className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-all active:scale-95">
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {cart.length === 0 ? (
              <div className="text-center py-32 px-6">
                <div className="w-24 h-24 bg-gray-100 rounded-3xl flex items-center justify-center mx-auto mb-5">
                  <ShoppingCart className="w-12 h-12 text-gray-300" />
                </div>
                <p className="text-lg font-bold text-gray-600">السلة فارغة</p>
                <p className="text-sm text-gray-400 mt-2">أضف منتجات للبدء بالتسوق</p>
                <button onClick={() => setShowCart(false)} className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold text-sm active:scale-95 transition-all">
                  تصفح المنتجات
                </button>
              </div>
            ) : (
              <div className="p-4 space-y-3 pb-6">
                {cart.map(c => (
                  <div key={c.uniqueId || c.id} className="flex gap-3 bg-white rounded-2xl p-3 border border-gray-100 shadow-sm">
                    <img src={c.image} alt="" className="w-20 h-20 rounded-xl object-cover flex-shrink-0 bg-gray-50" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-gray-700 line-clamp-2 leading-snug">{c.title}</p>
                      <span className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md font-semibold inline-block mt-1">{c.providerLabel}</span>
                      
                      {c.selectedOptions && Object.keys(c.selectedOptions).length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {Object.entries(c.selectedOptions).map(([pid, vid]) => {
                            const config = productDetail?.Configurators?.find(cfg => cfg.Pid === pid)
                            const value = config?.Values?.find(v => v.Vid === vid)
                            return (
                              <span key={`${pid}-${vid}`} className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-md">
                                {config?.Name}: {value?.Name || value?.Value || vid}
                              </span>
                            )
                          })}
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[14px] font-black text-gray-900">{formatNum(c.priceIqd * c.qty)} <span className="text-[10px] text-gray-400 font-normal">د.ع</span></span>
                        <div className="flex items-center gap-2">
                          <button onClick={() => updateQty(c.uniqueId || c.id, -1)} className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition active:scale-90">
                            {c.qty === 1 ? <X className="w-3 h-3 text-red-400" /> : <Minus className="w-3 h-3 text-gray-500" />}
                          </button>
                          <span className="text-[13px] font-bold w-5 text-center text-gray-800">{c.qty}</span>
                          <button onClick={() => updateQty(c.uniqueId || c.id, 1)} className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center hover:bg-blue-700 transition active:scale-90 shadow-sm">
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

          {/* Cart Footer */}
          {cart.length > 0 && (
            <div className="bg-white border-t border-gray-100 px-5 py-4 flex-shrink-0 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">المنتجات ({cartCount})</span>
                <span className="text-sm font-bold text-gray-700">{formatNum(cartTotal)} د.ع</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">الشحن</span>
                <span className="text-[11px] text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg font-semibold">عند الاستلام</span>
              </div>
              <div className="border-t border-gray-200 pt-3 flex items-center justify-between">
                <span className="text-base font-bold text-gray-800">المجموع</span>
                <span className="text-xl font-black text-gray-900">{formatNum(cartTotal)} <span className="text-[12px] font-bold text-gray-500">د.ع</span></span>
              </div>
              <button onClick={() => { setShowCart(false); navigate('/china-checkout') }}
                className="w-full h-[52px] bg-gradient-to-l from-blue-600 to-blue-700 text-white rounded-2xl font-bold text-[14px] flex items-center justify-center gap-2.5 transition-all active:scale-[0.97] shadow-lg shadow-blue-200/50">
                <ShoppingCart className="w-5 h-5" />
                إتمام الطلب — {formatNum(cartTotal)} د.ع
              </button>
              <button onClick={() => { setCart([]); setShowCart(false) }}
                className="w-full text-[13px] text-red-400 hover:text-red-500 py-1 transition-colors font-medium">
                تفريغ السلة
              </button>
            </div>
          )}
        </div>
      )}

      {/* Favorites Full Page */}
      {showFavorites && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white" dir="rtl">
          <div className="bg-white flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-100 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-pink-50 rounded-xl flex items-center justify-center">
                <Heart className="w-5 h-5 text-pink-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">المفضلة</h3>
                <p className="text-[12px] text-gray-400">{favorites.length} منتج</p>
              </div>
            </div>
            <button onClick={() => setShowFavorites(false)} className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-all active:scale-95">
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {favorites.length === 0 ? (
              <div className="text-center py-32 px-6">
                <div className="w-24 h-24 bg-gray-100 rounded-3xl flex items-center justify-center mx-auto mb-5">
                  <Heart className="w-12 h-12 text-gray-300" />
                </div>
                <p className="text-lg font-bold text-gray-600">لا توجد منتجات مفضلة</p>
                <p className="text-sm text-gray-400 mt-2">اضغط على القلب لإضافة منتجات</p>
                <button onClick={() => setShowFavorites(false)} className="mt-6 px-6 py-3 bg-pink-500 text-white rounded-2xl font-bold text-sm active:scale-95 transition-all">
                  تصفح المنتجات
                </button>
              </div>
            ) : (
              <div className="p-4 space-y-3 pb-8">
                {favorites.map(item => {
                  const pr = formatPrice(item.Price, item.isSerpApi ? 'USD' : provCurrency)
                  return (
                    <div key={item.Id} className="flex gap-3 bg-gray-50 rounded-2xl p-3">
                      <img src={item.MainPictureUrl} alt="" className="w-20 h-20 rounded-xl object-cover bg-white flex-shrink-0 cursor-pointer" onClick={() => { setShowFavorites(false); setSelectedProduct(item) }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-gray-800 line-clamp-2 cursor-pointer" onClick={() => { setShowFavorites(false); setSelectedProduct(item) }}>{item.Title}</p>
                        <p className="text-[14px] font-black text-blue-600 mt-1">{formatNum(pr.iqd)} د.ع</p>
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
