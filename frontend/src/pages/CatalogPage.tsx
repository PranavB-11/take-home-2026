import { useEffect, useState } from 'react'
import type { Product } from '../types'
import { fetchProducts } from '../api'
import { ProductCard } from '../components/ProductCard'
import { AlertCircle } from 'lucide-react'

export function CatalogPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchProducts()
      .then(setProducts)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-10 space-y-2">
          <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
          <div className="h-4 w-32 animate-pulse rounded-lg bg-muted/60" />
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-xl border border-border/30 bg-card overflow-hidden">
              <div className="aspect-[4/5] bg-muted/30" />
              <div className="p-4 space-y-3">
                <div className="h-3 w-16 rounded bg-muted/50" />
                <div className="h-4 w-full rounded bg-muted/40" />
                <div className="h-4 w-20 rounded bg-muted/50" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-md rounded-xl border border-destructive/20 bg-destructive/5 p-8 text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-destructive/60 mb-3" />
          <p className="text-destructive font-medium">{error}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Make sure the backend server is running on port 8000.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight">All Products</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {products.length} product{products.length !== 1 ? 's' : ''} extracted from HTML
        </p>
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {products.map((product, index) => (
          <ProductCard key={index} product={product} index={index} />
        ))}
      </div>
    </div>
  )
}
