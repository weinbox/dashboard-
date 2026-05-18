import { useEffect, useRef, useCallback } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

// stagger fade-in for product cards grid
export function useStaggerIn(dep) {
  const ref = useRef(null)
  useEffect(() => {
    if (!ref.current || !ref.current.children.length) return
    gsap.fromTo(ref.current.children,
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, stagger: 0.05, duration: 0.4, ease: 'power3.out', overwrite: true }
    )
  }, [dep])
  return ref
}

// zoom-in for product image
export function useZoomIn(dep) {
  const ref = useRef(null)
  useEffect(() => {
    if (!ref.current) return
    gsap.fromTo(ref.current,
      { scale: 0.85, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.5, ease: 'power2.out' }
    )
  }, [dep])
  return ref
}

// slide up for elements (buttons, info sections)
export function useSlideUp(dep) {
  const ref = useRef(null)
  useEffect(() => {
    if (!ref.current || !ref.current.children.length) return
    gsap.fromTo(ref.current.children,
      { opacity: 0, y: 25 },
      { opacity: 1, y: 0, stagger: 0.08, duration: 0.45, ease: 'power2.out', delay: 0.15 }
    )
  }, [dep])
  return ref
}

// counter animation for price
export function useCountUp(targetValue, dep) {
  const ref = useRef(null)
  useEffect(() => {
    if (!ref.current || !targetValue) return
    // حفظ النص الأصلي بعد الرقم (مثل " د.ع")
    const el = ref.current
    const priceNode = el.childNodes[0] // النص الأول (الرقم)
    if (!priceNode || priceNode.nodeType !== 3) return // تأكد أنه text node
    const obj = { val: 0 }
    gsap.to(obj, {
      val: targetValue,
      duration: 0.8,
      ease: 'power2.out',
      onUpdate: () => {
        if (priceNode) {
          priceNode.textContent = Math.round(obj.val).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') + ' '
        }
      }
    })
  }, [targetValue, dep])
  return ref
}

// bounce + fly to cart animation
export function useAddToCartAnim() {
  const flyToCart = useCallback((buttonEl, cartIconSelector) => {
    if (!buttonEl) return
    const cartIcon = document.querySelector(cartIconSelector)
    if (!cartIcon) {
      gsap.fromTo(buttonEl, { scale: 1 }, { scale: 1.15, duration: 0.15, yoyo: true, repeat: 1, ease: 'power2.out' })
      return
    }
    gsap.fromTo(buttonEl, { scale: 1 }, { scale: 1.12, duration: 0.12, yoyo: true, repeat: 1, ease: 'power2.out' })
    const rect = buttonEl.getBoundingClientRect()
    const cartRect = cartIcon.getBoundingClientRect()
    const dot = document.createElement('div')
    dot.style.cssText = 'position:fixed;z-index:9999;width:14px;height:14px;border-radius:50%;background:#3b82f6;pointer-events:none;box-shadow:0 2px 8px rgba(59,130,246,0.5);'
    dot.style.left = rect.left + rect.width / 2 - 7 + 'px'
    dot.style.top = rect.top + rect.height / 2 - 7 + 'px'
    document.body.appendChild(dot)
    gsap.to(dot, {
      left: cartRect.left + cartRect.width / 2 - 7,
      top: cartRect.top + cartRect.height / 2 - 7,
      scale: 0.4,
      duration: 0.55,
      ease: 'power2.in',
      onComplete: () => {
        dot.remove()
        gsap.fromTo(cartIcon, { scale: 1 }, { scale: 1.35, duration: 0.15, yoyo: true, repeat: 1, ease: 'power2.out' })
      }
    })
  }, [])
  return flyToCart
}

// ScrollTrigger - reveal elements on scroll
export function useScrollReveal() {
  const ref = useRef(null)
  useEffect(() => {
    if (!ref.current || !ref.current.children.length) return
    const children = ref.current.children
    gsap.fromTo(children,
      { opacity: 0, y: 40 },
      {
        opacity: 1, y: 0, stagger: 0.1, duration: 0.5, ease: 'power2.out',
        scrollTrigger: {
          trigger: ref.current,
          start: 'top 85%',
          toggleActions: 'play none none none',
        }
      }
    )
    return () => ScrollTrigger.getAll().forEach(t => t.kill())
  }, [])
  return ref
}

// Page transition - fade/slide in whole container
export function usePageTransition(dep) {
  const ref = useRef(null)
  useEffect(() => {
    if (!ref.current) return
    gsap.fromTo(ref.current,
      { opacity: 0, x: -30 },
      { opacity: 1, x: 0, duration: 0.35, ease: 'power2.out' }
    )
  }, [dep])
  return ref
}

// Heart pulse animation for favorites
export function heartPulse(el) {
  if (!el) return
  gsap.fromTo(el, { scale: 1 }, { scale: 1.5, duration: 0.15, yoyo: true, repeat: 1, ease: 'power2.out' })
}

// Toast slide-in/out animation
export function toastAnim(el, show) {
  if (!el) return
  if (show) {
    gsap.fromTo(el, { y: -30, opacity: 0, scale: 0.9 }, { y: 0, opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(1.7)' })
  } else {
    gsap.to(el, { y: -20, opacity: 0, scale: 0.9, duration: 0.25, ease: 'power2.in' })
  }
}

// Swipe to delete animation
export function swipeDelete(el, onComplete) {
  if (!el) return
  gsap.to(el, {
    x: -300, opacity: 0, height: 0, padding: 0, margin: 0,
    duration: 0.4, ease: 'power2.in',
    onComplete: () => { if (onComplete) onComplete() }
  })
}

// Ripple effect on button click
export function rippleEffect(e) {
  const btn = e.currentTarget
  const rect = btn.getBoundingClientRect()
  const ripple = document.createElement('div')
  const size = Math.max(rect.width, rect.height)
  const x = e.clientX - rect.left - size / 2
  const y = e.clientY - rect.top - size / 2
  ripple.style.cssText = 'position:absolute;border-radius:50%;background:rgba(255,255,255,0.3);pointer-events:none;width:' + size + 'px;height:' + size + 'px;left:' + x + 'px;top:' + y + 'px;transform:scale(0);'
  btn.style.position = 'relative'
  btn.style.overflow = 'hidden'
  btn.appendChild(ripple)
  gsap.to(ripple, { scale: 2.5, opacity: 0, duration: 0.6, ease: 'power2.out', onComplete: () => ripple.remove() })
}
