import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export function ImageGallery({ images, alt }: { images: string[]; alt: string }) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [imgErrors, setImgErrors] = useState<Set<number>>(new Set())

  const validImages = images.filter((_, i) => !imgErrors.has(i))
  const currentImage = images[selectedIndex]

  const handlePrev = () => {
    setSelectedIndex((i) => (i > 0 ? i - 1 : images.length - 1))
  }

  const handleNext = () => {
    setSelectedIndex((i) => (i < images.length - 1 ? i + 1 : 0))
  }

  const handleImgError = (index: number) => {
    setImgErrors((prev) => new Set(prev).add(index))
  }

  if (validImages.length === 0) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-xl bg-muted/50 text-muted-foreground/50">
        No images available
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="relative aspect-square overflow-hidden rounded-xl bg-muted/30 border border-border/30">
        {currentImage && !imgErrors.has(selectedIndex) ? (
          <img
            src={currentImage}
            alt={`${alt} - Image ${selectedIndex + 1}`}
            className="h-full w-full object-contain p-4"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground/50">
            Image unavailable
          </div>
        )}
        {images.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-card/90 p-2 shadow-lg backdrop-blur-sm transition-all hover:bg-card border border-border/50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-card/90 p-2 shadow-lg backdrop-blur-sm transition-all hover:bg-card border border-border/50"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-card/80 px-3 py-1 text-xs text-muted-foreground backdrop-blur-sm border border-border/30">
              {selectedIndex + 1} / {images.length}
            </div>
          </>
        )}
      </div>

      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setSelectedIndex(i)}
              className={`h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-all ${
                i === selectedIndex
                  ? 'border-foreground/60 ring-1 ring-foreground/20'
                  : 'border-border/30 opacity-60 hover:opacity-100 hover:border-border'
              }`}
            >
              {!imgErrors.has(i) ? (
                <img
                  src={img}
                  alt={`${alt} thumbnail ${i + 1}`}
                  className="h-full w-full object-cover"
                  loading="lazy"
                  onError={() => handleImgError(i)}
                />
              ) : (
                <div className="h-full w-full bg-muted/50" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
