'use client'

import ImageGrid from './ImageGrid'
import './Gallery.css'

interface ImageItem {
  id: number
  src: string
  alt: string
  title?: string
  category?: string
}

interface GalleryProps {
  images: ImageItem[]
}

export default function Gallery({ images }: GalleryProps) {
  return (
    <div className="gallery-container">
      <ImageGrid images={images} />
    </div>
  )
}
