import Hero from '@/components/Hero'
import Link from 'next/link'
import Image from 'next/image'
import styles from './Home.module.css'
import activitiesFallback from '@/config/activities.json'
import { createServerApiClient } from '@/lib/api-client'
import { unwrapDataOrFallback } from '@/lib/api-result'

export const dynamic = 'force-dynamic'

interface Activity {
  id: number;
  title: string;
  date: string;
  coverImageUrl: string;
  images: string[];
}

function normalizeFallbackActivities(input: unknown): Activity[] {
  if (!Array.isArray(input)) return [];
  return input.map((item, index) => {
    const value = item as Record<string, unknown>;
    return {
      id: Number(value.id ?? index + 1),
      title: String(value.title ?? ''),
      date: String(value.date ?? ''),
      coverImageUrl: String(value.coverImageUrl ?? value.coverImage ?? ''),
      images: Array.isArray(value.images) ? value.images.map((image) => String(image)) : []
    };
  });
}

async function getActivities(): Promise<Activity[]> {
  const client = createServerApiClient()
  const fallback = normalizeFallbackActivities(activitiesFallback)
  return unwrapDataOrFallback(client.v1.public.activities.$get(), fallback)
}

export default async function Home() {
  const activities = await getActivities()
  const previewActivities = (activities || []).slice(0, 6)

  return (
    <div>
      <Hero />
      <section className={styles.previewSection}>
        <div className="container">
          <h2>최신 활동</h2>
          <div className={styles.previewGrid}>
            {previewActivities.map((activity: Activity) => (
              <Link key={activity.id} href={`/archive/records/${activity.id}`} className={styles.previewItem}>
                <div className={styles.previewImage}>
                  <Image
                    src={activity.coverImageUrl}
                    alt={activity.title}
                    fill
                    sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    style={{ objectFit: 'cover' }}
                    loading="lazy"
                  />
                </div>
                {activity.title && (
                  <div className={styles.previewOverlay}>
                    <h3>{activity.title}</h3>
                    {activity.date && <p className={styles.previewDate}>{activity.date}</p>}
                  </div>
                )}
              </Link>
            ))}
          </div>
          <div className={styles.viewAllContainer}>
            <Link href="/archive/records" className={styles.viewAllLink}>
              모든 작품 보기 →
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
