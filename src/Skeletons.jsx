function Bone({ className = '' }) {
  return (
    <div className={`animate-pulse bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 bg-[length:200%_100%] animate-shimmer rounded-xl ${className}`} />
  )
}

export function ProductSkeleton() {
  return (
    <div className="animate-fade-in space-y-4">
      <Bone className="w-full aspect-square rounded-2xl" />
      <Bone className="h-5 w-4/5" />
      <Bone className="h-4 w-3/5" />
      <Bone className="h-9 w-2/5" />
      <div className="flex gap-2">
        <Bone className="h-11 w-20" />
        <Bone className="h-11 w-20" />
        <Bone className="h-11 w-20" />
      </div>
      <Bone className="h-14 w-full rounded-2xl" />
    </div>
  )
}

function CardBone() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-slate-100">
      <div className="aspect-square bg-gradient-to-b from-slate-100 to-slate-50 flex items-center justify-center">
        <div className="w-12 h-12 rounded-xl bg-slate-200/60 animate-pulse" />
      </div>
      <div className="p-3 space-y-2">
        <Bone className="h-3 w-full" />
        <Bone className="h-3 w-2/3" />
        <div className="flex items-center gap-1 pt-1">
          <Bone className="h-5 w-16" />
          <Bone className="h-3 w-8" />
        </div>
      </div>
    </div>
  )
}

export function SearchSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 animate-fade-in">
      {[0,1,2,3,4,5].map(i => <CardBone key={i} />)}
    </div>
  )
}
