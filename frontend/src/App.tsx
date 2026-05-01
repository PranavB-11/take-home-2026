import { Routes, Route, Link } from 'react-router-dom'
import { CatalogPage } from './pages/CatalogPage'
import { ProductPage } from './pages/ProductPage'
import { Package } from 'lucide-react'

export default function App() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center gap-3">
            <Package className="h-5 w-5 text-muted-foreground" />
            <Link to="/" className="text-lg font-semibold tracking-tight text-foreground hover:text-foreground/80 transition-colors">
              Product Catalog
            </Link>
          </div>
        </div>
      </header>
      <main className="pb-16">
        <Routes>
          <Route path="/" element={<CatalogPage />} />
          <Route path="/product/:id" element={<ProductPage />} />
        </Routes>
      </main>
    </div>
  )
}
