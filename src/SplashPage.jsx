import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'

const INTERNATIONAL_STORES = [
  { id: 'shein', name: 'SHEIN', label: 'شي ان', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/SHEIN_logo.svg/512px-SHEIN_logo.svg.png', bg: 'bg-white' },
  { id: 'amazon', name: 'amazon', label: 'Amazon...', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Amazon_logo.svg/603px-Amazon_logo.svg.png', bg: 'bg-white' },
  { id: 'ebay', name: 'eBay', label: 'ايباي امريكا', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/EBay_logo.svg/500px-EBay_logo.svg.png', bg: 'bg-white' },
  { id: 'iherb', name: 'iHerb', label: 'أديداس', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/20/Adidas_Logo.svg/800px-Adidas_Logo.svg.png', bg: 'bg-white' },
  { id: 'bestbuy', name: 'Best Buy', label: 'مايكل كورس', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Michael_Kors_logo.svg/1200px-Michael_Kors_logo.svg.png', bg: 'bg-white' },
  { id: 'walmart', name: 'Walmart', label: 'ترندبول', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bb/Trendyol_logo.svg/512px-Trendyol_logo.svg.png', bg: 'bg-[#f27a1a]' },
  { id: 'taobao', name: 'Taobao', label: 'زارا', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fd/Zara_Logo.svg/1200px-Zara_Logo.svg.png', bg: 'bg-white' },
  { id: '1688', name: '1688', label: 'امازون تركيا', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Amazon_logo.svg/603px-Amazon_logo.svg.png', bg: 'bg-[#febd69]' },
  { id: 'alibaba', name: 'Alibaba', label: 'ترندبول ميلا', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bb/Trendyol_logo.svg/512px-Trendyol_logo.svg.png', bg: 'bg-[#5c3d8f]' },
  { id: 'noon', name: 'Noon', label: 'أون', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Noon_logo.svg/512px-Noon_logo.svg.png', bg: 'bg-[#feee00]' },
]

const LOCAL_STORES = [
  { id: 'laqta-us', name: 'لكطة امريكي', logo: '🇺🇸', bg: 'bg-gradient-to-br from-blue-100 to-red-100', emoji: true },
  { id: 'kafo', name: 'كفو', logo: '🌿', bg: 'bg-gradient-to-br from-green-100 to-emerald-50', emoji: true },
  { id: 'laqta', name: 'لكطة', logo: '🏷️', bg: 'bg-gradient-to-br from-yellow-100 to-amber-50', emoji: true },
  { id: 'sima', name: 'بطاقات سيما', logo: '💳', bg: 'bg-gradient-to-br from-purple-100 to-pink-50', emoji: true },
  { id: 'uplus', name: 'يوبلس', logo: '📦', bg: 'bg-gradient-to-br from-sky-100 to-blue-50', emoji: true },
]

const prefetchMap = {
  store: () => import('./StorePage'),
  china: () => import('./ChinaShop'),
}
const prefetched = new Set()
const prefetchRoute = (key) => {
  if (prefetched.has(key) || !prefetchMap[key]) return
  prefetched.add(key)
  prefetchMap[key]()
}

export default function SplashPage() {
  const navigate = useNavigate()

  const handleStoreClick = (store) => {
    if (store.external) {
      window.open(store.external, '_blank')
    } else {
      navigate(`/china/${store.id}`)
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5]" dir="rtl">

      {/* ─── Header ─── */}
      <header className="bg-white px-4 pt-3 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center">
            <span className="text-white text-sm font-black">بـ</span>
          </div>
          <h1 className="text-lg font-black text-slate-900">أهلاً!</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center">
            <span className="text-sm">🎯</span>
          </div>
          <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
            <span className="text-sm">🔔</span>
          </div>
          <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center">
            <span className="text-sm">🎧</span>
          </div>
        </div>
      </header>

      {/* ─── Banner ─── */}
      <div className="px-4 mt-3">
        <div className="relative w-full h-[160px] rounded-2xl overflow-hidden bg-gradient-to-l from-yellow-400 via-yellow-300 to-amber-400 shadow-md">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <p className="text-[13px] text-slate-800 font-bold">SHEIN</p>
              <p className="text-5xl font-black text-slate-900">60%</p>
              <p className="text-[11px] text-slate-700 font-bold mt-1">خصم</p>
              <p className="text-[13px] text-slate-800 font-bold mt-1">على متجر لكطة</p>
              <p className="text-[10px] text-slate-600 mt-1">* ويوصلك قبل العيد</p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── المتاجر العالمية ─── */}
      <div className="px-4 mt-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[15px] font-black text-slate-900">المتاجر العالمية</h2>
          <button className="flex items-center gap-1 text-[12px] text-slate-500 font-medium border border-slate-200 rounded-full px-3 py-1.5 bg-white">
            مشاهدة المزيد
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
          <div className="flex gap-4" style={{ minWidth: 'max-content' }}>
            {INTERNATIONAL_STORES.map((store) => (
              <button
                key={store.id}
                onClick={() => handleStoreClick(store)}
                onMouseEnter={() => prefetchRoute('china')}
                onTouchStart={() => prefetchRoute('china')}
                className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform"
              >
                <div className={`w-[72px] h-[72px] ${store.bg} rounded-2xl border border-slate-200 flex items-center justify-center p-2.5 shadow-sm`}>
                  <img src={store.logo} alt={store.name} className="w-full h-full object-contain" loading="lazy" />
                </div>
                <span className="text-[11px] text-slate-600 font-medium max-w-[72px] truncate text-center">{store.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─── المتاجر المحلية ─── */}
      <div className="px-4 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[15px] font-black text-slate-900">المتاجر المحلية</h2>
          <button className="flex items-center gap-1 text-[12px] text-slate-500 font-medium border border-slate-200 rounded-full px-3 py-1.5 bg-white">
            مشاهدة المزيد
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
          <div className="flex gap-4" style={{ minWidth: 'max-content' }}>
            {LOCAL_STORES.map((store) => (
              <button
                key={store.id}
                onClick={() => navigate('/store')}
                onMouseEnter={() => prefetchRoute('store')}
                onTouchStart={() => prefetchRoute('store')}
                className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform"
              >
                <div className={`w-[72px] h-[72px] ${store.bg} rounded-2xl border border-slate-200 flex items-center justify-center shadow-sm`}>
                  {store.emoji ? (
                    <span className="text-3xl">{store.logo}</span>
                  ) : (
                    <img src={store.logo} alt={store.name} className="w-full h-full object-contain p-2" loading="lazy" />
                  )}
                </div>
                <span className="text-[11px] text-slate-600 font-medium max-w-[72px] truncate text-center">{store.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─── CTA ─── */}
      <div className="px-4 mt-8 mb-6">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="flex-1">
            <h3 className="text-[15px] font-black text-slate-900 leading-relaxed">ابتدي رحلة تسوق مميزة وياه سما</h3>
          </div>
          <button
            onClick={() => navigate('/store')}
            className="bg-gradient-to-l from-green-400 to-emerald-500 text-white text-[13px] font-bold px-5 py-3 rounded-full shadow-lg shadow-emerald-200/50 whitespace-nowrap active:scale-95 transition-transform"
          >
            انشئ حسابك
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-4 border-t border-slate-200 bg-white mt-4">
        <p className="text-[11px] text-slate-400 font-medium">
          بوكس للشحن الدولي &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
