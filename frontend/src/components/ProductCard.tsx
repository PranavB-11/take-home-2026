import { Link } from 'react-router-dom'
import type { Product } from '../types'
import { PriceDisplay } from './PriceDisplay'
import { useState } from 'react'

export function ProductCard({ product, index }: { product: Product; index: number }) {
  const [imgError, setImgError] = useState(false)
  const imageUrl = product.image_urls[0]

  return (
    <Link
      to={`/product/${index}`}
      className="group block overflow-hidden rounded-xl border border-border/50 bg-card transition-all duration-300 hover:border-border hover:shadow-2xl hover:shadow-white/5"
    >
      <div className="aspect-[4/5] overflow-hidden bg-muted/50">
        {imageUrl && !imgError ? (
          <img
            src={imageUrl}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground/50">
            <span className="text-sm">No image</span>
          </div>
        )}
      </div>
      <div className="p-4 space-y-1.5">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          {product.brand}
        </p>
        <h3 className="text-sm font-medium leading-snug text-foreground/90 line-clamp-2 group-hover:text-foreground transition-colors">
          {product.name}
        </h3>
        <PriceDisplay price={product.price} className="mt-1" />
        {product.colors.length > 0 && (
          <p className="text-xs text-muted-foreground/70">
            {product.colors.length} color{product.colors.length !== 1 ? 's' : ''} available
          </p>
        )}
      </div>
    </Link>
  )
}
