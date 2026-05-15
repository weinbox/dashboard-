import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  ShoppingCart, Heart, Menu, X, Home, Store, Globe, Shield
} from 'lucide-react'

export default function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  const [cart, setCart] = useState([])
  const [favorites, setFavorites] = useState([])

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    try { setCart(JSON.parse(localStorage.getItem('store_cart') || '[]')) } catch {}
    try { setFavorites(JSON.parse(localStorage.getItem('store_favorites') || '[]')) } catch {}

    const interval = setInterval(() => {
      try { setCart(JSON.parse(localStorage.getItem('store_cart') || '[]')) } catch {}
      try { setFavorites(JSON.parse(localStorage.getItem('store_favorites') || '[]')) } catch {}
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const cartCount = cart.reduce((sum, c) => sum + (c.qty || 1), 0)
  const favCount = favorites.length

  const navLinks = [
    { path: '/', label: 'الرئيسية', icon: Home },
    { path: '/store', label: 'المتجر', icon: Store },
    { path: '/china/amazon', label: 'الأسواق العالمية', icon: Globe },
  ]

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  // لا تعرض Navbar في صفحات ChinaShop (عندها header خاص)
  const hiddenPaths = ['/china/', '/china-checkout', '/ax9admin']
  if (hiddenPaths.some(p => location.pathname.startsWith(p))) return null

  return (
    <>
      <header className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        scrolled 
          ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-100' 
          : 'bg-white border-b border-slate-100'
      }`}>
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
              <div className="w-8 h-8 bg-gradient-to-bl from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Store className="w-4 h-4 text-white" />
              </div>
              <span className="text-base font-black text-slate-900 hidden sm:block">متجري</span>
            </div>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-1" dir="rtl">
              {navLinks.map(link => (
                <button
                  key={link.path}
                  onClick={() => navigate(link.path)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive(link.path)
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <link.icon className="w-4 h-4" />
                  {link.label}
                </button>
              ))}
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-1.5">
              {/* Wishlist */}
              <button
                onClick={() => navigate('/store/wishlist')}
                className="relative w-9 h-9 rounded-lg flex items-center justify-center hover:bg-slate-100 transition-all active:scale-95"
              >
                <Heart className={`w-5 h-5 ${favCount > 0 ? 'text-pink-500 fill-pink-500' : 'text-slate-400'}`} />
                {favCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] bg-pink-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">{favCount}</span>
                )}
              </button>

              {/* Cart */}
              <button
                onClick={() => navigate('/store/cart')}
                className="relative w-9 h-9 rounded-lg flex items-center justify-center hover:bg-slate-100 transition-all active:scale-95"
              >
                <ShoppingCart className="w-5 h-5 text-slate-600" />
                {cartCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] bg-indigo-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">{cartCount}</span>
                )}
              </button>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="md:hidden w-9 h-9 rounded-lg flex items-center justify-center hover:bg-slate-100 transition-all active:scale-95"
              >
                {mobileOpen ? <X className="w-5 h-5 text-slate-600" /> : <Menu className="w-5 h-5 text-slate-600" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileOpen && (
          <div className="md:hidden border-t border-slate-100 bg-white animate-slide-down" dir="rtl">
            <div className="px-4 py-3 space-y-1">
              {navLinks.map(link => (
                <button
                  key={link.path}
                  onClick={() => { navigate(link.path); setMobileOpen(false) }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive(link.path)
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <link.icon className="w-4 h-4" />
                  {link.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>
    </>
  )
}
