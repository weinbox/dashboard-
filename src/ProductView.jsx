import { useState } from 'react'
import {
  ArrowRight, ShoppingCart, Plus, Minus, Heart, Star, Package,
  ChevronDown, CheckCircle2, Flame, Truck, Loader2, Store, ShieldCheck, RotateCcw, Check
} from 'lucide-react'
import { heartPulse, rippleEffect, toastAnim } from './useAnimations'
import { ProductSkeleton } from './Skeletons'
import ExplainSheet from './ExplainSheet'

export default function ProductView(p) {
  const [openSec, setOpenSec] = useState('details')
  const { item, productDetail, pics, iqd, inCart, sales, reviews, provLabel, discountPercent, formatNum, loadingDetail, cartCount } = p
  const stars = Math.round(item.Rating || 0)
  const toggle = (s) => setOpenSec(prev => prev === s ? null : s)

  return (
    <div ref={p.pageRef} className="min-h-screen bg-white pb-32" dir="rtl">

      {/* Minimal Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200">
        <div className="max-w-screen-xl mx-auto px-4 h-14 flex items-center justify-between">
          <button onClick={() => p.setSelectedProduct(null)} className="p-2 rounded-lg hover:bg-gray-100 transition">
            <ArrowRight className="w-5 h-5 text-gray-900" />
          </button>
          <div className="flex items-center gap-2">
            <button onClick={(e) => { heartPulse(e.currentTarget); p.toggleFavorite(item) }} className="p-2 rounded-lg hover:bg-gray-100 transition">
              <Heart className={`w-5 h-5 ${p.isFavorite(item.Id) ? 'text-red-500 fill-red-500' : 'text-gray-500'}`} />
            </button>
            <button data-cart-icon onClick={() => p.setShowCart(true)} className="relative p-2 rounded-lg hover:bg-gray-100 transition">
              <ShoppingCart className="w-5 h-5 text-gray-500" />
              {cartCount > 0 && <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] bg-blue-700 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{cartCount}</span>}
            </button>
          </div>
        </div>
      </header>

      {loadingDetail && <div className="max-w-screen-xl mx-auto pt-16 px-4"><ProductSkeleton /></div>}

      <section className={`pt-20 pb-8 bg-white antialiased ${loadingDetail ? 'hidden' : ''}`}>
        <div className="max-w-screen-xl px-4 mx-auto 2xl:px-0">
          <div className="lg:grid lg:grid-cols-2 lg:gap-8 xl:gap-16">

            {/* Left: Image Gallery with Tabs - Flowbite Pro style */}
            <div className="shrink-0 max-w-md lg:max-w-lg mx-auto" ref={p.productImageRef}>
              <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-center aspect-square overflow-hidden">
                {pics.length > 0 ? (
                  <img src={pics[p.activeImage]?.Large?.Url || pics[p.activeImage]?.Url} alt="" className="w-full h-full object-contain transition-opacity duration-300" />
                ) : item.MainPictureUrl ? (
                  <img src={item.MainPictureUrl} alt="" className="w-full h-full object-contain" />
                ) : (
                  <Package className="w-24 h-24 text-gray-300" />
                )}
              </div>

              {/* Thumbnail Tabs - Flowbite Pro Gallery style */}
              {pics.length > 1 && (
                <ul className="flex gap-3 mt-4 justify-center overflow-x-auto pb-1">
                  {pics.slice(0, 5).map((pic, i) => (
                    <li key={i} className="me-0">
                      <button onClick={() => p.setActiveImage(i)}
                        className={`w-[72px] h-[72px] rounded-lg border-2 p-1 transition-all bg-gray-50 hover:border-gray-300 ${p.activeImage === i ? 'border-blue-600' : 'border-transparent hover:border-gray-200'}`}>
                        <img src={pic.Large?.Url || pic.Url} alt="" className="w-full h-full object-contain" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {/* Image counter */}
              {pics.length > 1 && (
                <div className="flex items-center justify-center gap-2 mt-2">
                  <button onClick={() => p.setActiveImage(prev => prev > 0 ? prev - 1 : pics.length - 1)} className="group flex justify-center items-center rounded-lg p-1.5 hover:bg-gray-100 transition">
                    <ArrowRight className="w-5 h-5 text-gray-500 group-hover:text-gray-900" />
                  </button>
                  <span className="text-sm font-medium text-gray-500">{p.activeImage + 1} من {Math.min(pics.length, 5)}</span>
                  <button onClick={() => p.setActiveImage(prev => prev < Math.min(pics.length, 5) - 1 ? prev + 1 : 0)} className="group flex justify-center items-center rounded-lg p-1.5 hover:bg-gray-100 transition">
                    <ArrowRight className="w-5 h-5 text-gray-500 group-hover:text-gray-900 rotate-180" />
                  </button>
                </div>
              )}
            </div>

            {/* Right: Product Info - Flowbite Pro enhanced */}
            <div className="mt-6 sm:mt-8 lg:mt-0" ref={p.productInfoRef}>

              {/* In Stock Badge - Flowbite Pro style */}
              <span className="inline-flex items-center gap-1 bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded mb-3">
                <Check className="w-3.5 h-3.5" />
                {productDetail?.stock === 'In Stock' || !productDetail?.stock ? 'متوفر' : 'غير متوفر'}
              </span>

              <h1 className="text-xl font-semibold text-gray-900 sm:text-2xl leading-relaxed">
                {item.Title}
              </h1>

              {/* Rating + Reviews + Delivery - Flowbite Pro style */}
              <div className="mt-4 sm:items-center sm:gap-4 sm:flex">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} className={`w-4 h-4 ${s <= stars ? 'text-yellow-300 fill-yellow-300' : 'text-gray-300 fill-gray-300'}`} />
                    ))}
                  </div>
                  {item.Rating > 0 && (
                    <p className="text-sm font-medium leading-none text-gray-500">({item.Rating})</p>
                  )}
                  {reviews && (
                    <a href="#" className="text-sm font-medium leading-none text-gray-900 underline hover:no-underline">
                      {formatNum(reviews)} تقييم
                    </a>
                  )}
                </div>

                <div className="flex items-center gap-1 mt-2 sm:mt-0">
                  <Truck className="w-5 h-5 text-blue-700" />
                  <p className="text-sm font-medium text-blue-700">شحن دولي</p>
                </div>
              </div>

              {/* Price Section - Flowbite Pro style with discount */}
              <div className="mt-4 flex items-center gap-4 flex-wrap">
                {item.OldPrice > 0 && item.OldPrice > (item.Price?.OriginalPrice || 0) && (
                  <div className="flex items-center gap-2">
                    <p className="text-base text-gray-500 line-through">
                      {formatNum(p.applyCommission(Math.round(item.OldPrice * (p.prov.currency === 'USD' ? p.USD_TO_IQD : p.USD_TO_IQD / p.CNY_TO_USD))))} د.ع
                    </p>
                    {discountPercent > 0 && (
                      <span className="me-2 rounded bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800">-{discountPercent}%</span>
                    )}
                  </div>
                )}
                <p className="text-2xl font-extrabold text-gray-900 sm:text-3xl" ref={p.priceCountRef}>
                  {formatNum(iqd)} <span className="text-lg font-medium text-gray-500">د.ع</span>
                </p>
              </div>

              {/* Options / Variants - Flowbite Pro radio style with peer-checked */}
              {((productDetail?.Configurators?.length > 0) || (productDetail?.variants?.length > 0)) && (
                <div className="mt-6 space-y-6">
                  <hr className="border-gray-200" />

                  {productDetail?.Configurators && productDetail.Configurators.map(cfg => (
                    <div key={cfg.Pid}>
                      <p className="mb-2 text-sm font-medium text-gray-900">{cfg.Name || 'خيار'}</p>
                      <div className="flex flex-wrap gap-2">
                        {(cfg.Values || []).map(val => {
                          const sel = p.selectedConfigs[cfg.Pid] === val.Vid
                          return (
                            <label key={val.Vid} className="cursor-pointer">
                              <input type="radio" name={`cfg-${cfg.Pid}`} className="hidden peer" checked={sel} onChange={() => p.setSelectedConfigs(prev => ({...prev, [cfg.Pid]: sel ? undefined : val.Vid}))} />
                              <div className={`cursor-pointer flex items-center justify-center rounded-lg border px-4 py-2.5 text-sm font-medium transition-all peer-checked:bg-blue-50 peer-checked:text-blue-700 peer-checked:border-blue-700 ${sel ? 'bg-blue-50 text-blue-700 border-blue-700' : 'border-gray-200 bg-white text-gray-900 hover:bg-gray-100'}`}>
                                {val.Name || val.Value || val.Vid}
                              </div>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  ))}

                  {productDetail?.variants && productDetail.variants.map((variant, vi) => (
                    <div key={vi}>
                      <p className="mb-2 text-sm font-medium text-gray-900">{variant.title || 'خيار'}</p>
                      <div className="flex flex-wrap gap-2">
                        {(variant.items || []).map((opt, oi) => {
                          const loading = p.loadingVariant === opt.asin
                          const cur = opt.selected || opt.asin === item.Id
                          return (
                            <label key={opt.asin || oi} className={`${p.loadingVariant && !loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                              <input type="radio" name={`var-${vi}`} className="hidden peer" checked={cur} disabled={loading || !!p.loadingVariant}
                                onChange={() => { if (opt.asin && !cur) p.loadAmazonVariant(opt.asin) }} />
                              <div className={`flex items-center justify-center rounded-lg border px-4 py-2.5 text-sm font-medium transition-all ${cur ? 'bg-blue-50 text-blue-700 border-blue-700' : loading ? 'border-blue-300 bg-blue-50/50 animate-pulse text-blue-400' : 'border-gray-200 bg-white text-gray-900 hover:bg-gray-100'}`}>
                                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin me-1.5" />}
                                {opt.name || opt.asin}
                              </div>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* CTA Buttons - Flowbite Pro style */}
              <div className="mt-6 sm:mt-8 space-y-4">
                <div className="flex items-center gap-3">
                  {inCart ? (
                    <>
                      <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                        <button onClick={() => p.updateQty(item.Id, -1)} className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 transition">
                          <Minus className="w-4 h-4 text-gray-600" />
                        </button>
                        <span className="w-10 text-center text-sm font-bold text-gray-900">{inCart.qty}</span>
                        <button onClick={() => p.updateQty(item.Id, 1)} className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 transition">
                          <Plus className="w-4 h-4 text-gray-600" />
                        </button>
                      </div>
                      <button onClick={() => p.setShowCart(true)}
                        className="flex-1 text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 flex items-center justify-center transition-all">
                        <ShoppingCart className="w-5 h-5 -ms-2 me-2" />
                        عرض السلة
                      </button>
                    </>
                  ) : (
                    <button onClick={(e) => { rippleEffect(e); p.flyToCart(e.currentTarget, '[data-cart-icon]'); p.addToCart(item) }}
                      className="flex-1 text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 flex items-center justify-center transition-all">
                      <ShoppingCart className="w-5 h-5 -ms-2 me-2" />
                      أضف إلى السلة
                    </button>
                  )}

                  <button onClick={(e) => { heartPulse(e.currentTarget); p.toggleFavorite(item) }}
                    className="flex items-center justify-center p-2.5 rounded-lg border border-gray-200 bg-white text-gray-900 hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-4 focus:ring-gray-100 transition-all">
                    <Heart className={`w-5 h-5 ${p.isFavorite(item.Id) ? 'text-red-500 fill-red-500' : ''}`} />
                  </button>
                </div>
              </div>

              <hr className="my-6 md:my-8 border-gray-200" />

              {/* Benefits - Flowbite Pro style */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50">
                    <Truck className="w-4 h-4 text-blue-700" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">توصيل عند الاستلام</p>
                    <p className="text-xs text-gray-500">الشحن يحسب عند التوصيل</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-50">
                    <RotateCcw className="w-4 h-4 text-green-700" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">إرجاع مجاني</p>
                    <p className="text-xs text-gray-500">خلال 7 أيام من الاستلام</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-purple-50">
                    <ShieldCheck className="w-4 h-4 text-purple-700" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">ضمان الجودة</p>
                    <p className="text-xs text-gray-500">تعويض كامل في حالة التلف</p>
                  </div>
                </div>
              </div>

              <hr className="my-6 md:my-8 border-gray-200" />

              {/* Seller info - Flowbite Pro style */}
              <div className="mb-6">
                <p className="text-sm text-gray-500">
                  يباع ويشحن بواسطة <span className="font-semibold text-gray-900">{provLabel}</span>
                </p>
                {sales && parseInt(sales) > 100 && (
                  <div className="flex items-center gap-1 mt-1">
                    <Flame className="w-4 h-4 text-orange-500" />
                    <p className="text-sm font-medium text-orange-600">{formatNum(sales)} مبيعة</p>
                  </div>
                )}
                {(item.BoughtLastMonth || productDetail?.boughtLastMonth) && (
                  <p className="text-xs text-gray-500 mt-1">آخر {item.BoughtLastMonth || productDetail?.boughtLastMonth} قطعة تم شراؤها الشهر الماضي</p>
                )}
              </div>

              {/* Description - Flowbite style paragraphs */}
              {productDetail?.FeatureBullets?.length > 0 && (
                <p className="mb-6 text-gray-500">
                  {productDetail.FeatureBullets.slice(0, 3).join('. ')}.
                </p>
              )}

              {productDetail?.Description && (
                <p className="text-gray-500 leading-relaxed">
                  {productDetail.Description.substring(0, 400)}{productDetail.Description.length > 400 ? '...' : ''}
                </p>
              )}

              {/* AI Explain Button */}
              <div className="mt-6">
                <button onClick={() => {
                  p.setShowExplainSheet(true)
                  p.setExplainMessages([])
                  const ctx = 'اشرح هذا المنتج بالعربي العراقي بشكل مبسط وواضح. اذكر: شنو هذا المنتج فوائده الرئيسية ولمن مناسب. لا تسأل المستخدم أي سؤال اشرح مباشرة:\n\nProduct: ' + item.Title + '\nPrice: ' + formatNum(iqd) + ' IQD\nRating: ' + (item.Rating || 'N/A') + (item.Badge ? '\nBadge: ' + item.Badge : '') + (reviews ? '\nReviews count: ' + reviews : '') + (item.BoughtLastMonth ? '\nBought last month: ' + item.BoughtLastMonth : '')
                  p.askExplain('اشرح لي هذا المنتج', ctx)
                }} className="w-full flex items-center justify-center gap-2 text-white bg-gradient-to-l from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-3 transition-all">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
                  </svg>
                  اشرح لي هذا المنتج بالذكاء الاصطناعي
                </button>
              </div>

            </div>
          </div>

          {/* Related Products */}
          {productDetail?.relatedProducts?.length > 0 && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">منتجات قد تعجبك</h3>
              <div className="flex gap-4 overflow-x-auto pb-2">
                {productDetail.relatedProducts.map((rp, i) => {
                  const rpPrice = rp.price ? p.formatPrice({OriginalPrice: rp.price, OriginalCurrencyCode: 'USD'}, 'USD') : null
                  return (
                    <button key={rp.asin || i} onClick={() => { if (rp.asin) p.loadProductById(rp.asin, 'amazon') }}
                      className="flex-shrink-0 w-[160px] bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-all active:scale-[0.98]">
                      <div className="w-full h-[130px] bg-gray-50 flex items-center justify-center">
                        {rp.image && <img src={rp.image} alt="" className="w-full h-full object-contain p-3" />}
                      </div>
                      <div className="p-3">
                        <p className="text-xs text-gray-500 line-clamp-2 leading-snug mb-2">{rp.title}</p>
                        {rpPrice && <p className="text-sm font-bold text-gray-900">{formatNum(rpPrice.iqd)} <span className="text-xs text-gray-400 font-normal">د.ع</span></p>}
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
                <img key={i} src={pic.Large?.Url || pic.Url} alt="" className="w-full" loading="lazy" />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Toast */}
      {p.addedToast && (
        <div ref={el => { if (el) toastAnim(el, true) }} className="fixed top-16 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-green-600 text-white px-5 py-3 rounded-lg shadow-lg flex items-center gap-3 min-w-[280px]">
            <CheckCircle2 className="w-5 h-5 text-green-200 flex-shrink-0" />
            <span className="text-sm font-medium flex-1">تمت الإضافة للسلة</span>
            <button onClick={() => { p.setAddedToast(false); p.setShowCart(true) }} className="text-sm font-bold text-green-200 hover:text-white whitespace-nowrap">عرض</button>
          </div>
        </div>
      )}

      <ExplainSheet show={p.showExplainSheet} onClose={() => p.setShowExplainSheet(false)} productTitle={item.Title} messages={p.explainMessages} loading={p.explainLoading} onAskExplain={(q) => p.askExplain(q)} />

    </div>
  )
}
