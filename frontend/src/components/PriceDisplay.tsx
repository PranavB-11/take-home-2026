import type { Price } from '../types'

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  GBP: '£',
  EUR: '€',
}

function formatPrice(amount: number, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency] ?? `${currency} `
  return `${symbol}${amount.toFixed(2)}`
}

export function PriceDisplay({ price, className = '' }: { price: Price; className?: string }) {
  const hasDiscount = price.compare_at_price != null && price.compare_at_price > price.price

  return (
    <div className={`flex items-baseline gap-2 ${className}`}>
      <span className={`font-semibold ${hasDiscount ? 'text-destructive' : 'text-foreground'}`}>
        {formatPrice(price.price, price.currency)}
      </span>
      {hasDiscount && (
        <span className="text-sm text-muted-foreground/60 line-through">
          {formatPrice(price.compare_at_price!, price.currency)}
        </span>
      )}
    </div>
  )
}
