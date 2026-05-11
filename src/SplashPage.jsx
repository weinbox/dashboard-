import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { Package, ArrowLeft, Truck, ShoppingBag, LogIn, UserPlus, Loader2, X, Eye, EyeOff } from 'lucide-react'

export default function SplashPage({ onStart }) {
  const navigate = useNavigate()
  const [authMode, setAuthMode] = useState(null) // null | 'login' | 'signup'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPass, setShowPass] = useState(false)

  // Login fields
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  // Signup fields
  const [sStoreName, setSStoreName] = useState('')
  const [sUsername, setSUsername] = useState('')
  const [sPassword, setSPassword] = useState('')

  // تحقق من وجود جلسة محفوظة
  useEffect(() => {
    const saved = localStorage.getItem('afrzli_seller')
    if (saved) {
      try {
        const store = JSON.parse(saved)
        if (store && store.id) navigate('/seller', { replace: true })
      } catch {}
    }
  }, [navigate])

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) { setError('أدخل اسم المستخدم وكلمة المرور'); return }
    setLoading(true); setError('')
    const { data } = await supabase
      .from('stores').select('*').eq('username', username.trim()).eq('password', password.trim()).single()
    if (data) {
      localStorage.setItem('afrzli_seller', JSON.stringify(data))
      navigate('/seller', { replace: true })
    } else {
      setError('اسم المستخدم أو كلمة المرور غير صحيحة')
    }
    setLoading(false)
  }

  const handleSignup = async () => {
    if (!sStoreName.trim() || !sUsername.trim() || !sPassword.trim()) {
      setError('املأ جميع الحقول'); return
    }
    if (sUsername.trim().length < 3) { setError('اسم المستخدم يجب أن يكون 3 أحرف على الأقل'); return }
    if (sPassword.trim().length < 4) { setError('كلمة المرور يجب أن تكون 4 أحرف على الأقل'); return }
    setLoading(true); setError('')

    const slug = sUsername.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '')
    if (!slug) { setError('اسم المستخدم يجب أن يحتوي على أحرف إنجليزية'); setLoading(false); return }

    // تحقق من عدم وجود نفس اسم المستخدم
    const { data: existing } = await supabase.from('stores').select('id').eq('username', sUsername.trim()).single()
    if (existing) { setError('اسم المستخدم مستخدم مسبقاً — اختر اسماً آخر'); setLoading(false); return }

    const { data, error: insertErr } = await supabase.from('stores').insert({
      name: sStoreName.trim(),
      slug: slug,
      username: sUsername.trim(),
      password: sPassword.trim(),
      delivery_price: 5000,
    }).select().single()

    if (insertErr) {
      setError('حدث خطأ: ' + insertErr.message)
    } else {
      localStorage.setItem('afrzli_seller', JSON.stringify(data))
      navigate('/seller', { replace: true })
    }
    setLoading(false)
  }

  const inputClass = "w-full h-12 px-4 bg-neutral-50 border border-neutral-200 rounded-xl text-sm outline-none transition-all hover:border-neutral-300 focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"

  return (
    <div className="min-h-screen bg-white flex flex-col" dir="rtl">

      {/* Hero */}
      <div className="bg-neutral-900 px-6 pt-16 pb-14 text-center">
        <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mx-auto mb-5">
          <Package className="w-7 h-7 text-neutral-900" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">افرزلي</h1>
        <p className="text-neutral-500 text-sm">من بوكس للشحن الدولي</p>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-6 py-8 flex-1 flex flex-col w-full">

        <h2 className="text-xl font-bold text-neutral-900 mb-3">نفرز ونوصل طلباتك</h2>
        <p className="text-sm text-neutral-500 leading-relaxed mb-6">
          أرسل بضاعتك إلينا، أدخل بيانات زبائنك، ونحن نتكفّل بالفرز والتغليف والتوصيل لباب الزبون.
        </p>

        {/* Steps */}
        <div className="space-y-3.5 mb-8">
          {[
            { n: '1', t: 'أرسل بضاعتك إلينا', d: 'شحن دولي بأسعار مدعومة + تخزين مخصص' },
            { n: '2', t: 'أدخل بيانات الزبائن', d: 'اسم، هاتف، عنوان، تفاصيل المنتج' },
            { n: '3', t: 'نفرز ونغلّف ونوصّل', d: 'فرز موثّق بالكاميرات + توصيل مباشر للزبون' },
          ].map((s, i) => (
            <div key={i} className="flex items-start gap-4">
              <div className="w-9 h-9 bg-neutral-900 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0">{s.n}</div>
              <div>
                <p className="text-sm font-semibold text-neutral-900">{s.t}</p>
                <p className="text-xs text-neutral-400 mt-0.5">{s.d}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── الأسواق العالمية ── */}
        <div className="mb-8">
          {/* Banner */}
          <div className="relative bg-gradient-to-l from-blue-600 via-blue-500 to-blue-700 rounded-2xl overflow-hidden mb-6 p-5 min-h-[120px]">
            <div className="relative z-10">
              <p className="text-white/80 text-xs font-medium mb-1">نشتري لك من أي مكان!</p>
              <h3 className="text-white text-xl font-black mb-2">اطلب واختار</h3>
              <div className="flex gap-2">
                <span className="bg-white/20 backdrop-blur-sm text-white text-[11px] font-bold px-3 py-1.5 rounded-lg">🌍 عالمي</span>
                <span className="bg-white/20 backdrop-blur-sm text-white text-[11px] font-bold px-3 py-1.5 rounded-lg">🚀 سريع</span>
              </div>
            </div>
            {/* Decorative circles */}
            <div className="absolute top-2 left-4 w-20 h-20 bg-white/10 rounded-full"></div>
            <div className="absolute -bottom-4 left-12 w-16 h-16 bg-white/5 rounded-full"></div>
            <div className="absolute top-6 left-28 text-4xl opacity-30">📦</div>
          </div>

          {/* Section Title */}
          <h3 className="text-lg font-black text-neutral-800 text-center mb-4">الأسواق العالمية</h3>

          {/* ── مواقع المفرد ── */}
          <p className="text-sm font-bold text-neutral-500 text-right mb-3">مواقع المفرد</p>
          <div className="grid grid-cols-2 gap-3 mb-5">
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
          <div className="grid grid-cols-2 gap-3">
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
        </div>

        {/* Pricing */}
        <div className="bg-neutral-50 rounded-xl p-5 mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-neutral-600">عمولة الفرز لكل طلب</span>
            <span className="text-lg font-bold text-neutral-900">1,500 <span className="text-xs text-neutral-400 font-normal">د.ع</span></span>
          </div>
          <p className="text-xs text-neutral-400">تشمل: الفرز + التغليف + التجهيز + تسليم الطلب للتوصيل</p>
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-neutral-200">
            <Truck className="w-4 h-4 text-neutral-400" />
            <span className="text-xs text-neutral-500">التحاسب مباشرة بينك وبين شركة التوصيل — لا نتدخل بالأموال</span>
          </div>
        </div>

        {/* CTA: Submit Orders */}
        <button onClick={onStart}
          className="w-full h-14 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all active:scale-[0.98] mb-6">
          ابدأ بإرسال طلباتك
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Seller Section */}
        <div className="border-t border-neutral-100 pt-6">
          <div className="text-center mb-4">
            <p className="text-sm font-semibold text-neutral-700">هل أنت تاجر؟</p>
            <p className="text-xs text-neutral-400 mt-1">أنشئ متجرك الإلكتروني وأدر منتجاتك وطلباتك</p>
          </div>

          {/* Auth Mode not selected */}
          {!authMode && (
            <div className="flex gap-3">
              <button onClick={() => { setAuthMode('signup'); setError('') }}
                className="flex-1 h-12 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 text-neutral-900 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all">
                <UserPlus className="w-4 h-4" /> إنشاء متجر
              </button>
              <button onClick={() => { setAuthMode('login'); setError('') }}
                className="flex-1 h-12 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 text-neutral-900 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all">
                <LogIn className="w-4 h-4" /> تسجيل دخول
              </button>
            </div>
          )}

          {/* Login Form */}
          {authMode === 'login' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1.5">اسم المستخدم</label>
                <input type="text" dir="ltr" placeholder="username" value={username}
                  onChange={e => setUsername(e.target.value)} className={inputClass + " text-left"} />
              </div>
              <div className="relative">
                <label className="block text-xs font-medium text-neutral-500 mb-1.5">كلمة المرور</label>
                <input type={showPass ? 'text' : 'password'} dir="ltr" placeholder="••••" value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  className={inputClass + " text-left pl-12"} />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute left-3 top-[34px] text-neutral-400 hover:text-neutral-600">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {error && <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">{error}</p>}
              <button onClick={handleLogin} disabled={loading}
                className={`w-full h-12 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${loading ? 'bg-neutral-200 text-neutral-400' : 'bg-neutral-900 hover:bg-neutral-800 text-white active:scale-[0.98]'}`}>
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> جاري الدخول...</> : <><LogIn className="w-4 h-4" /> دخول</>}
              </button>
              <button onClick={() => { setAuthMode(null); setError('') }}
                className="w-full text-xs text-neutral-400 hover:text-neutral-600 py-2 transition-colors">
                ← رجوع
              </button>
            </div>
          )}

          {/* Signup Form */}
          {authMode === 'signup' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1.5">اسم المتجر</label>
                <input type="text" placeholder="مثال: متجر أحمد" value={sStoreName}
                  onChange={e => setSStoreName(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1.5">اسم المستخدم (بالإنجليزية)</label>
                <input type="text" dir="ltr" placeholder="ahmed" value={sUsername}
                  onChange={e => setSUsername(e.target.value)} className={inputClass + " text-left"} />
              </div>
              <div className="relative">
                <label className="block text-xs font-medium text-neutral-500 mb-1.5">كلمة المرور</label>
                <input type={showPass ? 'text' : 'password'} dir="ltr" placeholder="••••" value={sPassword}
                  onChange={e => setSPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSignup()}
                  className={inputClass + " text-left pl-12"} />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute left-3 top-[34px] text-neutral-400 hover:text-neutral-600">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {error && <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">{error}</p>}
              <button onClick={handleSignup} disabled={loading}
                className={`w-full h-12 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${loading ? 'bg-neutral-200 text-neutral-400' : 'bg-neutral-900 hover:bg-neutral-800 text-white active:scale-[0.98]'}`}>
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> جاري الإنشاء...</> : <><UserPlus className="w-4 h-4" /> أنشئ متجرك</>}
              </button>
              <button onClick={() => { setAuthMode(null); setError('') }}
                className="w-full text-xs text-neutral-400 hover:text-neutral-600 py-2 transition-colors">
                ← رجوع
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-neutral-400 mt-8">
          افرزلي &copy; {new Date().getFullYear()} — بوكس للشحن الدولي
        </p>
      </div>
    </div>
  )
}
