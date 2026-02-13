import { createServerApiClient } from '@/lib/api-client'
import { unwrapDataOrFallback } from '@/lib/api-result'
import { renderTiptapJsonToHtml } from '@/lib/tiptap-render'
import './Donate.css'

export const dynamic = 'force-dynamic'

async function getDonateContent() {
  const client = createServerApiClient()
  const page = await unwrapDataOrFallback(
    client.v1.public.pages[':slug'].$get({ param: { slug: 'donate' } }),
    {
      slug: 'donate',
      title: 'DONATE US',
      contentJson: null,
      updatedAt: new Date(0).toISOString()
    }
  )

  return {
    title: page.title ?? 'DONATE US',
    html: renderTiptapJsonToHtml(page.contentJson),
  }
}

export default async function Donate() {
  const content = await getDonateContent()

  return (
    <div className="donate-page">
      <div className="container">
        <section className="donate-hero">
          <h1>{content?.title ?? 'DONATE US'}</h1>
          <p className="subtitle">연영회 후원 안내</p>
        </section>

        <section className="donate-content">
          {content?.html ? (
            <article dangerouslySetInnerHTML={{ __html: content.html }} />
          ) : (
            <>
              <div className="donate-section">
                <h2>후원 안내</h2>
                <p>연영회는 여러분의 후원으로 더 나은 활동을 이어갈 수 있습니다.</p>
              </div>
              <div className="donate-section">
                <h2>문의</h2>
                <p>후원 관련 문의사항이 있으시면 연락주세요.</p>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
