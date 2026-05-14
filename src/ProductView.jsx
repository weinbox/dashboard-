import { useState } from 'react'
import { ArrowRight, ShoppingCart, Plus, Minus, Heart, Star, Package, ChevronRight, CheckCircle2, Flame, Truck, Loader2 } from 'lucide-react'
import { heartPulse, rippleEffect, toastAnim } from './useAnimations'
import { ProductSkeleton } from './Skeletons'
import ExplainSheet from './ExplainSheet'

export default function ProductView(p) {
  const [openSec, setOpenSec] = useState('details')
  const toggle = (s) => setOpenSec(prev => prev === s ? null : s)
  const stars = Math.round(p.item.Rating || 0)
  const { item, productDetail, pics, iqd, inCart, sales, reviews, provLabel, discountPercent, formatNum, loadingDetail, cartCount } = p

  return (
    <div ref={p.pageRef} className="min-h-screen bg-white pb-44" dir="rtl">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 h-12 flex items-center justify-between">
          <button onClick={() => p.setSelectedProduct(null)} className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-gray-100">
            <ArrowRight className="w-5 h-5 text-gray-600" />
          </button>
          <p className="text-sm font-medium text-gray-500 truncate max-w-[50%]">{item.Title?.substring(0,30)}</p>
          <div className="flex items-center gap-1">
            <button onClick={(e) => { heartPulse(e.currentTarget); p.toggleFavorite(item) }} className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-gray-100">
              <Heart className={`w-[18px] h-[18px] ${p.isFavorite(item.Id) ? 'text-red-500 fill-red-500' : 'text-gray-400'}`} />
            </button>
            <button data-cart-icon onClick={() => p.setShowCart(true)} className="relative w-9 h-9 rounded-lg flex items-center justify-center hover:bg-gray-100">
              <ShoppingCart className="w-[18px] h-[18px] text-gray-400" />
              {cartCount > 0 && <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-blue-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center">{cartCount}</span>}
            </button>
          </div>
        </div>
      </header>

      {loadingDetail && <div className="max-w-2xl mx-auto pt-14 px-4"><ProductSkeleton /></div>}

      <div className={`max-w-2xl mx-auto pt-14 ${loadingDetail ? 'hidden' : ''}`}>

        {/* Image Gallery */}
        <div ref={p.productImageRef} className="bg-white">
          <div className="relative aspect-square flex items-center justify-center bg-gray-50">
            {pics.length > 0 ? (
              <img src={pics[p.activeImage]?.Large?.Url || pics[p.activeImage]?.Url} alt="" className="w-full h-full object-contain p-10" />
            ) : item.MainPictureUrl ? (
              <img src={item.MainPictureUrl} alt="" className="w-full h-full object-contain p-10" />
            ) : (
              <Package className="w-20 h-20 text-gray-200" />
            )}
            {discountPercent > 0 && <span className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-lg">-{discountPercent}%</span>}
          </div>
          {pics.length > 1 && (
            <div className="flex justify-center gap-3 py-3 px-4 border-t border-gray-100">
              {pics.slice(0,5).map((pic,i) => (
                <button key={i} onClick={() => p.setActiveImage(i)}
                  className={`w-16 h-16 rounded-lg border-2 p-1 transition-all ${p.activeImage === i ? 'border-blue-500' : 'border-gray-200 hover:border-gray-300'}`}>
                  <img src={pic.Large?.Url || pic.Url} alt="" className="w-full h-full object-contain" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Accordion: Product Details */}
        <div className="border-b border-gray-200">
          <button onClick={() => toggle('details')} className="w-full px-5 py-4 flex items-center justify-between">
            <span className="text-[15px] font-semibold text-gray-900">تفاصيل المنتج</span>
            <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${openSec === 'details' ? 'rotate-90' : ''}`} />
          </button>
          {openSec === 'details' && (
            <div className="px-5 pb-5 text-sm text-gray-600 leading-7">
              {productDetail?.FeatureBullets?.length > 0 && (
                <ul className="space-y-1.5 mb-3 list-disc pr-4">{productDetail.FeatureBullets.map((b,i) => <li key={i}>{b}</li>)}</ul>
              )}
              {productDetail?.Description && <p>{productDetail.Description}</p>}
              {!productDetail?.Description && !productDetail?.FeatureBullets?.length && <p className="text-gray-400">لا توجد تفاصيل</p>}
            </div>
          )}
        </div>

        {/* Accordion: Specs */}
        <div className="border-b border-gray-200">
          <button onClick={() => toggle('specs')} className="w-full px-5 py-4 flex items-center justify-between">
            <span className="text-[15px] font-semibold text-gray-900">المواصفات</span>
            <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${openSec === 'specs' ? 'rotate-90' : ''}`} />
          </button>
          {openSec === 'specs' && (
            <div className="px-5 pb-5 text-sm">
              <table className="w-full"><tbody>
                <tr className="border-b border-gray-50"><td className="py-2.5 text-gray-500 w-1/3">المزود</td><td className="py-2.5 font-medium text-gray-800">{item.VendorDisplayName || provLabel}</td></tr>
                {item.Id && <tr className="border-b border-gray-50"><td className="py-2.5 text-gray-500">SKU</td><td className="py-2.5 font-medium text-gray-800 font-mono text-xs">{item.Id.substring(0,15)}</td></tr>}
                <tr className="border-b border-gray-50"><td className="py-2.5 text-gray-500">التوفر</td><td className="py-2.5 font-medium text-emerald-600">{productDetail?.stock === 'In Stock' || !productDetail?.stock ? 'متوفر' : 'غير متوفر'}</td></tr>
                <tr className="border-b border-gray-50"><td className="py-2.5 text-gray-500">الشحن</td><td className="py-2.5 font-medium text-gray-800">شحن دولي</td></tr>
                {item.Rating > 0 && <tr><td className="py-2.5 text-gray-500">التقييم</td><td className="py-2.5 font-medium text-gray-800">{item.Rating} / 5</td></tr>}
              </tbody></table>
            </div>
          )}
        </div>

        {/* Title + Rating + Price */}
        <div ref={p.productInfoRef} className="px-5 pt-5 pb-5 border-b border-gray-200">
          <h1 className="text-lg font-bold text-gray-900 leading-relaxed mb-3">{item.Title}</h1>
          {(item.BoughtLastMonth || productDetail?.boughtLastMonth) && (
            <span className="inline-block mb-3 bg-red-50 text-red-600 text-[11px] font-bold px-2.5 py-1 rounded-md">آخر {item.BoughtLastMonth || productDetail?.boughtLastMonth} منتج</span>
          )}
          {(item.Rating > 0 || reviews) && (
            <div className="flex items-center gap-1.5 mb-3">
              {[1,2,3,4,5].map(s => <Star key={s} className={`w-4 h-4 ${s <= stars ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'}`} />)}
              {reviews && <span className="text-sm text-blue-600 font-medium mr-1">{formatNum(reviews)} تقييم</span>}
            </div>
          )}
          {item.Badge && <p className="text-xs text-gray-400 mb-3">{item.Badge}</p>}
          <div className="flex items-center gap-1.5 mb-4 text-sm text-gray-500">
            <Truck className="w-4 h-4 text-blue-500" />
            <span>التوصيل لكل المحافظات</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span ref={p.priceCountRef} className="text-3xl font-black text-gray-900">{formatNum(iqd)}</span>
            <span className="text-sm text-gray-400">د.ع</span>
          </div>
          {item.OldPrice > 0 && item.OldPrice > (item.Price?.OriginalPrice || 0) && (
            <span className="text-sm text-gray-400 line-through">{formatNum(p.applyCommission(Math.round(item.OldPrice * (p.prov.currency === 'USD' ? p.USD_TO_IQD : p.USD_TO_IQD / p.CNY_TO_USD))))} د.ع</span>
          )}
        </div>

        {/* Options / Variants */}
        {((productDetail?.Configurators?.length > 0) || (productDetail?.variants?.length > 0)) && (
          <div className="px-5 py-5 border-b border-gray-200">
            {productDetail?.Configurators && productDetail.Configurators.map(cfg => (
              <div key={cfg.Pid} className="mb-5 last:mb-0">
                <p className="text-sm font-semibold text-gray-700 mb-3">{cfg.Name || 'خيار'}</p>
                <div className="flex flex-wrap gap-2">
                  {(cfg.Values || []).map(val => {
                    const sel = p.selectedConfigs[cfg.Pid] === val.Vid
                    return (
                      <button key={val.Vid} onClick={() => p.setSelectedConfigs(prev => ({...prev, [cfg.Pid]: sel ? undefined : val.Vid}))}
                        className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${sel ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-300 text-gray-700 hover:border-gray-400'}`}>
                        {val.Name || val.Value || val.Vid}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
            {productDetail?.variants && productDetail.variants.map((variant, vi) => (
              <div key={vi} className="mb-5 last:mb-0">
                <p className="text-sm font-semibold text-gray-700 mb-3">{variant.title || 'خيار'}</p>
                <div className="flex flex-wrap gap-2">
                  {(variant.items || []).map((opt, oi) => {
                    const loading = p.loadingVariant === opt.asin
                    const cur = opt.selected || opt.asin === item.Id
                    return (
                      <button key={opt.asin || oi} disabled={loading || !!p.loadingVariant}
                        onClick={() => { if (opt.asin && !cur) p.loadAmazonVariant(opt.asin) }}
                        className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${cur ? 'border-blue-500 bg-blue-50 text-blue-700' : loading ? 'border-blue-200 bg-blue-50/50 animate-pulse' : p.loadingVariant ? 'border-gray-200 opacity-50' : 'border-gray-300 text-gray-700 hover:border-gray-400'}`}>
                        {loading && <Loader2 className="w-3 h-3 animate-spin inline mr-1" />}
                        {opt.name || opt.asin}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* AI Explain Button */}
        <div className="px-5 py-4 border-b border-gray-200">
          <button onClick={() => {
            p.setShowExplainSheet(true)
            p.setExplainMessages([])
            const ctx = 'اشرح هذا المنتج بالعربي العراقي بشكل مبسط وواضح. اذكر: شنو هذا المنتج فوائده الرئيسية ولمن مناسب. لا تسأل المستخدم أي سؤال اشرح مباشرة:\n\nProduct: ' + item.Title + '\nPrice: ' + formatNum(iqd) + ' IQD\nRating: ' + (item.Rating || 'N/A') + (item.Badge ? '\nBadge: ' + item.Badge : '') + (reviews ? '\nReviews count: ' + reviews : '') + (item.BoughtLastMonth ? '\nBought last month: ' + item.BoughtLastMonth : '')
            p.askExplain('اشرح لي هذا المنتج', ctx)
          }} className="w-full flex items-center justify-center gap-3 bg-gradient-to-l from-blue-500 to-indigo-600 rounded-xl px-5 py-3.5 active:scale-[0.97] transition-all">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
            </svg>
            <span className="text-[14px] font-bold text-white">اشرح لي هذا المنتج</span>
          </button>
        </div>

        {/* Related Products */}
        {productDetail?.relatedProducts?.length > 0 && (
          <div className="px-5 py-5">
            <h3 className="text-[15px] font-bold text-gray-900 mb-4">منتجات قد تعجبك</h3>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {productDetail.relatedProducts.map((rp, i) => {
                const rpPrice = rp.price ? p.formatPrice({OriginalPrice: rp.price, OriginalCurrencyCode: 'USD'}, 'USD') : null
                return (
                  <button key={rp.asin || i} onClick={() => { if (rp.asin) p.loadProductById(rp.asin, 'amazon') }}
                    className="flex-shrink-0 w-[140px] bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-all active:scale-[0.97]">
                    <div className="w-full h-[120px] bg-gray-50">{rp.image && <img src={rp.image} alt="" className="w-full h-full object-contain p-2" />}</div>
                    <div className="p-2.5">
                      <p className="text-[11px] text-gray-600 line-clamp-2 leading-snug font-medium mb-2">{rp.title}</p>
                      {rpPrice && <p className="text-[13px] font-bold text-gray-900">{formatNum(rpPrice.iqd)} <span className="text-[10px] text-gray-400">د.ع</span></p>}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Extra Images */}
        {pics.length > 2 && (
          <div className="mx-5 mb-4 rounded-xl overflow-hidden">
            {pics.slice(2).map((pic, i) => <img key={i} src={pic.Large?.Url || pic.Url} alt="" className="w-full" loading="lazy" />)}
          </div>
        )}

      </div>

      {/* Toast */}
      {p.addedToast && (
        <div ref={el => { if (el) toastAnim(el, true) }} className="fixed top-14 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-emerald-600 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 min-w-[280px]">
            <CheckCircle2 className="w-5 h-5 text-emerald-200 flex-shrink-0" />
            <span className="text-sm font-semibold flex-1">تمت الإضافة للسلة</span>
            <button onClick={() => { p.setAddedToast(false); p.setShowCart(true) }} className="text-sm font-bold text-emerald-200 hover:text-white whitespace-nowrap">عرض</button>
          </div>
        </div>
      )}

      <ExplainSheet show={p.showExplainSheet} onClose={() => p.setShowExplainSheet(false)} productTitle={item.Title} messages={p.explainMessages} loading={p.explainLoading} onAskExplain={(q) => p.askExplain(q)} />

      {/* Bottom Bar - Flowbite style */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30">
        <div className="max-w-2xl mx-auto px-5 py-4 space-y-3">
          {/* Fav + Add to cart */}
          <div className="flex gap-3">
            <button onClick={(e) => { heartPulse(e.currentTarget); p.toggleFavorite(item) }}
              className="h-12 px-5 border border-gray-300 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-50 transition-all active:scale-95">
              <Heart className={`w-5 h-5 ${p.isFavorite(item.Id) ? 'text-red-500 fill-red-500' : 'text-gray-500'}`} />
              <span className="text-sm font-medium text-gray-700">المفضلة</span>
            </button>
            {inCart ? (
              <div className="flex-1 flex items-center gap-2">
                <div className="flex items-center bg-gray-100 rounded-lg overflow-hidden">
                  <button onClick={() => p.updateQty(item.Id, -1)} className="w-10 h-12 flex items-center justify-center hover:bg-gray-200 transition"><Minus className="w-4 h-4 text-gray-600" /></button>
                  <span className="w-8 text-center text-sm font-bold text-gray-800">{inCart.qty}</span>
                  <button onClick={() => p.updateQty(item.Id, 1)} className="w-10 h-12 flex items-center justify-center hover:bg-gray-200 transition"><Plus className="w-4 h-4 text-gray-600" /></button>
                </div>
                <button onClick={() => p.setShowCart(true)} className="flex-1 h-12 bg-blue-600 text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 hover:bg-blue-700 transition-all">
                  <ShoppingCart className="w-5 h-5" /> عرض السلة
                </button>
              </div>
            ) : (
              <button onClick={(e) => { rippleEffect(e); p.flyToCart(e.currentTarget, '[data-cart-icon]'); p.addToCart(item) }}
                className="flex-1 h-12 bg-blue-600 text-white rounded-lg font-bold text-[15px] flex items-center justify-center gap-2.5 hover:bg-blue-700 transition-all active:scale-[0.97]">
                <ShoppingCart className="w-5 h-5" /> أضف إلى السلة
              </button>
            )}
          </div>
        </div>
      </div>

    </div>
  )
}
