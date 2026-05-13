import { useState, useEffect, useRef } from 'react'
import { X, Bot, Loader2, ChevronLeft } from 'lucide-react'

export default function ExplainSheet({ show, onClose, productTitle, productContext, onAskExplain, messages, loading }) {
  const bottomRef = useRef(null)
  const titleLower = (productTitle || '').toLowerCase()

  // Smart suggested questions based on product type
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

  if (!show) return null

  return (
    <div className="fixed inset-0 z-[55] flex flex-col justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative bg-white rounded-t-3xl max-h-[75vh] flex flex-col"
        dir="rtl"
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-2.5 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center">
              <Bot className="w-4.5 h-4.5 text-blue-600" />
            </div>
            <p className="text-[14px] font-bold text-gray-800">المساعد الذكي</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {messages.filter(m => m.role === 'assistant').map((msg, i) => (
            <div key={i} className="bg-blue-50 rounded-2xl rounded-tr-sm px-4 py-3">
              <p className="text-[14px] text-gray-800 leading-relaxed whitespace-pre-wrap">{msg.content}</p>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 py-3">
              <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
              <span className="text-[13px] text-gray-400">جاري التحليل...</span>
            </div>
          )}

          {/* Suggested Questions - show after first response */}
          {!loading && messages.filter(m => m.role === 'assistant').length > 0 && (
            <div className="pt-2">
              <p className="text-[11px] text-gray-400 font-semibold mb-2.5">أسئلة إضافية:</p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => onAskExplain(s.q)}
                    className="bg-white border border-gray-200 rounded-xl px-3.5 py-2 text-[12px] font-semibold text-gray-700 hover:bg-gray-50 active:scale-95 transition-all"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  )
}
