import { useEffect, useRef } from 'react'
import gsap from 'gsap'

function Bone({ className }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!ref.current) return
    const tl = gsap.timeline({ repeat: -1 })
    tl.to(ref.current, { backgroundPosition: '200% 0', duration: 1.2, ease: 'none' })
  }, [])
  return (
    <div ref={ref} className={className}
      style={{
        background: 'linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%)',
        backgroundSize: '200% 100%',
        borderRadius: 12,
      }}
    />
  )
}

export function ProductSkeleton() {
  const c = useRef(null)
  useEffect(() => {
    if (!c.current) return
    gsap.fromTo(c.current.children, { opacity: 0, y: 15 }, { opacity: 1, y: 0, stagger: 0.08, duration: 0.4, ease: 'power2.out' })
  }, [])
  return (
    <div ref={c}>
      <Bone className="w-full aspect-square mb-4" />
      <Bone className="h-5 w-4/5 mb-3" />
      <Bone className="h-4 w-3/5 mb-3" />
      <Bone className="h-9 w-2/5 mb-4" />
      <div style={{ display: 'flex', gap: 8 }} className="mb-4">
        <Bone className="h-11 w-20" />
        <Bone className="h-11 w-20" />
        <Bone className="h-11 w-20" />
      </div>
      <Bone className="h-14 w-full" />
    </div>
  )
}

function CardBone() {
  return (
    <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', border: '1px solid #f3f4f6' }}>
      <Bone className="w-full aspect-square" style={{ borderRadius: 0 }} />
      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Bone className="h-3 w-full" />
        <Bone className="h-3 w-2/3" />
        <Bone className="h-5 w-1/2" />
      </div>
    </div>
  )
}

export function SearchSkeleton() {
  const c = useRef(null)
  useEffect(() => {
    if (!c.current) return
    gsap.fromTo(c.current.children, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, stagger: 0.07, duration: 0.3, ease: 'back.out(1.4)' })
  }, [])
  return (
    <div ref={c} className="grid grid-cols-2 gap-3">
      {[0,1,2,3,4,5].map(i => <CardBone key={i} />)}
    </div>
  )
}
