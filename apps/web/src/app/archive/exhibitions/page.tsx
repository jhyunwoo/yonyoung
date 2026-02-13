'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import UploadModal from '@/components/UploadModal'
import { createBrowserApiClient } from '@/lib/api-client'
import { unwrapData } from '@/lib/api-result'
import './Exhibitions.css'

const apiClient = createBrowserApiClient()

type ExhibitionItem = {
  id: number
  title: string
  date: string
  location: string
  description?: string
  coverImageUrl: string
  image: string
  images: string[]
}

export default function Exhibitions() {
  const [exhibitions, setExhibitions] = useState<ExhibitionItem[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedExhibition, setSelectedExhibition] = useState<ExhibitionItem | null>(null)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isAdminMode, setIsAdminMode] = useState(false)
  const [editingExhibition, setEditingExhibition] = useState<ExhibitionItem | null>(null)
  const slideIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const data = await unwrapData<Array<{ id: number; title: string; date: string; location: string; description: string; coverImageUrl: string; images: string[] }>>(
        apiClient.v1.public.exhibitions.$get()
      )
      const normalized = data.map((item) => ({
        ...item,
        image: item.coverImageUrl
      }))
      setExhibitions(normalized)
    } catch (error) {
      console.error('Failed to fetch exhibitions:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    
    // 관리자 모드 상태 구독
    setIsAdminMode(localStorage.getItem('isAdminMode') === 'true')
    const handleAdminChange = (e: Event) => {
      const customEvent = e as CustomEvent<boolean>
      setIsAdminMode(Boolean(customEvent.detail))
    }
    window.addEventListener('adminModeChange', handleAdminChange as EventListener)
    return () => window.removeEventListener('adminModeChange', handleAdminChange as EventListener)
  }, [])

  // 슬라이드쇼 타이머 시작 함수
  const startSlideTimer = () => {
    if (slideIntervalRef.current) {
      clearInterval(slideIntervalRef.current)
    }

    if (selectedExhibition) {
      const images = selectedExhibition.images || [selectedExhibition.image]
      if (images.length > 1) {
        slideIntervalRef.current = setInterval(() => {
          setCurrentImageIndex((prev) => (prev + 1) % images.length)
        }, 3000)
      }
    }
  }

  // 슬라이드쇼 로직
  useEffect(() => {
    startSlideTimer()
    return () => {
      if (slideIntervalRef.current) clearInterval(slideIntervalRef.current)
    }
  }, [selectedExhibition])

  const handleExhibitionClick = (exhibition: ExhibitionItem) => {
    setSelectedExhibition(exhibition)
    setCurrentImageIndex(0)
  }

  const handleClosePopup = () => {
    setSelectedExhibition(null)
  }

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!selectedExhibition) return
    const images = selectedExhibition.images || [selectedExhibition.image]
    setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))
    startSlideTimer()
  }

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!selectedExhibition) return
    const images = selectedExhibition.images || [selectedExhibition.image]
    setCurrentImageIndex((prev) => (prev + 1) % images.length)
    startSlideTimer()
  }

  const handleIndicatorClick = (e: React.MouseEvent, index: number) => {
    e.stopPropagation()
    setCurrentImageIndex(index)
    startSlideTimer()
  }

  const handleEdit = (e: React.MouseEvent, exhibition: ExhibitionItem) => {
    e.stopPropagation()
    setEditingExhibition(exhibition)
    setIsModalOpen(true)
  }

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation()
    if (!confirm('정말로 이 전시 정보를 삭제하시겠습니까?')) return

    try {
      await unwrapData(apiClient.v1.admin.exhibitions[':id'].$delete({ param: { id } }))
      alert('삭제되었습니다.')
      fetchData()
    } catch (error) {
      console.error('삭제 오류:', error)
      alert('오류가 발생했습니다.')
    }
  }

  const handleUpload = async (data: { 
    id?: number; 
    title: string; 
    files: File[]; 
    mainIndex: number; 
    date?: string; 
    location?: string;
    existingImages?: string[];
  }) => {
    try {
      const { id, title, files, mainIndex, date, location, existingImages } = data
      const uploadedUrls: string[] = []
      for (const file of files) {
        const uploaded = await unwrapData<{ url: string }>(
          apiClient.v1.admin.assets.$post({
            form: {
              entity: 'exhibition',
              file
            }
          })
        )
        uploadedUrls.push(uploaded.url)
      }

      const keptImages = existingImages ?? []
      const images = [...keptImages, ...uploadedUrls]
      const coverImageUrl = images[Math.min(mainIndex, Math.max(images.length - 1, 0))] ?? ''

      if (!coverImageUrl || !date || !location) {
        throw new Error('필수 값이 누락되었습니다.')
      }

      if (id) {
        await unwrapData(
          apiClient.v1.admin.exhibitions[':id'].$patch({
            param: { id },
            json: {
              title,
              date,
              location,
              description: editingExhibition?.description ?? '',
              coverImageUrl,
              images
            }
          })
        )
      } else {
        await unwrapData(
          apiClient.v1.admin.exhibitions.$post({
            json: {
              title,
              date,
              location,
              description: '',
              coverImageUrl,
              images
            }
          })
        )
      }

      alert(id ? '전시 정보가 수정되었습니다!' : '전시 정보가 성공적으로 추가되었습니다!')
      fetchData()
      setIsModalOpen(false)
      setEditingExhibition(null)
    } catch (error) {
      console.error('처리 중 오류 발생:', error)
      alert('오류가 발생했습니다.')
    }
  }

  return (
    <div className="exhibitions-page">
      <div className="exhibitions-header">
        <div className="container">
          <h1>전시회</h1>
          {isAdminMode && (
            <button 
              className="upload-trigger-btn" 
              onClick={() => {
                setEditingExhibition(null)
                setIsModalOpen(true)
              }}
              aria-label="전시 추가"
            >
              +
            </button>
          )}
        </div>
      </div>

      <div className="exhibitions-content">
        <div className="container">
          {isLoading ? (
            <div className="loading">로딩 중...</div>
          ) : exhibitions.length === 0 ? (
            <div className="empty-exhibitions">
              <p>전시 정보가 없습니다.</p>
            </div>
          ) : (
            <div className="exhibitions-grid">
              {exhibitions.map((exhibition) => (
                <div 
                  key={exhibition.id} 
                  className={`exhibition-card ${isAdminMode ? 'admin-active' : ''}`}
                  onClick={() => handleExhibitionClick(exhibition)}
                >
                  <div className="exhibition-image">
                    <Image
                      src={exhibition.image}
                      alt={exhibition.title}
                      fill
                      style={{ objectFit: 'cover' }}
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />
                    {isAdminMode && (
                      <div className="admin-actions">
                        <button 
                          className="admin-btn edit" 
                          onClick={(e) => handleEdit(e, exhibition)}
                          title="수정"
                        >
                          ✎
                        </button>
                        <button 
                          className="admin-btn delete" 
                          onClick={(e) => handleDelete(e, exhibition.id)}
                          title="삭제"
                        >
                          ×
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="exhibition-info">
                    <h2>{exhibition.title}</h2>
                    <p className="exhibition-date">{exhibition.date}</p>
                    <p className="exhibition-location">{exhibition.location}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <UploadModal 
          onClose={() => {
            setIsModalOpen(false)
            setEditingExhibition(null)
          }} 
          onUpload={handleUpload}
          type="exhibition"
          initialData={editingExhibition ?? undefined}
        />
      )}

      {selectedExhibition && (
        <div className="exhibition-popup-overlay" onClick={handleClosePopup}>
          <div className="exhibition-popup-content" onClick={(e) => e.stopPropagation()}>
            <button className="popup-close-btn" onClick={handleClosePopup}>×</button>
            
            <div className="popup-slideshow">
              {(selectedExhibition.images || [selectedExhibition.image]).map((img: string, index: number) => (
                <div 
                  key={index} 
                  className={`popup-slide ${index === currentImageIndex ? 'active' : ''}`}
                >
                  <img
                    src={img}
                    alt={`${selectedExhibition.title} - ${index + 1}`}
                    className="popup-image"
                  />
                </div>
              ))}
            </div>

            {(selectedExhibition.images || [selectedExhibition.image]).length > 1 && (
              <>
                <button className="popup-nav-btn prev" onClick={handlePrevImage} aria-label="이전 사진">
                  ‹
                </button>
                <button className="popup-nav-btn next" onClick={handleNextImage} aria-label="다음 사진">
                  ›
                </button>
              </>
            )}

            <div className="popup-info-overlay">
              <h2 className="popup-title">{selectedExhibition.title}</h2>
              <p className="popup-date">{selectedExhibition.date}</p>
            </div>

            {(selectedExhibition.images || [selectedExhibition.image]).length > 1 && (
              <div className="popup-indicators">
                {(selectedExhibition.images || [selectedExhibition.image]).map((_: any, index: number) => (
                  <button
                    key={index}
                    className={`indicator-dot ${index === currentImageIndex ? 'active' : ''}`}
                    onClick={(e) => handleIndicatorClick(e, index)}
                    aria-label={`${index + 1}번 사진으로 이동`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
