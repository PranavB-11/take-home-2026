import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Check, X, Tag } from 'lucide-react'
import type { Product, Variant } from '../types'
import { fetchProduct } from '../api'
import { PriceDisplay } from '../components/PriceDisplay'
import { ImageGallery } from '../components/ImageGallery'

function VariantTable({ variants }: { variants: Variant[] }) {
  if (variants.length === 0) return null

  const allAttrNames = Array.from(
    new Set(variants.flatMap((v) => v.attributes.map((a) => a.name)))
  )
  const hasSku = variants.some((v) => v.sku)

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/60">
            {allAttrNames.map((name) => (
              <th key={name} className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {name}
              </th>
            ))}
            <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
            {hasSku && (
              <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">SKU</th>
            )}
          </tr>
        </thead>
        <tbody>
          {variants.map((variant, i) => (
            <tr key={i} className="border-b border-border/20 last:border-0 hover:bg-muted/30 transition-colors">
              {allAttrNames.map((name) => {
                const attr = variant.attributes.find((a) => a.name === name)
                return (
                  <td key={name} className="px-3 py-2 text-foreground/80">
                    {attr?.value ?? '—'}
                  </td>
                )
              })}
              <td className="px-3 py-2">
                {variant.available ? (
                  <span className="inline-flex items-center gap-1 text-xs text-success">
                    <Check className="h-3.5 w-3.5" /> In stock
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs text-destructive/70">
                    <X className="h-3.5 w-3.5" /> Out of stock
                  </span>
                )}
              </td>
              {hasSku && (
                <td className="px-3 py-2 font-mono text-xs text-muted-foreground/60">
                  {variant.sku ?? '—'}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function ProductPage() {
  const { id } = useParams<{ id: string }>()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (id == null) return
    fetchProduct(Number(id))
      .then(setProduct)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="h-4 w-28 animate-pulse rounded bg-muted mb-8" />
        <div className="grid gap-10 lg:grid-cols-2">
          <div className="aspect-square animate-pulse rounded-xl bg-muted/30 border border-border/20" />
          <div className="space-y-5">
            <div className="h-3 w-20 animate-pulse rounded bg-muted/50" />
            <div className="h-9 w-3/4 animate-pulse rounded-lg bg-muted/40" />
            <div className="h-7 w-28 animate-pulse rounded bg-muted/50" />
            <div className="h-px bg-border/30" />
            <div className="space-y-2">
              <div className="h-4 w-full animate-pulse rounded bg-muted/30" />
              <div className="h-4 w-5/6 animate-pulse rounded bg-muted/30" />
              <div className="h-4 w-2/3 animate-pulse rounded bg-muted/30" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-destructive font-medium">{error ?? 'Product not found'}</p>
          <Link to="/" className="mt-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to catalog
          </Link>
        </div>
      </div>
    )
  }

  const categoryParts = product.category.name.split(' > ')

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        to="/"
        className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to catalog
      </Link>

      <nav className="mb-6 flex items-center gap-1.5 text-xs text-muted-foreground/70">
        <Tag className="h-3 w-3" />
        {categoryParts.map((part, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-border">/</span>}
            <span className={i === categoryParts.length - 1 ? 'text-muted-foreground' : ''}>
              {part}
            </span>
          </span>
        ))}
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        <div className="lg:sticky lg:top-20 lg:self-start">
          <ImageGallery images={product.image_urls} alt={product.name} />
        </div>

        <div className="space-y-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
              {product.brand}
            </p>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
              {product.name}
            </h1>
            <PriceDisplay price={product.price} className="mt-4 text-xl" />
          </div>

          <div className="h-px bg-border/30" />

          {product.colors.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                Colors
              </h3>
              <div className="flex flex-wrap gap-2">
                {product.colors.map((color) => (
                  <span
                    key={color}
                    className="rounded-full border border-border/50 bg-muted/30 px-3.5 py-1.5 text-sm text-foreground/80 hover:bg-muted/50 transition-colors"
                  >
                    {color}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              Description
            </h3>
            <p className="text-sm leading-relaxed text-foreground/70">{product.description}</p>
          </div>

          {product.key_features.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                Key Features
              </h3>
              <ul className="space-y-2">
                {product.key_features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-success" />
                    <span className="text-foreground/70">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {product.variants.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                Variants
                <span className="ml-2 inline-flex items-center rounded-full bg-muted/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {product.variants.length}
                </span>
              </h3>
              <div className="rounded-xl border border-border/40 bg-card/50 overflow-hidden">
                <VariantTable variants={product.variants} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
