'use client'

import { useState, useRef } from 'react'
import './UploadModal.css'

interface UploadModalProps {
  onClose: () => void
  onUpload: (data: { id?: number; title: string; files: File[]; existingImages?: string[]; mainIndex: number; date?: string; location?: string }) => void
  type?: 'gallery' | 'exhibition'
  initialData?: {
    id: number
    title: string
    date?: string
    location?: string
    images: string[]
  }
}

export default function UploadModal({ onClose, onUpload, type = 'gallery', initialData }: UploadModalProps) {
  const [title, setTitle] = useState(initialData?.title || '')
  const [date, setDate] = useState(initialData?.date || '')
  const [location, setLocation] = useState(initialData?.location || '')
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>(initialData?.images || [])
  const [mainIndex, setMainIndex] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files)
      // 갤러리와 전시 모두 여러 장 지원
      const newFiles = [...files, ...selectedFiles]
      setFiles(newFiles)
      const newPreviews = [...previews, ...selectedFiles.map(file => URL.createObjectURL(file))]
      setPreviews(newPreviews)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files) {
      const selectedFiles = Array.from(e.dataTransfer.files)
      // 갤러리와 전시 모두 여러 장 지원
      const newFiles = [...files, ...selectedFiles]
      setFiles(newFiles)
      const newPreviews = [...previews, ...selectedFiles.map(file => URL.createObjectURL(file))]
      setPreviews(newPreviews)
    }
  }

  const removeFile = (index: number, e: React.MouseEvent) => {
    e.stopPropagation()
    // previews는 기존 이미지(string)와 새 이미지(object URL)가 섞여 있음
    const newPreviews = previews.filter((_, i) => i !== index)
    
    // files는 새 이미지만 관리하므로 index를 맞춰야 함
    // 기존 이미지 개수 계산
    const initialImagesCount = initialData?.images?.length || 0
    if (index >= initialImagesCount) {
      const fileIndex = index - initialImagesCount
      const newFiles = files.filter((_, i) => i !== fileIndex)
      setFiles(newFiles)
    }
    
    setPreviews(newPreviews)
    if (mainIndex === index) setMainIndex(0)
    else if (mainIndex > index) setMainIndex(mainIndex - 1)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (title && (files.length > 0 || previews.length > 0)) {
      const existingImages = previews.filter(p => !p.startsWith('blob:'))
      onUpload({ id: initialData?.id, title, files, existingImages, mainIndex, date, location })
      onClose()
    }
  }

  const isFormValid = () => {
    const hasImage = files.length > 0 || previews.length > 0
    if (type === 'exhibition') {
      return title && hasImage && date && location
    }
    // 갤러리(활동 기록)도 제목, 파일, 날짜 권장
    return title && hasImage && date
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>{type === 'exhibition' ? (initialData ? '전시 수정' : '새 전시 추가') : (initialData ? '활동 기록 수정' : '새 활동 기록 추가')}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="title">{type === 'exhibition' ? '전시 제목' : '활동 제목'}</label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="제목을 입력하세요"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="date">{type === 'exhibition' ? '전시 기간' : '활동 날짜'}</label>
            <input
              type="text"
              id="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              placeholder={type === 'exhibition' ? "예: 2026.02.12 ~ 2026.02.14" : "예: 2026.01.18"}
              required
            />
          </div>

          {type === 'exhibition' && (
            <div className="form-group">
              <label htmlFor="location">전시 장소</label>
              <input
                type="text"
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="장소를 입력하세요"
                required
              />
            </div>
          )}

          <div
            className={`upload-area ${isDragging ? 'dragging' : ''} ${previews.length > 0 ? 'has-files' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            {previews.length > 0 ? (
              <div className="previews-grid">
                {previews.map((src, index) => (
                  <div 
                    key={index} 
                    className={`preview-item ${index === mainIndex ? 'is-main' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      setMainIndex(index)
                    }}
                  >
                    <img src={src} alt={`미리보기 ${index + 1}`} />
                    <button 
                      className="remove-file-btn" 
                      onClick={(e) => removeFile(index, e)}
                    >
                      ×
                    </button>
                    {index === mainIndex && <span className="main-label">대표</span>}
                  </div>
                ))}
                <div className="add-more-placeholder">
                  <span>+</span>
                </div>
              </div>
            ) : (
              <div className="upload-placeholder">
                <span className="upload-icon">+</span>
                <p>이미지를 드래그하거나 클릭하여 선택하세요</p>
                <p className="hint">(여러 장 선택 가능)</p>
              </div>
            )}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              multiple
              style={{ display: 'none' }}
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="cancel-btn" onClick={onClose}>
              취소
            </button>
            <button type="submit" className="submit-btn" disabled={!isFormValid()}>
              {type === 'exhibition' ? '추가' : '업로드'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
