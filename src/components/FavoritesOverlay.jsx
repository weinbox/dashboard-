import { Heart, X } from 'lucide-react'

export default function FavoritesOverlay({ favorites, formatPrice, formatNum, prov, toggleFavorite, setShowFavorites, setSelectedProduct }) {
  return (
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
              const pr = formatPrice(item.Price, item._favCurrency || (item.isSerpApi ? 'USD' : prov.currency))
              return (
                <div key={item.Id} className="flex gap-3 bg-white rounded-2xl p-3.5 border border-slate-100 shadow-sm">
                  <img src={item.MainPictureUrl} alt="" className="w-20 h-20 rounded-xl object-cover bg-slate-50 flex-shrink-0 cursor-pointer" onClick={() => { setShowFavorites(false); setSelectedProduct(item) }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-slate-800 line-clamp-2 cursor-pointer" onClick={() => { setShowFavorites(false); setSelectedProduct(item) }}>{item.Title}</p>
                    <p className="text-[14px] font-black text-indigo-600 mt-1">{formatNum(pr.iqd)} <span className="text-[10px] text-slate-400 font-normal">د.ع</span></p>
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
  )
}
