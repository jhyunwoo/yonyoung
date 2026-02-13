'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { createBrowserApiClient } from '@/lib/api-client'
import { unwrapData } from '@/lib/api-result'
import './Hero.css'

export default function Hero() {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [latestExhibition, setLatestExhibition] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [heroData, setHeroData] = useState<any>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const client = createBrowserApiClient()
        const [exhibitions, hero] = await Promise.all([
          unwrapData<Array<{ title: string; date: string; location: string; coverImageUrl: string; images: string[] }>>(
            client.v1.public.exhibitions.$get()
          ),
          unwrapData<{ backgroundImageUrl: string }>(client.v1.public.hero.$get())
        ])

        if (exhibitions.length > 0) {
          const latest = exhibitions[0]
          setLatestExhibition({
            ...latest,
            image: latest.coverImageUrl
          })
        }

        setHeroData({
          backgroundImage: hero.backgroundImageUrl,
          backgroundImageUrl: hero.backgroundImageUrl
        })
      } catch (error) {
        console.error('Failed to fetch hero data:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()

    return undefined
  }, [])

  const exhibitionImages = latestExhibition?.images || (latestExhibition?.image ? [latestExhibition.image] : [])

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (exhibitionImages.length <= 1) return

    timerRef.current = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % exhibitionImages.length)
    }, 3000)
  }, [exhibitionImages.length])

  useEffect(() => {
    startTimer()
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [startTimer])

  const handlePrev = () => {
    setCurrentImageIndex((prev) => (prev === 0 ? exhibitionImages.length - 1 : prev - 1))
    startTimer()
  }

  const handleNext = () => {
    setCurrentImageIndex((prev) => (prev + 1) % exhibitionImages.length)
    startTimer()
  }

  const handleIndicatorClick = (index: number) => {
    setCurrentImageIndex(index)
    startTimer()
  }

  if (isLoading) {
    return <section className="hero loading-hero"></section>
  }

  return (
    <section className="hero">
      <motion.div
        className="hero-content"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <div className="hero-title-wrapper">
          {heroData?.backgroundImage && (
            <div className="hero-title-bg">
              <Image 
                src={heroData.backgroundImage} 
                alt="배경 로고" 
                width={400} 
                height={400}
                style={{ objectFit: 'contain' }}
              />
            </div>
          )}
          <h1>연영회</h1>
        </div>
        <p className="hero-subtitle">One Step Closer</p>
        <p className="hero-description">연영회는 1966년부터 시작된 연세대학교 유일의 중앙사진동아리입니다</p>
      </motion.div>

      <div className="hero-exhibition-section">
        <div className="hero-exhibition-header">
          {latestExhibition && (
            <div className="exhibition-title-info">
              <span className="exhibition-tag">LATEST EXHIBITION</span>
              <h3>{latestExhibition.title}</h3>
              <p>{latestExhibition.date} | {latestExhibition.location}</p>
            </div>
          )}
        </div>

        <div className="hero-main-container">
          <button className="hero-nav-btn prev" onClick={handlePrev} aria-label="이전 이미지">
            ‹
          </button>

          <div className="hero-slider-wrapper">
            <div className="hero-slider">
              {exhibitionImages.length > 0 ? (
                exhibitionImages.map((image: string, index: number) => (
                  <div
                    key={index}
                    className={`hero-slide ${index === currentImageIndex ? 'active' : ''}`}
                  >
                    <Image
                      src={image}
                      alt={`${latestExhibition?.title} - 이미지 ${index + 1}`}
                      fill
                      priority={index === 0}
                      style={{ objectFit: 'contain' }}
                      sizes="(max-width: 1200px) 100vw, 1200px"
                    />
                  </div>
                ))
              ) : (
                <div className="hero-placeholder">
                  <p>전시 이미지가 없습니다.</p>
                </div>
              )}
            </div>
          </div>

          <button className="hero-nav-btn next" onClick={handleNext} aria-label="다음 이미지">
            ›
          </button>
        </div>

        {exhibitionImages.length > 1 && (
          <div className="hero-indicators">
            {exhibitionImages.map((_: string, index: number) => (
              <button
                key={index}
                className={index === currentImageIndex ? 'active' : ''}
                onClick={() => handleIndicatorClick(index)}
                aria-label={`배너 ${index + 1}로 이동`}
              />
            ))}
          </div>
        )}

        <div className="hero-exhibition-footer">
          <Link href="/archive/exhibitions" className="view-all-exhibitions-btn">
            모든 전시 보기 →
          </Link>
        </div>
      </div>
    </section>
  )
}
