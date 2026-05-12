import { Routes, Route } from 'react-router-dom'
import SplashPage from './SplashPage'
import AdminPanel from './AdminPanel'
import ChinaShop from './ChinaShop'
import ChinaCheckout from './ChinaCheckout'

function App() {
  return (
    <Routes>
      <Route path="/" element={<SplashPage />} />
      <Route path="/china/:provider" element={<ChinaShop />} />
      <Route path="/china-checkout" element={<ChinaCheckout />} />
      <Route path="/ax9admin" element={<AdminPanel />} />
    </Routes>
  )
}

export default App
