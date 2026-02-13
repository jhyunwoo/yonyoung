import { createServerApiClient } from '@/lib/api-client'
import { unwrapDataOrFallback } from '@/lib/api-result'
import { renderTiptapJsonToHtml } from '@/lib/tiptap-render'
import './Supporters.css'

export const dynamic = 'force-dynamic'

async function getSupportersContent() {
  const client = createServerApiClient()
  const page = await unwrapDataOrFallback(
    client.v1.public.pages[':slug'].$get({ param: { slug: 'supporters' } }),
    {
      slug: 'supporters',
      title: '서포터즈',
      contentJson: null,
      updatedAt: new Date(0).toISOString()
    }
  )

  return {
    title: page.title ?? '서포터즈',
    html: renderTiptapJsonToHtml(page.contentJson),
  }
}

export default async function Supporters() {
  const content = await getSupportersContent()

  return (
    <div className="supporters-page">
      <div className="container">
        <header className="supporters-header">
          <h1>{content?.title ?? '서포터즈'}</h1>
        </header>

        <div className="supporters-content">
          {content?.html ? (
            <article dangerouslySetInnerHTML={{ __html: content.html }} />
          ) : (
            <div className="empty-message">준비 중입니다.</div>
          )}
        </div>
      </div>
    </div>
  )
}
