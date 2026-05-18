import { useNavigate } from 'react-router-dom'
import { ShoppingBag, Globe, Truck, Shield, Star, ArrowLeft, Sparkles, TrendingUp, Store } from 'lucide-react'

const STORES = {
  retail: [
    {
      id: 'taobao',
      name: 'Taobao',
      subtitle: '天猫 Tmall',
      gradient: 'from-orange-500 to-amber-500',
      hoverShadow: 'hover:shadow-orange-200/60',
      icon: '淘',
      route: true,
    },
    {
      id: 'amazon',
      name: 'Amazon',
      subtitle: 'أمازون',
      gradient: 'from-slate-800 to-slate-900',
      hoverShadow: 'hover:shadow-slate-300/50',
      svgLogo: true,
      route: true,
    },
    {
      id: 'shein',
      name: 'SHEIN',
      subtitle: 'أزياء عالمية',
      gradient: 'from-pink-500 to-rose-600',
      hoverShadow: 'hover:shadow-pink-200/60',
      route: true,
    },
    {
      id: 'iherb',
      name: 'iHerb',
      subtitle: 'مكملات وصحة',
      gradient: 'from-green-500 to-emerald-600',
      hoverShadow: 'hover:shadow-green-200/60',
      route: true,
    },
    {
      id: 'bestbuy',
      name: 'Best Buy',
      subtitle: 'إلكترونيات وأجهزة',
      gradient: 'from-blue-600 to-blue-800',
      hoverShadow: 'hover:shadow-blue-200/60',
      route: true,
    },
    {
      id: 'ebay',
      name: 'eBay',
      subtitle: 'مزادات ومنتجات',
      gradient: 'from-blue-500 to-indigo-600',
      hoverShadow: 'hover:shadow-blue-200/60',
      route: true,
    },
    {
      id: 'walmart',
      name: 'Walmart',
      subtitle: 'تسوق وتوفير',
      gradient: 'from-yellow-400 to-amber-500',
      hoverShadow: 'hover:shadow-yellow-200/60',
      route: true,
    },
  ],
  wholesale: [
    {
      id: '1688',
      name: '1688',
      subtitle: 'الجملة من الصين',
      gradient: 'from-red-500 to-orange-500',
      hoverShadow: 'hover:shadow-red-200/60',
      route: true,
    },
    {
      id: 'alibaba',
      name: 'Alibaba',
      subtitle: 'B2B عالمي',
      gradient: 'from-orange-400 to-yellow-500',
      hoverShadow: 'hover:shadow-orange-200/60',
      external: 'https://www.alibaba.com',
    },
  ],
}

const FEATURES = [
  { icon: Globe, title: 'شحن دولي', desc: 'نوصل لباب بيتك' },
  { icon: Shield, title: 'ضمان المنتج', desc: 'حماية كاملة للمشتري' },
  { icon: Truck, title: 'تتبع الشحنة', desc: 'تتبع مباشر لطلبك' },
]

export default function SplashPage() {
  const navigate = useNavigate()

  const handleStoreClick = (store) => {
    if (store.external) {
      window.open(store.external, '_blank')
    } else if (store.route) {
      navigate(`/china/${store.id}`)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex flex-col" dir="rtl">

      {/* ─── Hero Section ─── */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-bl from-indigo-600 via-blue-600 to-purple-700"></div>
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-10 right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-400/10 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/3 w-32 h-32 bg-blue-300/10 rounded-full blur-2xl"></div>
        </div>

        <div className="relative z-10 px-6 pt-16 pb-14 text-center max-w-lg mx-auto">
          <div className="w-16 h-16 bg-white/15 backdrop-blur-sm rounded-3xl flex items-center justify-center mx-auto mb-5 border border-white/20 shadow-2xl">
            <ShoppingBag className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-black text-white mb-2 tracking-tight">الأسواق العالمية</h1>
          <p className="text-blue-100 text-sm leading-relaxed max-w-xs mx-auto">
            نشتري لك من أفضل المتاجر العالمية ونوصلها لباب بيتك
          </p>

          {/* Stats */}
          <div className="flex items-center justify-center gap-6 mt-6 text-white/80">
            <div className="text-center">
              <p className="text-lg font-bold text-white">+5000</p>
              <p className="text-[10px]">طلب مكتمل</p>
            </div>
            <div className="w-px h-8 bg-white/20"></div>
            <div className="text-center">
              <p className="text-lg font-bold text-white">6+</p>
              <p className="text-[10px]">متجر عالمي</p>
            </div>
            <div className="w-px h-8 bg-white/20"></div>
            <div className="text-center">
              <p className="text-lg font-bold text-white flex items-center gap-0.5 justify-center">4.9 <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" /></p>
              <p className="text-[10px]">تقييم العملاء</p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Content ─── */}
      <div className="max-w-lg mx-auto px-5 py-8 flex-1 flex flex-col w-full -mt-4">

        {/* ── Local Store Button ── */}
        <button
          onClick={() => navigate('/store')}
          className="w-full bg-white rounded-2xl shadow-sm border border-slate-100 p-4 mb-5 animate-slide-up flex items-center gap-4 hover:shadow-md hover:border-indigo-200 transition-all active:scale-[0.98] group"
        >
          <div className="w-12 h-12 bg-gradient-to-bl from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200/50 group-hover:scale-105 transition-transform">
            <Store className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 text-right">
            <p className="text-sm font-black text-slate-800">متجرنا المحلي</p>
            <p className="text-[11px] text-slate-400">منتجات مختارة بأسعار خاصة</p>
          </div>
          <ArrowLeft className="w-5 h-5 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-[-3px] transition-all" />
        </button>

        {/* ── Features Bar ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 mb-8 animate-slide-up">
          <div className="grid grid-cols-3 gap-3">
            {FEATURES.map((f, i) => (
              <div key={i} className="text-center">
                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center mx-auto mb-1.5">
                  <f.icon className="w-5 h-5 text-indigo-600" />
                </div>
                <p className="text-[11px] font-bold text-slate-800">{f.title}</p>
                <p className="text-[9px] text-slate-400">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── مواقع المفرد ── */}
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-indigo-500" />
          <p className="text-sm font-bold text-slate-700">مواقع المفرد</p>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-8">
          {STORES.retail.map((store) => (
            <button
              key={store.id}
              onClick={() => handleStoreClick(store)}
              className={`relative h-[88px] bg-gradient-to-l ${store.gradient} rounded-2xl flex flex-col items-center justify-center overflow-hidden ${store.hoverShadow} hover:shadow-lg hover:scale-[1.02] transition-all duration-200 active:scale-[0.97] group`}
            >
              <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors"></div>
              <div className="relative z-10 text-center">
                {store.svgLogo ? (
                  <svg viewBox="0 0 120 40" className="w-20 h-7 mx-auto mb-1">
                    <text x="60" y="24" textAnchor="middle" fill="white" fontSize="18" fontWeight="bold" fontFamily="Arial, sans-serif">amazon</text>
                    <path d="M28 30 C42 36 78 36 92 30" stroke="#FF9900" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
                    <path d="M86 27 L92 30 L89 34" stroke="#FF9900" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : store.icon ? (
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <svg viewBox="0 0 28 28" className="w-6 h-6" fill="none">
                      <circle cx="14" cy="14" r="13" fill="white" fillOpacity="0.2"/>
                      <text x="14" y="18" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold" fontFamily="sans-serif">{store.icon}</text>
                    </svg>
                    <p className="text-white text-base font-black">{store.name}</p>
                  </div>
                ) : (
                  <p className="text-white text-xl font-black mb-1">{store.name}</p>
                )}
                <p className="text-white/70 text-[10px] font-medium">{store.subtitle}</p>
              </div>
              <ArrowLeft className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 group-hover:text-white/60 group-hover:translate-x-[-2px] transition-all" />
            </button>
          ))}
        </div>

        {/* ── مواقع الجملة ── */}
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-orange-500" />
          <p className="text-sm font-bold text-slate-700">مواقع الجملة</p>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-8">
          {STORES.wholesale.map((store) => (
            <button
              key={store.id}
              onClick={() => handleStoreClick(store)}
              className={`relative h-[88px] bg-gradient-to-l ${store.gradient} rounded-2xl flex flex-col items-center justify-center overflow-hidden ${store.hoverShadow} hover:shadow-lg hover:scale-[1.02] transition-all duration-200 active:scale-[0.97] group`}
            >
              <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors"></div>
              <div className="relative z-10 text-center">
                <p className="text-white text-2xl font-black mb-1">{store.name}</p>
                <p className="text-white/70 text-[10px] font-medium">{store.subtitle}</p>
              </div>
              <ArrowLeft className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 group-hover:text-white/60 group-hover:translate-x-[-2px] transition-all" />
            </button>
          ))}
        </div>

        {/* ── How it works ── */}
        <div className="bg-gradient-to-l from-indigo-50 to-purple-50 rounded-2xl p-5 mb-6 border border-indigo-100/50">
          <p className="text-sm font-bold text-slate-800 mb-3">كيف نشتغل؟</p>
          <div className="space-y-3">
            {[
              { step: '1', text: 'اختر المتجر وابحث عن المنتج' },
              { step: '2', text: 'أضف للسلة وأكمل الطلب' },
              { step: '3', text: 'نشتري ونشحن لباب بيتك' },
            ].map((item) => (
              <div key={item.step} className="flex items-center gap-3">
                <div className="w-7 h-7 bg-indigo-600 rounded-full flex items-center justify-center shrink-0">
                  <span className="text-white text-xs font-bold">{item.step}</span>
                </div>
                <p className="text-xs text-slate-600 font-medium">{item.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-auto pt-6 border-t border-slate-100">
          <p className="text-[11px] text-slate-400 font-medium">
            بوكس للشحن الدولي &copy; {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  )
}
