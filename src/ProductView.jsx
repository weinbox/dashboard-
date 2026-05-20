import { useState } from 'react'
import {
  ArrowRight, ShoppingCart, Plus, Minus, Heart, Star, Package,
  ChevronDown, CheckCircle2, Flame, Truck, Loader2, Store, ShieldCheck, RotateCcw, Check,
  Info, HelpCircle, Ruler, Tag, Image
} from 'lucide-react'
import { heartPulse, rippleEffect, toastAnim } from './useAnimations'
import { ProductSkeleton } from './Skeletons'
import ExplainSheet from './ExplainSheet'
import LazyImage from './components/LazyImage'

export default function ProductView(p) {
  const [openSec, setOpenSec] = useState('details')
  const [translated, setTranslated] = useState({})
  const [translating, setTranslating] = useState(null)
  const { item, productDetail, pics, iqd, inCart, sales, reviews, provLabel, discountPercent, formatNum, loadingDetail, cartCount } = p
  const stars = Math.round(item.Rating || 0)
  const toggle = (s) => setOpenSec(prev => prev === s ? null : s)

  const translateOne = async (text) => {
    try {
      const res = await fetch('/.netlify/functions/translate?text=' + encodeURIComponent(text.substring(0, 500)) + '&from=en&to=ar')
      const data = await res.json()
      return data.translated || text
    } catch (e) { return text }
  }

  const translateAll = async (items, baseKey) => {
    if (translated[baseKey]) return
    setTranslating(baseKey)
    try {
      const results = []
      for (let i = 0; i < items.length; i++) {
        const tr = await translateOne(items[i])
        results.push(tr)
        setTranslated(prev => ({ ...prev, [baseKey]: [...results] }))
      }
    } catch (e) { console.error('Translation error:', e) }
    setTranslating(null)
  }

  const translateDimensions = async () => {
    if (translated.dimensions || !productDetail?.dimensions) return
    setTranslating('dimensions')
    try {
      const dims = productDetail.dimensions
      if (typeof dims === 'string') {
        const tr = await translateOne(dims)
        setTranslated(prev => ({ ...prev, dimensions: tr }))
      } else {
        const result = {}
        for (const [key, val] of Object.entries(dims)) {
          if (!val) continue
          const trKey = await translateOne(key)
          const trVal = await translateOne(String(val))
          result[trKey] = trVal
          setTranslated(prev => ({ ...prev, dimensions: { ...result } }))
        }
      }
    } catch (e) { console.error('Translation error:', e) }
    setTranslating(null)
  }

  return (
    <div ref={p.pageRef} className="min-h-screen bg-slate-50 pb-32" dir="rtl">

      {/* Minimal Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-sm">
        <div className="max-w-screen-xl mx-auto px-4 h-14 flex items-center justify-between">
          <button onClick={() => p.setSelectedProduct(null)} className="p-2 rounded-xl hover:bg-slate-100 transition">
            <ArrowRight className="w-5 h-5 text-slate-900" />
          </button>
          <div className="flex items-center gap-2">
            <button onClick={(e) => { heartPulse(e.currentTarget); p.toggleFavorite(item) }} className="p-2 rounded-xl hover:bg-slate-100 transition">
              <Heart className={`w-5 h-5 ${p.isFavorite(item.Id) ? 'text-red-500 fill-red-500' : 'text-slate-500'}`} />
            </button>
            <button data-cart-icon onClick={() => p.setShowCart(true)} className="relative p-2 rounded-xl hover:bg-slate-100 transition">
              <ShoppingCart className="w-5 h-5 text-slate-500" />
              {cartCount > 0 && <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] bg-indigo-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{cartCount}</span>}
            </button>
          </div>
        </div>
      </header>

      {loadingDetail && <div className="max-w-screen-xl mx-auto pt-16 px-4"><ProductSkeleton /></div>}

      <section className={`pt-20 pb-8 antialiased ${loadingDetail ? 'hidden' : ''}`}>
        <div className="max-w-screen-xl px-4 mx-auto 2xl:px-0">
          <div className="lg:grid lg:grid-cols-2 lg:gap-8 xl:gap-16">

            {/* Left: Image Gallery */}
            <div className="shrink-0 max-w-md lg:max-w-lg mx-auto" ref={p.productImageRef}>
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center justify-center aspect-square overflow-hidden">
                {pics.length > 0 ? (
                  <LazyImage src={pics[p.activeImage]?.Large?.Url || pics[p.activeImage]?.Url} alt="" className="w-full h-full object-contain" wrapperClassName="w-full h-full" />
                ) : item.MainPictureUrl ? (
                  <LazyImage src={item.MainPictureUrl} alt="" className="w-full h-full object-contain" wrapperClassName="w-full h-full" />
                ) : (
                  <Package className="w-24 h-24 text-slate-300" />
                )}
              </div>

              {/* Thumbnail Tabs - Flowbite Pro Gallery style */}
              {pics.length > 1 && (
                <ul className="flex gap-3 mt-4 justify-center overflow-x-auto pb-1">
                  {pics.slice(0, 5).map((pic, i) => (
                    <li key={i} className="me-0">
                      <button onClick={() => p.setActiveImage(i)}
                        className={`w-[72px] h-[72px] rounded-xl border-2 p-1 transition-all bg-white hover:border-slate-300 ${p.activeImage === i ? 'border-indigo-500 shadow-sm' : 'border-slate-200 hover:border-slate-300'}`}>
                        <LazyImage src={pic.Large?.Url || pic.Url} alt="" className="w-full h-full object-contain" wrapperClassName="w-full h-full" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {/* Image counter */}
              {pics.length > 1 && (
                <div className="flex items-center justify-center gap-2 mt-2">
                  <button onClick={() => p.setActiveImage(prev => prev > 0 ? prev - 1 : pics.length - 1)} className="group flex justify-center items-center rounded-xl p-1.5 hover:bg-slate-100 transition">
                    <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-slate-900" />
                  </button>
                  <span className="text-sm font-medium text-slate-500">{p.activeImage + 1} من {Math.min(pics.length, 5)}</span>
                  <button onClick={() => p.setActiveImage(prev => prev < Math.min(pics.length, 5) - 1 ? prev + 1 : 0)} className="group flex justify-center items-center rounded-xl p-1.5 hover:bg-slate-100 transition">
                    <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-slate-900 rotate-180" />
                  </button>
                </div>
              )}
            </div>

            {/* Right: Product Info */}
            <div className="mt-6 sm:mt-8 lg:mt-0 bg-white rounded-2xl border border-slate-100 shadow-sm p-6" ref={p.productInfoRef}>

              <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl leading-relaxed">
                {item.Title}
              </h1>

              {/* Rating + Reviews + Delivery */}
              <div className="mt-4 sm:items-center sm:gap-4 sm:flex">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} className={`w-4 h-4 ${s <= stars ? 'text-yellow-400 fill-yellow-400' : 'text-slate-200 fill-slate-200'}`} />
                    ))}
                  </div>
                  {item.Rating > 0 && (
                    <p className="text-sm font-medium leading-none text-slate-500">({item.Rating})</p>
                  )}
                  {reviews && (
                    <span className="text-sm font-medium leading-none text-slate-700">
                      {formatNum(reviews)} تقييم
                    </span>
                  )}
                </div>

              </div>

              {/* Price Section */}
              <div className="mt-4 flex items-center gap-4 flex-wrap">
                {item.OldPrice > 0 && item.OldPrice > (item.Price?.OriginalPrice || 0) && (
                  <div className="flex items-center gap-2">
                    <p className="text-base text-slate-400 line-through">
                      {formatNum(p.applyCommission(Math.round(item.OldPrice * (p.prov.currency === 'USD' ? p.USD_TO_IQD : p.USD_TO_IQD / p.CNY_TO_USD))))} د.ع
                    </p>
                    {discountPercent > 0 && (
                      <span className="me-2 rounded-lg bg-red-50 px-2.5 py-1 text-xs font-bold text-red-600">-{discountPercent}%</span>
                    )}
                  </div>
                )}
                <p className="text-2xl font-extrabold text-slate-900 sm:text-3xl" ref={p.priceCountRef}>
                  {formatNum(iqd)} <span className="text-lg font-medium text-slate-400">د.ع</span>
                </p>
              </div>

              {/* Options / Variants */}
              {((productDetail?.Configurators?.length > 0) || (productDetail?.variants?.length > 0)) && (
                <div className="mt-6 space-y-5">
                  <hr className="border-slate-100" />

                  {productDetail?.Configurators && productDetail.Configurators.map(cfg => {
                    const isColor = /color|colour|لون|رنگ/i.test(cfg.Name || '')
                    const hasImages = (cfg.Values || []).some(v => v.ImageUrl)
                    return (
                      <div key={cfg.Pid}>
                        <div className="flex items-center gap-2 mb-3">
                          <p className="text-sm font-semibold text-slate-900">{cfg.Name || 'خيار'}</p>
                          {p.selectedConfigs[cfg.Pid] && (
                            <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md font-medium">
                              {(cfg.Values || []).find(v => v.Vid === p.selectedConfigs[cfg.Pid])?.Name || ''}
                            </span>
                          )}
                        </div>

                        {/* Color swatches */}
                        {(isColor || hasImages) ? (
                          <div className="flex flex-wrap gap-2.5">
                            {(cfg.Values || []).map(val => {
                              const sel = p.selectedConfigs[cfg.Pid] === val.Vid
                              return (
                                <button key={val.Vid}
                                  onClick={() => p.setSelectedConfigs(prev => ({...prev, [cfg.Pid]: sel ? undefined : val.Vid}))}
                                  className={`relative group transition-all duration-200 ${sel ? 'scale-110' : 'hover:scale-105'}`}
                                  title={val.Name || val.Value || val.Vid}>
                                  {val.ImageUrl ? (
                                    <div className={`w-12 h-12 rounded-xl overflow-hidden border-2 transition-all ${sel ? 'border-indigo-500 shadow-md shadow-indigo-100 ring-2 ring-indigo-200' : 'border-slate-200 hover:border-slate-300'}`}>
                                      <img src={val.ImageUrl} alt="" className="w-full h-full object-cover" />
                                    </div>
                                  ) : (
                                    <div className={`w-11 h-11 rounded-xl border-2 transition-all flex items-center justify-center ${sel ? 'border-indigo-500 shadow-md shadow-indigo-100 ring-2 ring-indigo-200' : 'border-slate-200 hover:border-slate-300'}`}>
                                      <span className="text-[10px] font-medium text-slate-600 text-center leading-tight px-0.5">{val.Name || val.Value || val.Vid}</span>
                                      {sel && <div className="absolute inset-0 bg-indigo-500/10 rounded-xl flex items-center justify-center"><Check className="w-3.5 h-3.5 text-indigo-600" /></div>}
                                    </div>
                                  )}
                                </button>
                              )
                            })}
                          </div>
                        ) : (
                          /* Size/Text chips */
                          <div className="flex flex-wrap gap-2">
                            {(cfg.Values || []).map(val => {
                              const sel = p.selectedConfigs[cfg.Pid] === val.Vid
                              return (
                                <button key={val.Vid}
                                  onClick={() => p.setSelectedConfigs(prev => ({...prev, [cfg.Pid]: sel ? undefined : val.Vid}))}
                                  className={`min-w-[44px] h-11 px-4 rounded-xl border-2 text-sm font-semibold transition-all duration-200 active:scale-95 ${
                                    sel
                                      ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400 hover:bg-slate-50'
                                  }`}>
                                  {val.Name || val.Value || val.Vid}
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {productDetail?.variants && productDetail.variants.map((variant, vi) => {
                    const isColor = /color|colour|لون/i.test(variant.title || '')
                    const hasImages = (variant.items || []).some(v => v.image)
                    return (
                      <div key={vi}>
                        <div className="flex items-center gap-2 mb-3">
                          <p className="text-sm font-semibold text-slate-900">{variant.title || 'خيار'}</p>
                        </div>

                        {(isColor || hasImages) ? (
                          <div className="flex flex-wrap gap-2.5">
                            {(variant.items || []).map((opt, oi) => {
                              const loading = p.loadingVariant === opt.asin
                              const cur = opt.selected || opt.asin === item.Id
                              return (
                                <button key={opt.asin || oi}
                                  disabled={loading || !!p.loadingVariant}
                                  onClick={() => { if (opt.asin && !cur) p.loadAmazonVariant(opt.asin) }}
                                  className={`relative transition-all duration-200 ${cur ? 'scale-110' : 'hover:scale-105'} ${p.loadingVariant && !loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                  title={opt.name || opt.asin}>
                                  {opt.image ? (
                                    <div className={`w-12 h-12 rounded-xl overflow-hidden border-2 transition-all ${cur ? 'border-indigo-500 shadow-md ring-2 ring-indigo-200' : loading ? 'border-indigo-300 animate-pulse' : 'border-slate-200 hover:border-slate-300'}`}>
                                      <img src={opt.image} alt="" className="w-full h-full object-cover" />
                                      {loading && <div className="absolute inset-0 bg-white/60 flex items-center justify-center"><Loader2 className="w-4 h-4 animate-spin text-indigo-500" /></div>}
                                    </div>
                                  ) : (
                                    <div className={`w-10 h-10 rounded-full border-2 transition-all flex items-center justify-center ${cur ? 'border-indigo-500 shadow-md ring-2 ring-indigo-200' : 'border-slate-200 hover:border-slate-300'}`}
                                      style={{ backgroundColor: opt.name?.toLowerCase() || '#ccc' }}>
                                      {cur && <Check className="w-4 h-4 text-white drop-shadow" />}
                                      {loading && <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />}
                                    </div>
                                  )}
                                </button>
                              )
                            })}
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {(variant.items || []).map((opt, oi) => {
                              const loading = p.loadingVariant === opt.asin
                              const cur = opt.selected || opt.asin === item.Id
                              return (
                                <button key={opt.asin || oi}
                                  disabled={loading || !!p.loadingVariant}
                                  onClick={() => { if (opt.asin && !cur) p.loadAmazonVariant(opt.asin) }}
                                  className={`min-w-[44px] h-11 px-4 rounded-xl border-2 text-sm font-semibold transition-all duration-200 active:scale-95 ${
                                    cur
                                      ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                                      : loading
                                        ? 'border-indigo-300 bg-indigo-50/50 animate-pulse text-indigo-400'
                                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400 hover:bg-slate-50'
                                  } ${p.loadingVariant && !loading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                  {loading && <Loader2 className="w-3.5 h-3.5 animate-spin me-1.5 inline" />}
                                  {opt.name || opt.asin}
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* CTA Buttons */}
              <div className="mt-6 sm:mt-8 space-y-3">
                {/* Cart + Favorite row */}
                <div className="flex items-center gap-2">
                  {inCart ? (
                    <>
                      <div className="flex items-center bg-slate-100 rounded-full overflow-hidden">
                        <button onClick={() => p.updateQty(inCart.uniqueId || inCart.id, -1)} className="w-9 h-9 flex items-center justify-center hover:bg-slate-200 transition">
                          <Minus className="w-3.5 h-3.5 text-slate-600" />
                        </button>
                        <span className="w-7 text-center text-sm font-bold text-slate-900">{inCart.qty}</span>
                        <button onClick={() => p.updateQty(inCart.uniqueId || inCart.id, 1)} className="w-9 h-9 flex items-center justify-center hover:bg-slate-200 transition">
                          <Plus className="w-3.5 h-3.5 text-slate-600" />
                        </button>
                      </div>
                      <button onClick={() => p.setShowCart(true)}
                        className="flex-1 h-11 bg-slate-900 text-white text-[13px] font-semibold rounded-full flex items-center justify-center gap-2 transition-all hover:bg-slate-800 active:scale-[0.97]">
                        عرض السلة
                        <ShoppingCart className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <button onClick={(e) => { rippleEffect(e); p.flyToCart(e.currentTarget, '[data-cart-icon]'); p.addToCart(item) }}
                      className="flex-1 h-11 bg-slate-900 text-white text-[13px] font-semibold rounded-full flex items-center justify-center gap-2 transition-all hover:bg-slate-800 active:scale-[0.97]">
                      أضف إلى السلة
                      <ShoppingCart className="w-4 h-4" />
                    </button>
                  )}

                  <button onClick={(e) => { heartPulse(e.currentTarget); p.toggleFavorite(item) }}
                    className={`w-11 h-11 rounded-full flex items-center justify-center transition-all active:scale-90 ${
                      p.isFavorite(item.Id)
                        ? 'bg-red-50 border border-red-100'
                        : 'bg-slate-100 hover:bg-slate-200'
                    }`}>
                    <Heart className={`w-[18px] h-[18px] ${p.isFavorite(item.Id) ? 'text-red-500 fill-red-500' : 'text-slate-500'}`} />
                  </button>
                </div>
              </div>


              {/* Description */}
              {productDetail?.FeatureBullets?.length > 0 && (
                <div className="mb-6 text-slate-500 text-sm leading-relaxed [&_ul]:list-disc [&_ul]:pr-5 [&_li]:mb-1 [&_b]:font-bold [&_b]:text-slate-700 [&_p]:mb-2"
                  dangerouslySetInnerHTML={{ __html: productDetail.FeatureBullets.slice(0, 3).join('<br/>') }} />
              )}

              {productDetail?.Description && (
                <div className="text-slate-500 leading-relaxed text-sm [&_ul]:list-disc [&_ul]:pr-5 [&_li]:mb-1 [&_b]:font-bold [&_b]:text-slate-700 [&_p]:mb-2"
                  dangerouslySetInnerHTML={{ __html: productDetail.Description.substring(0, 600) + (productDetail.Description.length > 600 ? '...' : '') }} />
              )}

              {/* AI Explain Button */}
              <div className="mt-4">
                <button onClick={() => {
                  p.setShowExplainSheet(true)
                  p.setExplainMessages([])
                  let ctx = 'اشرح هذا المنتج بالعربي العراقي بشكل مبسط وواضح. اذكر: شنو هذا المنتج, فوائده الرئيسية, ولمن مناسب, وهل يستاهل سعره. لا تسأل المستخدم أي سؤال اشرح مباشرة:\n\n'
                  ctx += 'Product: ' + item.Title + '\n'
                  ctx += 'Price: ' + formatNum(iqd) + ' IQD\n'
                  ctx += 'Rating: ' + (item.Rating || 'N/A') + '/5\n'
                  if (reviews) ctx += 'Reviews: ' + reviews + '\n'
                  if (item.Badge) ctx += 'Badge: ' + item.Badge + '\n'
                  if (item.BoughtLastMonth) ctx += 'Bought last month: ' + item.BoughtLastMonth + '\n'
                  if (productDetail?.categories?.length) ctx += 'Category: ' + productDetail.categories.join(' > ') + '\n'
                  if (productDetail?.specifications?.length) ctx += 'Specifications: ' + productDetail.specifications.map(s => s.name + ': ' + s.value).join(', ') + '\n'
                  if (productDetail?.about?.length) ctx += 'About: ' + productDetail.about.join('. ') + '\n'
                  if (productDetail?.dimensions && typeof productDetail.dimensions === 'object') ctx += 'Dimensions: ' + Object.entries(productDetail.dimensions).filter(([k,v]) => v).map(([k,v]) => k + ': ' + v).join(', ') + '\n'
                  if (productDetail?.Description) ctx += 'Description: ' + productDetail.Description.substring(0, 300) + '\n'
                  if (productDetail?.FeatureBullets?.length) ctx += 'Features: ' + productDetail.FeatureBullets.slice(0,5).join('. ') + '\n'
                  p.askExplain('اشرح لي هذا المنتج', ctx)
                }} className="w-full h-12 bg-gradient-to-l from-indigo-500 to-purple-600 text-white text-sm font-bold rounded-2xl flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:shadow-indigo-200/50 active:scale-[0.97]">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
                  </svg>
                  اشرح لي بالذكاء الاصطناعي
                </button>
              </div>

              {/* Categories / Breadcrumb */}
              {productDetail?.categories?.length > 0 && (
                <div className="mt-5 flex items-center gap-1.5 flex-wrap">
                  <Tag className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  {productDetail.categories.map((cat, i) => (
                    <span key={i} className="text-[11px] text-slate-500">
                      {cat}{i < productDetail.categories.length - 1 && <span className="text-slate-300 mx-1">›</span>}
                    </span>
                  ))}
                </div>
              )}

              {/* Specifications */}
              {productDetail?.specifications?.length > 0 && (
                <div className="mt-5">
                  <button onClick={() => { toggle('specs'); translateAll(productDetail.specifications.map(s => s.name + ': ' + s.value), 'specs') }}
 className="w-full flex items-center justify-between px-4 py-4 bg-white border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/30 rounded-2xl transition-all active:scale-[0.99] shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center">
                        <Info className="w-5 h-5 text-indigo-600" />
                      </div>
                      <span className="text-[15px] font-bold text-slate-900">المواصفات التقنية</span>
                    </div>
                    <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${openSec === 'specs' ? 'rotate-180' : ''}`} />
                  </button>
                  {openSec === 'specs' && (
                    <div className="mt-2 bg-white border border-slate-100 rounded-2xl p-3 space-y-0 shadow-sm">
                      {translating === 'specs' && <div className="text-center py-2 text-xs text-indigo-500 animate-pulse">جاري الترجمة...</div>}
                      {productDetail.specifications.map((spec, i) => (
                        <div key={i} className={`flex items-start gap-3 py-2.5 px-3 ${i % 2 === 0 ? 'bg-slate-50/60' : ''} rounded-lg`}>
                          <span className="text-[13px] font-semibold text-slate-500 min-w-[110px] flex-shrink-0">{translated.specs?.[i]?.split(':')?.[0] || spec.name || spec.key}</span>
                          <span className="text-[13px] text-slate-800 font-medium">{translated.specs?.[i]?.split(':')?.[1]?.trim() || spec.value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* About Product */}
              {productDetail?.about?.length > 0 && (
                <div className="mt-2.5">
                  <button onClick={() => { toggle('about'); translateAll(productDetail.about, 'about') }}
 className="w-full flex items-center justify-between px-4 py-4 bg-white border border-slate-200 hover:border-emerald-200 hover:bg-emerald-50/30 rounded-2xl transition-all active:scale-[0.99] shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center">
                        <Info className="w-5 h-5 text-emerald-600" />
                      </div>
                      <span className="text-[15px] font-bold text-slate-900">حول هذا المنتج</span>
                    </div>
                    <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${openSec === 'about' ? 'rotate-180' : ''}`} />
                  </button>
                  {openSec === 'about' && (
                    <div className="mt-2 bg-white border border-slate-100 rounded-2xl p-4 space-y-2.5 shadow-sm">
                      {translating === 'about' && <div className="text-center py-2 text-xs text-emerald-500 animate-pulse">جاري الترجمة...</div>}
                      {productDetail.about.map((point, i) => (
                        <div key={i} className="flex items-start gap-2.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 flex-shrink-0" />
                          <p className="text-[13px] text-slate-700 leading-relaxed">{translated.about?.[i] || point}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Dimensions */}
              {productDetail?.dimensions && (
                <div className="mt-2.5">
                  <button onClick={() => { toggle('dimensions'); translateDimensions() }} className="w-full flex items-center justify-between px-4 py-4 bg-white border border-slate-200 hover:border-orange-200 hover:bg-orange-50/30 rounded-2xl transition-all active:scale-[0.99] shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-orange-50 rounded-xl flex items-center justify-center">
                        <Ruler className="w-5 h-5 text-orange-600" />
                      </div>
                      <span className="text-[15px] font-bold text-slate-900">الأبعاد والوزن</span>
                    </div>
                    <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${openSec === 'dimensions' ? 'rotate-180' : ''}`} />
                  </button>
                  {openSec === 'dimensions' && (
                    <div className="mt-2 bg-white border border-slate-100 rounded-2xl p-3 shadow-sm">
                      {translating === 'dimensions' && <div className="text-center py-2 text-xs text-orange-500 animate-pulse">جاري الترجمة...</div>}
                      {typeof productDetail.dimensions === 'string' ? (
                        <p className="text-[13px] text-slate-700 p-3">{translated.dimensions || productDetail.dimensions}</p>
                      ) : (
                        <div className="space-y-1">
                          {Object.entries(translated.dimensions && typeof translated.dimensions === 'object' ? translated.dimensions : productDetail.dimensions).filter(([k,v]) => v).map(([key, val], i) => (
                            <div key={i} className={`flex justify-between py-2.5 px-3 ${i % 2 === 0 ? 'bg-slate-50/60' : ''} rounded-lg`}>
                              <span className="text-[13px] text-slate-500 font-semibold">{key}</span>
                              <span className="text-[13px] text-slate-800 font-bold">{val}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Questions & Answers */}
              {productDetail?.questionsAnswers?.length > 0 && (
                <div className="mt-2.5">
                  <button onClick={() => { toggle('qa'); translateAll(productDetail.questionsAnswers.map(qa => qa.question + ' | ' + qa.answer), 'qa') }} className="w-full flex items-center justify-between px-4 py-4 bg-white border border-slate-200 hover:border-purple-200 hover:bg-purple-50/30 rounded-2xl transition-all active:scale-[0.99] shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-purple-50 rounded-xl flex items-center justify-center">
                        <HelpCircle className="w-5 h-5 text-purple-600" />
                      </div>
                      <span className="text-[15px] font-bold text-slate-900">أسئلة وأجوبة</span>
                      <span className="text-[12px] bg-purple-100 text-purple-700 px-2.5 py-1 rounded-full font-bold">{productDetail.questionsAnswers.length}</span>
                    </div>
                    <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${openSec === 'qa' ? 'rotate-180' : ''}`} />
                  </button>
                  {openSec === 'qa' && (
                    <div className="mt-2 space-y-2.5">
                      {translating === 'qa' && <div className="text-center py-2 text-xs text-purple-500 animate-pulse">جاري الترجمة...</div>}
                      {productDetail.questionsAnswers.map((qa, i) => {
                        const trParts = translated.qa?.[i]?.split(' | ')
                        return (
                          <div key={i} className="bg-white border border-slate-100 rounded-2xl p-4 space-y-2.5 shadow-sm">
                            <div className="flex items-start gap-2.5">
                              <span className="text-[12px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg flex-shrink-0">س</span>
                              <p className="text-[13px] font-bold text-slate-800 leading-relaxed">{trParts?.[0] || qa.question}</p>
                            </div>
                            {(trParts?.[1] || qa.answer) && (
                              <div className="flex items-start gap-2.5 mr-5">
                                <span className="text-[12px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg flex-shrink-0">ج</span>
                                <p className="text-[13px] text-slate-600 leading-relaxed">{trParts?.[1] || qa.answer}</p>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>

          {/* A+ Content (Enhanced images) */}
          {productDetail?.aPlusContent?.length > 0 && (
            <div className="mt-8">
              <div className="flex items-center gap-2 mb-4">
                <Image className="w-4.5 h-4.5 text-indigo-500" />
                <h3 className="text-[14px] font-bold text-slate-900">محتوى معزز</h3>
              </div>
              <div className="space-y-4">
                {productDetail.aPlusContent.map((section, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                    {section.image && (
                      <img src={section.image} alt="" className="w-full object-cover" loading="lazy" />
                    )}
                    {(section.title || section.body) && (
                      <div className="p-4">
                        {section.title && <h4 className="text-[13px] font-bold text-slate-900 mb-1">{section.title}</h4>}
                        {section.body && <p className="text-[12px] text-slate-500 leading-relaxed">{section.body}</p>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Related Products */}
          {productDetail?.relatedProducts?.length > 0 && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">منتجات قد تعجبك</h3>
              <div className="flex gap-4 overflow-x-auto pb-2">
                {productDetail.relatedProducts.map((rp, i) => {
                  const rpPrice = rp.price ? p.formatPrice({OriginalPrice: rp.price, OriginalCurrencyCode: 'USD'}, 'USD') : null
                  return (
                    <button key={rp.asin || i} onClick={() => { if (rp.asin) p.loadProductById(rp.asin, 'amazon') }}
                      className="flex-shrink-0 w-[160px] bg-white rounded-2xl border border-slate-100 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all active:scale-[0.98]">
                      <div className="w-full h-[130px] bg-slate-50 flex items-center justify-center">
                        {rp.image && <LazyImage src={rp.image} alt="" className="w-full h-full object-contain p-3" wrapperClassName="w-full h-full" />}
                      </div>
                      <div className="p-3">
                        <p className="text-xs text-slate-600 line-clamp-2 leading-snug mb-2">{rp.title}</p>
                        {rpPrice && <p className="text-sm font-bold text-slate-900">{formatNum(rpPrice.iqd)} <span className="text-xs text-slate-400 font-normal">د.ع</span></p>}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Extra product images */}
          {pics.length > 2 && (
            <div className="mt-8 rounded-lg overflow-hidden">
              {pics.slice(2, 6).map((pic, i) => (
                <LazyImage key={i} src={pic.Large?.Url || pic.Url} alt="" className="w-full" wrapperClassName="w-full" />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Toast */}
      {p.addedToast && (
        <div ref={el => { if (el) toastAnim(el, true) }} className="fixed top-16 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-indigo-600 text-white px-5 py-3.5 rounded-2xl shadow-2xl shadow-indigo-200/50 flex items-center gap-3 min-w-[280px]">
            <CheckCircle2 className="w-5 h-5 text-indigo-200 flex-shrink-0" />
            <span className="text-sm font-semibold flex-1">تمت الإضافة للسلة</span>
            <button onClick={() => { p.setAddedToast(false); p.setShowCart(true) }} className="text-sm font-bold text-indigo-200 hover:text-white whitespace-nowrap">عرض</button>
          </div>
        </div>
      )}

      <ExplainSheet show={p.showExplainSheet} onClose={() => p.setShowExplainSheet(false)} productTitle={item.Title} messages={p.explainMessages} loading={p.explainLoading} onAskExplain={(q) => p.askExplain(q)} />

    </div>
  )
}
