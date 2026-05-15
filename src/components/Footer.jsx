import { useNavigate, useLocation } from 'react-router-dom'
import { Store, Globe, Heart, ShoppingCart, Mail, Phone, MapPin } from 'lucide-react'

export default function Footer() {
  const navigate = useNavigate()
  const location = useLocation()

  // لا تعرض Footer في صفحات ChinaShop (عندها bottom bar خاص)
  const hiddenPaths = ['/china/', '/china-checkout', '/ax9admin']
  if (hiddenPaths.some(p => location.pathname.startsWith(p))) return null

  return (
    <footer className="bg-slate-900 text-white mt-12" dir="rtl">
      <div className="max-w-5xl mx-auto px-5 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* About */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-bl from-indigo-400 to-purple-500 rounded-lg flex items-center justify-center">
                <Store className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-black">متجري</span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              متجرك الموثوق للتسوق المحلي والعالمي. نوفر لك أفضل المنتجات بأسعار منافسة مع خدمة توصيل سريعة.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-sm font-bold mb-4">روابط سريعة</h4>
            <ul className="space-y-2.5">
              <li>
                <button onClick={() => navigate('/store')} className="text-sm text-slate-400 hover:text-white transition-colors flex items-center gap-2">
                  <Store className="w-3.5 h-3.5" /> المتجر المحلي
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/china/amazon')} className="text-sm text-slate-400 hover:text-white transition-colors flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5" /> الأسواق العالمية
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/store/wishlist')} className="text-sm text-slate-400 hover:text-white transition-colors flex items-center gap-2">
                  <Heart className="w-3.5 h-3.5" /> المفضلة
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/store/cart')} className="text-sm text-slate-400 hover:text-white transition-colors flex items-center gap-2">
                  <ShoppingCart className="w-3.5 h-3.5" /> سلة التسوق
                </button>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-sm font-bold mb-4">تواصل معنا</h4>
            <ul className="space-y-2.5">
              <li className="text-sm text-slate-400 flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-indigo-400" />
                <span dir="ltr">+964 XXX XXX XXXX</span>
              </li>
              <li className="text-sm text-slate-400 flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-indigo-400" />
                info@mystore.com
              </li>
              <li className="text-sm text-slate-400 flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                العراق — بغداد
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-slate-800 mt-8 pt-6 text-center">
          <p className="text-xs text-slate-500">© {new Date().getFullYear()} متجري. جميع الحقوق محفوظة.</p>
        </div>
      </div>
    </footer>
  )
}
