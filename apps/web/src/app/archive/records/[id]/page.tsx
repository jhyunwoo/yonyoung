'use client'

// AI_LAYOUT_UPDATE_V2
import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import ImageGrid from '@/components/ImageGrid'
import { createBrowserApiClient } from '@/lib/api-client'
import { unwrapData } from '@/lib/api-result'
import './ActivityDetail.css'

const apiClient = createBrowserApiClient()

export default function ActivityDetail() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const [activity, setActivity] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const found = await unwrapData(
          apiClient.v1.public.activities[':id'].$get({ param: { id: Number(id) } })
        )
        setActivity(found)
      } catch (error) {
        console.error('Failed to fetch activity:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [id])

  if (isLoading) {
    return (
      <div className="activity-detail-page">
        <div className="container">
          <p>로딩 중...</p>
        </div>
      </div>
    )
  }

  if (!activity) {
    return (
      <div className="activity-detail-page">
        <div className="container">
          <p>활동 기록을 찾을 수 없습니다.</p>
          <button onClick={() => router.back()}>뒤로 가기</button>
        </div>
      </div>
    )
  }

  // ImageGrid에 맞게 데이터 변환
  const gridImages = activity.images.map((src: string, index: number) => ({
    id: index,
    src: src,
    alt: `${activity.title} - ${index + 1}`,
    title: "", // 개별 사진에는 제목 노출 안 함
  }))

  return (
    <div className="activity-detail-page">
      <div className="detail-header">
        <div className="container">
          <div className="title-section">
            <button className="back-btn" onClick={() => router.back()}>
              ←
            </button>
            <h1>{activity.title}</h1>
            <span className="activity-date">{activity.date}</span>
          </div>
        </div>
      </div>

      <div className="detail-content">
        <div className="container">
          <ImageGrid images={gridImages} />
        </div>
      </div>
    </div>
  )
}
