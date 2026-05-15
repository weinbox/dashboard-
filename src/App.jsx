import { Routes, Route } from 'react-router-dom'
import SplashPage from './SplashPage'
import AdminPanel from './AdminPanel'
import ChinaShop from './ChinaShop'
import ChinaCheckout from './ChinaCheckout'
import StorePage from './StorePage'
import LocalProductPage from './LocalProductPage'
import StoreCart from './StoreCart'
import StoreCheckout from './StoreCheckout'
import StoreWishlist from './StoreWishlist'
import Navbar from './components/Navbar'
import Footer from './components/Footer'

function App() {
  return (
    <>
      <Navbar />
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
      <Footer />
    </>
  )
}

export default App
