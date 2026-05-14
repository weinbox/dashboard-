import { useEffect, useRef, useCallback } from 'react'
import gsap from 'gsap'

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
    const obj = { val: 0 }
    gsap.to(obj, {
      val: targetValue,
      duration: 0.8,
      ease: 'power2.out',
      onUpdate: () => {
        if (ref.current) {
          ref.current.textContent = Math.round(obj.val).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
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
    // bounce the button
    gsap.fromTo(buttonEl, { scale: 1 }, { scale: 1.12, duration: 0.12, yoyo: true, repeat: 1, ease: 'power2.out' })
    // create flying dot
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
        // pulse cart badge
        gsap.fromTo(cartIcon, { scale: 1 }, { scale: 1.35, duration: 0.15, yoyo: true, repeat: 1, ease: 'power2.out' })
      }
    })
  }, [])
  return flyToCart
}
