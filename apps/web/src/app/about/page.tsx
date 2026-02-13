import aboutFallback from '@/config/about.json'
import { createServerApiClient } from '@/lib/api-client'
import { unwrapDataOrFallback } from '@/lib/api-result'
import { renderTiptapJsonToHtml } from '@/lib/tiptap-render'
import './About.css'

export const dynamic = 'force-dynamic'

interface Activity {
  month: string
  title: string
}

interface HistoryItem {
  year: string
  title: string
}

interface AboutData {
  title?: string
  activities: Activity[]
  history: HistoryItem[]
  richContentHtml?: string
}

async function getAboutData(): Promise<AboutData> {
  const fallback = aboutFallback as { activities: Activity[]; history: HistoryItem[] }
  const client = createServerApiClient()

  const page = await unwrapDataOrFallback(
    client.v1.public.pages[':slug'].$get({ param: { slug: 'about' } }),
    {
      slug: 'about',
      title: '연영회 소개',
      contentJson: {
        timeline: fallback.activities,
        history: fallback.history
      },
      updatedAt: new Date(0).toISOString()
    }
  )

  const content = page.contentJson as
    | { timeline?: Activity[]; history?: HistoryItem[]; summary?: string }
    | undefined

  const richContentHtml = renderTiptapJsonToHtml(page.contentJson)

  return {
    title: page.title,
    activities: content?.timeline ?? fallback.activities,
    history: content?.history ?? fallback.history,
    richContentHtml: richContentHtml || undefined,
  }
}

export default async function About() {
  const data = await getAboutData()

  if (data.richContentHtml) {
    return (
      <div className="about-page">
        <div className="container">
          <section className="about-content">
            <h1>{data.title ?? '연영회 소개'}</h1>
            <article dangerouslySetInnerHTML={{ __html: data.richContentHtml }} />
          </section>
        </div>
      </div>
    )
  }

  const { activities, history } = data

  return (
    <div className="about-page">
      <div className="container">
        <section className="about-hero"></section>

        <section className="about-content">
          <div className="about-section">
            <h2>연영회 소개</h2>
            <p>
              연영회는 사진을 통해 세상을 기록하고 표현하는 동아리입니다.
              우리는 다양한 주제와 스타일로 사진을 찍으며, 서로의 작품을 공유하고
              함께 성장해 나갑니다.
            </p>
          </div>

          <div className="about-section activity-section">
            <h2>연간 활동</h2>
            <div className="activity-columns">
              <div className="activity-column">
                {activities.slice(0, 3).map((activity: Activity, index: number) => (
                  <div key={index} className="activity-timeline-item">
                    <div className="dot"></div>
                    <div className="content">
                      <span className="month">{activity.month}</span>
                      <span className="title">{activity.title}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="activity-column">
                {activities.slice(3).map((activity: Activity, index: number) => (
                  <div key={index} className="activity-timeline-item">
                    <div className="dot"></div>
                    <div className="content">
                      <span className="month">{activity.month}</span>
                      <span className="title">{activity.title}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="about-section activity-section">
            <h2>연혁</h2>
            <div className="activity-columns single-column">
              <div className="activity-column">
                {history.map((item: HistoryItem, index: number) => (
                  <div key={index} className="activity-timeline-item">
                    <div className="dot"></div>
                    <div className="content">
                      <span className="month">{item.year}</span>
                      <span className="title">{item.title}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
