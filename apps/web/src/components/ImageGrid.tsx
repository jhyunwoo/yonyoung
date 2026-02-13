'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import ImageGallery from './ImageGallery'
import './ImageGrid.css'

interface ImageItem {
  id: number
  src: string
  alt: string
  title?: string
  date?: string
  category?: string
}

interface ImageGridProps {
  images: ImageItem[]
  onItemClick?: (index: number) => void
  onUpdate?: (updatedImages: any[]) => void
  onDelete?: (id: number) => void
  onEdit?: (image: ImageItem) => void
}

export default function ImageGrid({ images, onItemClick, onUpdate, onDelete, onEdit }: ImageGridProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [isAdminMode, setIsAdminMode] = useState(false)

  useEffect(() => {
    // 초기 상태 확인
    setIsAdminMode(localStorage.getItem('isAdminMode') === 'true')

    // 이벤트 리스너 등록
    const handleAdminChange = (e: any) => {
      setIsAdminMode(e.detail)
    }
    window.addEventListener('adminModeChange', handleAdminChange)
    return () => window.removeEventListener('adminModeChange', handleAdminChange)
  }, [])

  const handleItemClick = (index: number) => {
    if (onItemClick) {
      onItemClick(index)
    } else {
      setSelectedImageIndex(index)
    }
  }

  const handleEditClick = (e: React.MouseEvent, image: ImageItem) => {
    e.stopPropagation()
    if (onEdit) onEdit(image)
  }

  const handleDeleteClick = (e: React.MouseEvent, id: number) => {
    e.stopPropagation()
    if (onDelete && confirm('정말로 삭제하시겠습니까?')) {
      onDelete(id)
    }
  }

  const handleTitleClick = (e: React.MouseEvent, image: ImageItem) => {
    if (!onUpdate || !isAdminMode) return // 관리자 모드 + 업데이트 콜백이 있어야 수정 가능
    e.stopPropagation()
    setEditingId(image.id)
    setEditTitle(image.title || '')
  }

  const handleTitleSave = async (id: number) => {
    if (!editTitle.trim()) {
      setEditingId(null)
      return
    }

    try {
      const response = await fetch('/api/update-title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, title: editTitle }),
      })

      if (response.ok) {
        const data = await response.json()
        if (onUpdate) {
          onUpdate(data) // 서버에서 온 전체 데이터 전달
        }
        setEditingId(null)
      } else {
        alert('제목 저장에 실패했습니다.')
      }
    } catch (error) {
      console.error('제목 업데이트 오류:', error)
      alert('오류가 발생했습니다.')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent, id: number) => {
    if (e.key === 'Enter') {
      handleTitleSave(id)
    } else if (e.key === 'Escape') {
      setEditingId(null)
    }
  }

  if (images.length === 0) {
    return (
      <div className="empty-gallery">
        <p>이미지가 없습니다.</p>
      </div>
    )
  }

  return (
    <>
      <div className="image-grid">
        {images.map((image, index) => (
          <div
            key={image.id}
            className={`grid-item ${isAdminMode ? 'admin-active' : ''}`}
            onClick={() => handleItemClick(index)}
          >
            <div className="image-wrapper">
              <Image
                src={image.src}
                alt={image.alt}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                style={{ objectFit: 'cover' }}
                loading="lazy"
              />
            </div>
            {isAdminMode && (
              <div className="admin-actions">
                <button 
                  className="admin-btn edit" 
                  onClick={(e) => handleEditClick(e, image)}
                  title="수정"
                >
                  ✎
                </button>
                <button 
                  className="admin-btn delete" 
                  onClick={(e) => handleDeleteClick(e, image.id)}
                  title="삭제"
                >
                  ×
                </button>
              </div>
            )}
            <div className="image-overlay">
              {editingId === image.id ? (
                <input
                  type="text"
                  className="edit-title-input"
                  value={editTitle}
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onBlur={() => handleTitleSave(image.id)}
                  onKeyDown={(e) => handleKeyDown(e, image.id)}
                />
              ) : (
                <div className="title-container">
                  <h3 onClick={(e) => handleTitleClick(e, image)}>
                    {image.title || '제목 없음'}
                  </h3>
                  {image.date && <span className="image-date">{image.date}</span>}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {selectedImageIndex !== null && (
        <ImageGallery
          images={images}
          initialIndex={selectedImageIndex}
          onClose={() => setSelectedImageIndex(null)}
        />
      )}
    </>
  )
}
