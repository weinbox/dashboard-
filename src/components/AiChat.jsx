import { useState, useEffect, useRef } from 'react'
import { X, Loader2, Send, Bot } from 'lucide-react'

export default function AiChat({ provider, onSearchResults, externalOpen, onExternalClose, initialMessage, onInitialMessageSent }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const initialMsgSentRef = useRef(false)

  useEffect(() => {
    if (externalOpen) setOpen(true)
  }, [externalOpen])

  const closeChat = () => {
    setOpen(false)
    if (onExternalClose) onExternalClose()
  }

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: 'هلا! 👋 أنا مساعدك الذكي للتسوق.\nاكتب لي شنو تدور عليه وأساعدك تلاقيه بأفضل سعر! 🛍️'
      }])
    }
  }, [open])

  useEffect(() => {
    if (open && initialMessage && !initialMsgSentRef.current && !loading) {
      initialMsgSentRef.current = true
      setTimeout(() => {
        if (typeof initialMessage === 'object' && initialMessage.displayText) {
          sendMessage(initialMessage.displayText, initialMessage.context)
        } else if (typeof initialMessage === 'string') {
          sendMessage(initialMessage)
        }
        if (onInitialMessageSent) onInitialMessageSent()
        initialMsgSentRef.current = false
      }, 500)
    }
  }, [open, initialMessage])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  const sendMessage = async (directText, hiddenContext) => {
    const text = (typeof directText === 'string' ? directText : input).trim()
    if (!text || loading) return
    
    const userMsg = { role: 'user', content: text }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    const apiMessages = newMessages.filter(m => m.role !== 'system')
    if (hiddenContext) {
      apiMessages.push({ role: 'user', content: `[سياق المنتج - لا تعرضه للمستخدم، استخدمه فقط للإجابة]:\n${hiddenContext}` })
    }

    try {
      const res = await fetch('/.netlify/functions/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
        })
      })
      const data = await res.json()
      
      if (data.action === 'search' && data.searchQuery) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply + '\n\n🔍 جاري البحث...' }])
        // Search using existing amazon-serpapi function and show in main page
        try {
          const searchRes = await fetch(`/.netlify/functions/amazon-serpapi?action=search&query=${encodeURIComponent(data.searchQuery)}&page=1`)
          const searchData = await searchRes.json()
          if (searchData.success && searchData.results && searchData.results.length > 0 && onSearchResults) {
            onSearchResults(searchData.results, searchData.totalResults || searchData.results.length)
            setMessages(prev => {
              const updated = [...prev]
              updated[updated.length - 1] = { role: 'assistant', content: data.reply + '\n\n📦 تم عرض المنتجات في صفحة البحث!' }
              return updated
            })
            setTimeout(() => closeChat(), 1200)
          } else {
            setMessages(prev => {
              const updated = [...prev]
              updated[updated.length - 1] = { role: 'assistant', content: data.reply + '\n\n⚠️ لم يتم العثور على نتائج، جرب وصف مختلف.' }
              return updated
            })
          }
        } catch (searchErr) {
          console.error('Search error:', searchErr)
          setMessages(prev => {
            const updated = [...prev]
            updated[updated.length - 1] = { role: 'assistant', content: data.reply + '\n\n⚠️ حدث خطأ بالبحث.' }
            return updated
          })
        }
      } else if (data.reply) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'عذراً، حدث خطأ. حاول مرة ثانية 🙏' }])
    }
    setLoading(false)
  }

  const quickActions = [
    { label: '🎁 أبحث عن هدية', msg: 'أبي هدية حلوة' },
    { label: '💄 منتجات عناية', msg: 'أريد منتجات عناية بالبشرة' },
    { label: '💪 مكملات', msg: 'أريد فيتامينات ومكملات' },
    { label: '📱 إلكترونيات', msg: 'أبي سماعات أو أجهزة إلكترونية' },
  ]

  return (
    <>
      {/* Chat Window */}
      {open && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-white" dir="rtl">
          {/* Chat Header */}
          <div className="bg-gradient-to-l from-blue-500 to-blue-600 px-4 py-3 flex items-center gap-3 flex-shrink-0">
            <button onClick={closeChat} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <X className="w-4 h-4 text-white" />
            </button>
            <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-[14px] font-bold text-white">مساعد الشراء الذكي</p>
              <p className="text-[11px] text-blue-100">يساعدك تلاقي أفضل المنتجات</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50">
            {messages.map((msg, i) => (
              <div key={i}>
                <div className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-5 py-3 text-[15px] leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user' 
                      ? 'bg-blue-500 text-white rounded-tl-sm' 
                      : 'bg-white text-gray-800 shadow-sm border border-gray-100 rounded-tr-sm'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {loading && (
              <div className="flex justify-end">
                <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100 rounded-tr-sm">
                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Actions - only show at start */}
            {messages.length <= 1 && !loading && (
              <div className="flex flex-wrap gap-2 justify-end mt-2">
                {quickActions.map((a, i) => (
                  <button key={i}
                    onClick={() => sendMessage(a.msg)}
                    className="bg-white border border-gray-200 rounded-full px-3.5 py-2 text-[12px] text-gray-600 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-all active:scale-95 shadow-sm">
                    {a.label}
                  </button>
                ))}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="bg-white border-t border-gray-100 px-3 py-3 flex items-center gap-2 flex-shrink-0">
            <input
              ref={inputRef}
              type="text"
              dir="auto"
              placeholder="اكتب سؤالك هنا..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); sendMessage() } }}
              className="flex-1 h-11 px-4 bg-gray-100 rounded-full text-[14px] outline-none focus:bg-white focus:ring-2 focus:ring-blue-200 border border-gray-200 focus:border-blue-300 placeholder:text-gray-400"
            />
            <button 
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              className="w-11 h-11 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 rounded-full flex items-center justify-center transition-all active:scale-90 flex-shrink-0">
              {loading ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : <Send className="w-5 h-5 text-white" />}
            </button>
          </div>
        </div>
      )}

    </>
  )
}
