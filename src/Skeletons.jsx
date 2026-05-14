import { useEffect, useRef } from 'react'
import gsap from 'gsap'

function Pulse({ className }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!ref.current) return
    gsap.to(ref.current, { opacity: 0.4, duration: 0.8, repeat: -1, yoyo: true, ease: 'power1.inOut' })
  }, [])
  return <div ref={ref} className={'bg-gray-200 rounded-xl ' + className} />
}

export function ProductSkeleton() {
  const c = useRef(null)
  useEffect(() => {
    if (!c.current) return
    gsap.from(c.current.children, { opacity: 0, y: 20, stagger: 0.1, duration: 0.4, ease: 'power2.out' })
  }, [])
  return (
    <div ref={c} className="space-y-4 pt-2">
      <Pulse className="w-full aspect-square rounded-2xl" />
      <div className="px-1 space-y-3">
        <Pulse className="h-5 w-3/4" />
        <Pulse className="h-4 w-1/2" />
        <Pulse className="h-8 w-2/5 rounded-lg" />
        <div className="flex gap-2 pt-2">
          <Pulse className="h-10 w-24 rounded-xl" />
          <Pulse className="h-10 w-24 rounded-xl" />
          <Pulse className="h-10 w-24 rounded-xl" />
        </div>
        <Pulse className="h-14 w-full rounded-2xl" />
      </div>
    </div>
  )
}

function CardSkeleton() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-gray-100">
      <Pulse className="w-full aspect-square rounded-none" />
      <div className="p-3 space-y-2">
        <Pulse className="h-3 w-full" />
        <Pulse className="h-3 w-2/3" />
        <Pulse className="h-5 w-1/2 mt-1" />
      </div>
    </div>
  )
}

export function SearchSkeleton() {
  const c = useRef(null)
  useEffect(() => {
    if (!c.current) return
    gsap.from(c.current.children, { opacity: 0, scale: 0.92, stagger: 0.06, duration: 0.35, ease: 'back.out(1.5)' })
  }, [])
  return (
    <div ref={c} className="grid grid-cols-2 gap-3">
      {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
    </div>
  )
}
