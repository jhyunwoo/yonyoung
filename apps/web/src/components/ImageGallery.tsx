'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import './ImageGallery.css'

interface ImageItem {
  id: number
  src: string
  alt: string
  title?: string
  category?: string
}

interface ImageGalleryProps {
  images: ImageItem[]
  initialIndex?: number
  onClose?: () => void
}

export default function ImageGallery({
  images,
  initialIndex = 0,
  onClose,
}: ImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        onClose()
      } else if (e.key === 'ArrowLeft') {
        setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))
      } else if (e.key === 'ArrowRight') {
        setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentIndex, images.length, onClose])

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))
  }

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))
  }

  if (images.length === 0) {
    return null
  }

  const currentImage = images[currentIndex]

  return (
    <div className="gallery-lightbox" onClick={onClose}>
      <div className="gallery-content" onClick={(e) => e.stopPropagation()}>
        {onClose && (
          <button
            className="gallery-close"
            onClick={onClose}
            aria-label="닫기"
          >
            ×
          </button>
        )}

        <button
          className="gallery-nav gallery-prev"
          onClick={handlePrevious}
          aria-label="이전 이미지"
        >
          ‹
        </button>

        <div className="gallery-image-container">
          <Image
            src={currentImage.src}
            alt={currentImage.alt}
            fill
            style={{ objectFit: 'contain' }}
            sizes="90vw"
            priority
          />
          {currentImage.title && (
            <div className="gallery-caption">
              <h3>{currentImage.title}</h3>
            </div>
          )}
        </div>

        <button
          className="gallery-nav gallery-next"
          onClick={handleNext}
          aria-label="다음 이미지"
        >
          ›
        </button>

        <div className="gallery-counter">
          {currentIndex + 1} / {images.length}
        </div>
      </div>
    </div>
  )
}
