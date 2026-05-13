import { useState, useEffect, useRef } from 'react'
import { X, Bot, Loader2, Send } from 'lucide-react'

export default function ExplainSheet({ show, onClose, productTitle, onAskExplain, messages, loading }) {
  const [input, setInput] = useState('')
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const titleLower = (productTitle || '').toLowerCase()

  const isClothing = /shoe|shirt|dress|jacket|pants|size|wear|cloth|sneaker|boot|hoodie/i.test(titleLower)
  const isElectronics = /phone|laptop|tablet|earbuds|headphone|speaker|charger|cable|watch|camera|tv|monitor|keyboard|mouse/i.test(titleLower)
  const isSupplement = /vitamin|supplement|protein|collagen|omega|probiotic|mineral|capsule|tablet|mg/i.test(titleLower)
  const isBeauty = /cream|serum|moistur|sunscreen|makeup|lipstick|foundation|perfume|shampoo|conditioner|skin|hair|oil/i.test(titleLower)

  let suggestions = []
  if (isClothing) {
    suggestions = [
      { label: '📏 ساعدني بالمقاس', q: 'ساعدني اختار المقاس المناسب، اسألني عن طولي ووزني' },
      { label: '🎨 في ألوان ثانية؟', q: 'هل هذا المنتج متوفر بألوان أو موديلات ثانية؟' },
      { label: '🧼 شلون أغسله؟', q: 'شلون الطريقة الصحيحة لغسل وعناية بهذا المنتج؟' },
    ]
  } else if (isElectronics) {
    suggestions = [
      { label: '🔌 يشتغل بالعراق؟', q: 'هل هذا الجهاز يشتغل بالعراق؟ الفولتية والشاحن متوافقين؟' },
      { label: '📱 شنو المواصفات؟', q: 'شنو أهم مواصفات هذا المنتج بالتفصيل؟' },
      { label: '🔄 شنو البدائل؟', q: 'شنو أفضل بدائل لهذا المنتج بنفس السعر؟' },
    ]
  } else if (isSupplement) {
    suggestions = [
      { label: '💊 شلون استخدمه؟', q: 'شلون استخدم هذا المنتج؟ الجرعة والوقت المناسب؟' },
      { label: '⚠️ في آثار جانبية؟', q: 'هل في آثار جانبية أو تحذيرات لهذا المنتج؟' },
      { label: '🤝 يتعارض مع أدوية؟', q: 'هل يتعارض مع أدوية أو مكملات ثانية؟' },
    ]
  } else if (isBeauty) {
    suggestions = [
      { label: '🧴 لأي نوع بشرة؟', q: 'هل هذا المنتج مناسب لكل أنواع البشرة؟' },
      { label: '📋 شلون استخدمه؟', q: 'شنو الطريقة الصحيحة لاستخدام هذا المنتج؟' },
      { label: '🌿 المكونات آمنة؟', q: 'هل مكونات هذا المنتج طبيعية وآمنة؟' },
    ]
  } else {
    suggestions = [
      { label: '📦 شنو المحتويات؟', q: 'شنو يجي ويا هذا المنتج بالعلبة؟' },
      { label: '🔧 يحتاج تركيب؟', q: 'هل يحتاج تركيب أو إعداد بعد ما يوصل؟' },
      { label: '🔄 شنو البدائل؟', q: 'شنو أفضل بدائل لهذا المنتج؟' },
    ]
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    onAskExplain(text)
  }

  if (!show) return null

  return (
    <div className="fixed inset-0 z-[55] flex flex-col justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative bg-white rounded-t-3xl max-h-[80vh] flex flex-col" dir="rtl" onClick={e => e.stopPropagation()}>
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-2.5 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-[14px] font-bold text-gray-800">المساعد الذكي</p>
              <p className="text-[10px] text-gray-400">يساعدك تفهم المنتج</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-all">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-[200px]">
          {messages.map((msg, i) => (
            msg.role === 'assistant' ? (
              <div key={i} className="flex gap-2.5 items-start">
                <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5 text-blue-600" />
                </div>
                <div className="bg-gray-50 rounded-2xl rounded-tr-sm px-4 py-3 max-w-[90%]">
                  <p className="text-[14px] text-gray-800 leading-[1.8] whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ) : (
              <div key={i} className="flex justify-end">
                <div className="bg-blue-500 text-white rounded-2xl rounded-tl-sm px-4 py-2.5 max-w-[85%]">
                  <p className="text-[13px] leading-relaxed">{msg.content}</p>
                </div>
              </div>
            )
          ))}

          {loading && (
            <div className="flex gap-2.5 items-center">
              <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />
              </div>
              <div className="bg-gray-50 rounded-2xl px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          {/* Suggestions after first AI response */}
          {!loading && messages.filter(m => m.role === 'assistant').length > 0 && (
            <div className="pt-1">
              <p className="text-[10px] text-gray-400 font-semibold mb-2 mr-10">اسأل أيضاً:</p>
              <div className="flex flex-wrap gap-1.5 mr-10">
                {suggestions.map((s, i) => (
                  <button key={i} onClick={() => onAskExplain(s.q)}
                    className="bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-[11px] font-semibold text-gray-600 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 active:scale-95 transition-all">
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="flex-shrink-0 border-t border-gray-100 px-4 py-3 bg-gray-50/80">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="اكتب سؤالك هنا..."
              disabled={loading}
              className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-[13px] text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all disabled:opacity-50"
            />
            <button onClick={handleSend} disabled={!input.trim() || loading}
              className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center text-white disabled:opacity-30 active:scale-90 transition-all shadow-sm">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
