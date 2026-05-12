import { useNavigate } from 'react-router-dom'
import { ShoppingBag } from 'lucide-react'

export default function SplashPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-white flex flex-col" dir="rtl">

      {/* Hero */}
      <div className="relative bg-gradient-to-l from-blue-600 via-blue-500 to-blue-700 px-6 pt-14 pb-12 text-center overflow-hidden">
        <div className="absolute top-4 left-6 w-24 h-24 bg-white/10 rounded-full"></div>
        <div className="absolute -bottom-6 left-16 w-20 h-20 bg-white/5 rounded-full"></div>
        <div className="relative z-10">
          <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <ShoppingBag className="w-7 h-7 text-blue-600" />
          </div>
          <h1 className="text-2xl font-black text-white mb-1">الأسواق العالمية</h1>
          <p className="text-blue-100 text-sm">نشتري لك من أي مكان في العالم!</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-5 py-8 flex-1 flex flex-col w-full">

        {/* ── مواقع المفرد ── */}
        <p className="text-sm font-bold text-neutral-500 text-right mb-3">مواقع المفرد</p>
        <div className="grid grid-cols-2 gap-3 mb-6">
          {/* Taobao + Tmall */}
          <button onClick={() => navigate('/china/taobao')}
            className="relative h-[72px] bg-gradient-to-l from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center gap-2 overflow-hidden hover:shadow-lg hover:shadow-orange-200/50 transition-all active:scale-[0.97]">
            <div className="relative z-10 text-center">
              <div className="flex items-center justify-center gap-1.5">
                <svg viewBox="0 0 32 32" className="w-7 h-7" fill="none">
                  <circle cx="16" cy="16" r="15" fill="white" fillOpacity="0.2"/>
                  <text x="16" y="20" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold" fontFamily="sans-serif">淘</text>
                </svg>
                <div className="text-right">
                  <p className="text-white text-sm font-black leading-tight">Taobao</p>
                  <p className="text-white/70 text-[9px] font-bold">天猫 Tmall</p>
                </div>
              </div>
            </div>
          </button>

          {/* Amazon */}
          <button onClick={() => navigate('/china/amazon')}
            className="relative h-[72px] bg-white border-2 border-neutral-200 rounded-2xl flex items-center justify-center overflow-hidden hover:shadow-lg hover:border-neutral-300 transition-all active:scale-[0.97]">
            <div className="relative z-10 text-center">
              <svg viewBox="0 0 120 40" className="w-20 h-8">
                <text x="60" y="24" textAnchor="middle" fill="#232F3E" fontSize="18" fontWeight="bold" fontFamily="Arial, sans-serif">amazon</text>
                <path d="M28 30 C42 36 78 36 92 30" stroke="#FF9900" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
                <path d="M86 27 L92 30 L89 34" stroke="#FF9900" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </button>

          {/* Shein */}
          <button onClick={() => navigate('/china/shein')}
            className="relative h-[72px] bg-gradient-to-l from-neutral-800 to-neutral-900 rounded-2xl flex items-center justify-center overflow-hidden hover:shadow-lg hover:shadow-neutral-300/50 transition-all active:scale-[0.97]">
            <span className="text-white text-2xl font-black tracking-wider">SHEIN</span>
          </button>

          {/* eBay */}
          <a href="https://www.ebay.com" target="_blank" rel="noopener noreferrer"
            className="relative h-[72px] bg-white border-2 border-neutral-200 rounded-2xl flex items-center justify-center overflow-hidden hover:shadow-lg hover:border-neutral-300 transition-all active:scale-[0.97]">
            <div className="flex items-center">
              <span className="text-2xl font-black" style={{ fontFamily: 'sans-serif' }}>
                <span className="text-red-500">e</span>
                <span className="text-blue-500">b</span>
                <span className="text-amber-500">a</span>
                <span className="text-green-500">y</span>
              </span>
            </div>
          </a>
        </div>

        {/* ── مواقع الجملة ── */}
        <p className="text-sm font-bold text-neutral-500 text-right mb-3">مواقع الجملة</p>
        <div className="grid grid-cols-2 gap-3 mb-8">
          {/* 1688 */}
          <button onClick={() => navigate('/china/1688')}
            className="relative h-[80px] bg-gradient-to-l from-orange-500 to-red-500 rounded-2xl flex items-center justify-center overflow-hidden hover:shadow-lg hover:shadow-orange-200/50 transition-all active:scale-[0.97]">
            <span className="text-white text-4xl font-black" style={{ fontFamily: 'Arial, sans-serif' }}>1688</span>
          </button>

          {/* Alibaba */}
          <a href="https://www.alibaba.com" target="_blank" rel="noopener noreferrer"
            className="relative h-[80px] bg-gradient-to-l from-orange-400 to-orange-500 rounded-2xl flex items-center justify-center overflow-hidden hover:shadow-lg hover:shadow-orange-200/50 transition-all active:scale-[0.97]">
            <div className="text-center">
              <span className="text-white text-xl font-black" style={{ fontFamily: 'sans-serif' }}>Alibaba</span>
              <span className="text-white/80 text-xs font-bold">.com</span>
            </div>
          </a>
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-neutral-400 mt-auto pt-6">
          بوكس للشحن الدولي &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
