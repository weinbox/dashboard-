import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'

const SplashPage = lazy(() => import('./SplashPage'))
const StorePage = lazy(() => import('./StorePage'))
const LocalProductPage = lazy(() => import('./LocalProductPage'))
const StoreCart = lazy(() => import('./StoreCart'))
const StoreCheckout = lazy(() => import('./StoreCheckout'))
const StoreWishlist = lazy(() => import('./StoreWishlist'))
const ChinaShop = lazy(() => import('./ChinaShop'))
const ChinaCheckout = lazy(() => import('./ChinaCheckout'))
const AdminPanel = lazy(() => import('./AdminPanel'))

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="w-10 h-10 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto"></div>
        <p className="text-sm text-slate-400 mt-3 font-medium">جاري التحميل...</p>
      </div>
    </div>
  )
}

function App() {
  return (
    <>
      <Navbar />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<SplashPage />} />
          <Route path="/store" element={<StorePage />} />
          <Route path="/store/product/:id" element={<LocalProductPage />} />
          <Route path="/store/cart" element={<StoreCart />} />
          <Route path="/store/checkout" element={<StoreCheckout />} />
          <Route path="/store/wishlist" element={<StoreWishlist />} />
          <Route path="/china/:provider" element={<ChinaShop />} />
          <Route path="/china-checkout" element={<ChinaCheckout />} />
          <Route path="/ax9admin" element={<AdminPanel />} />
        </Routes>
      </Suspense>
      <Footer />
    </>
  )
}

export default App
