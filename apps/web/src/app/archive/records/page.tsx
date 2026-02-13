'use client'

// AI_SYNC_CHECK_V2
import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ImageGrid from '@/components/ImageGrid'
import UploadModal from '@/components/UploadModal'
import { createBrowserApiClient } from '@/lib/api-client'
import { unwrapData } from '@/lib/api-result'
import './Archive.css'

const apiClient = createBrowserApiClient()

type ActivityItem = {
  id: number
  title: string
  date: string
  coverImageUrl: string
  coverImage: string
  images: string[]
}

export default function Archive() {
  const router = useRouter()
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // 데이터 동기 로딩 (API 호출)
  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await unwrapData<Array<{ id: number; title: string; date: string; coverImageUrl: string; images: string[] }>>(
          apiClient.v1.public.activities.$get()
        )
        const normalized = data.map((item) => ({
          ...item,
          coverImage: item.coverImageUrl
        }))
        setActivities([...normalized].sort((a, b) => (b.date || '').localeCompare(a.date || '')))
      } catch (error) {
        console.error('Failed to fetch activities:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  const handleUpload = async (data: { title: string; files: File[]; date?: string }) => {
    try {
      const { title, files, date } = data
      const uploadedUrls: string[] = []
      for (const file of files) {
        const uploaded = await unwrapData<{ url: string }>(
          apiClient.v1.admin.assets.$post({
            form: {
              entity: 'activity',
              file
            }
          })
        )
        uploadedUrls.push(uploaded.url)
      }

      if (!date || uploadedUrls.length === 0) {
        throw new Error('필수 값이 누락되었습니다.')
      }

      const created = await unwrapData<{ id: number; title: string; date: string; coverImageUrl: string; images: string[] }>(
        apiClient.v1.admin.activities.$post({
          json: {
            title,
            date,
            coverImageUrl: uploadedUrls[0],
            images: uploadedUrls
          }
        })
      )

      const normalized: ActivityItem = {
        ...created,
        coverImage: created.coverImageUrl
      }
      const newActivities = [normalized, ...activities].sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      setActivities(newActivities)
      alert('활동 기록이 성공적으로 업로드되었습니다!')
    } catch (error) {
      console.error('업로드 중 오류 발생:', error)
      alert('업로드 중 오류가 발생했습니다.')
    }
  }

  const handleActivityClick = (id: number) => {
    router.push(`/archive/records/${id}`)
  }

  // 활동 데이터 갱신 처리
  const handleActivitiesUpdate = (updatedActivities: any[]) => {
    // 날짜 기준 정렬 유지
    const sorted = [...updatedActivities].sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    setActivities(sorted)
  }

  // ImageGrid에 맞게 데이터 변환 (최적화)
  const gridImages = useMemo(() => activities.map(activity => ({
    id: activity.id,
    src: activity.coverImage,
    alt: activity.title,
    title: activity.title,
    date: activity.date
  })), [activities])

  return (
    <div className="archive-page">
      <div className="archive-header">
        <div className="container">
          <h1>활동 기록</h1>
        </div>
      </div>
      
      <div className="gallery-container">
        {isLoading ? (
          <div className="loading">로딩 중...</div>
        ) : (
          <ImageGrid 
            images={gridImages} 
            onItemClick={(index) => handleActivityClick(gridImages[index].id)}
            onUpdate={handleActivitiesUpdate}
          />
        )}
      </div>

      {isModalOpen && (
        <UploadModal 
          onClose={() => setIsModalOpen(false)} 
          onUpload={handleUpload}
          type="gallery"
        />
      )}
    </div>
  )
}
