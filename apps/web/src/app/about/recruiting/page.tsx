import { createServerApiClient } from '@/lib/api-client'
import { unwrapDataOrFallback } from '@/lib/api-result'
import { renderTiptapJsonToHtml } from '@/lib/tiptap-render'
import './Recruiting.css'

export const dynamic = 'force-dynamic'

async function getRecruitingContent() {
  const client = createServerApiClient()
  const page = await unwrapDataOrFallback(
    client.v1.public.pages[':slug'].$get({ param: { slug: 'recruiting' } }),
    {
      slug: 'recruiting',
      title: 'RECRUITING',
      contentJson: null,
      updatedAt: new Date(0).toISOString()
    }
  )

  return {
    title: page.title ?? 'RECRUITING',
    html: renderTiptapJsonToHtml(page.contentJson),
  }
}

export default async function Recruiting() {
  const content = await getRecruitingContent()

  return (
    <div className="recruiting-page">
      <div className="container">
        <section className="recruiting-hero">
          <h1>{content?.title ?? 'RECRUITING'}</h1>
          <p className="subtitle">연영회 모집 안내</p>
        </section>

        <section className="recruiting-content">
          {content?.html ? (
            <article dangerouslySetInnerHTML={{ __html: content.html }} />
          ) : (
            <>
              <div className="recruiting-section">
                <h2>모집 안내</h2>
                <p>연영회는 연 1회, 3월 중 리크루팅을 실시합니다.</p>
              </div>

              <div className="recruiting-section">
                <h2>지원 자격</h2>
                <ul className="qualification-list">
                  <li>사진에 대한 열정과 관심</li>
                  <li>정기적인 활동 참여 가능</li>
                  <li>다른 멤버들과의 협력과 소통</li>
                </ul>
              </div>

              <div className="recruiting-section">
                <h2>지원 방법</h2>
                <div className="application-steps">
                  <div className="step">
                    <div className="step-number">1</div>
                    <div className="step-content">
                      <h3>지원서 작성</h3>
                      <p>지원서를 작성하여 제출해주세요.</p>
                    </div>
                  </div>
                  <div className="step">
                    <div className="step-number">2</div>
                    <div className="step-content">
                      <h3>면접</h3>
                      <p>지원서 검토 후 면접을 진행합니다.</p>
                    </div>
                  </div>
                  <div className="step">
                    <div className="step-number">3</div>
                    <div className="step-content">
                      <h3>합격 통보</h3>
                      <p>합격자에게 개별적으로 연락드립니다.</p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
