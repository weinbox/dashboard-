import { useState, useRef } from 'react'

export default function LazyImage({ src, alt = '', className = '', wrapperClassName = '', onError }) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)
  const imgRef = useRef(null)

  return (
    <div className={`relative ${wrapperClassName}`}>
      {/* Placeholder */}
      {!loaded && !error && (
        <div className="absolute inset-0 bg-slate-100 animate-pulse rounded-inherit" />
      )}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        loading="lazy"
        className={`${className} transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => setLoaded(true)}
        onError={(e) => {
          setError(true)
          if (onError) onError(e)
        }}
      />
    </div>
  )
}
