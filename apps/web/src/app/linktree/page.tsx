'use client'

import { useState, useEffect } from 'react'
import type { LinktreeLinkResponse } from '@yonyoung/schemas'
import { createBrowserApiClient } from '@/lib/api-client'
import { unwrapData } from '@/lib/api-result'
import './Linktree.css'

const apiClient = createBrowserApiClient()

type LinktreeItem = LinktreeLinkResponse

export default function Linktree() {
  const [links, setLinks] = useState<LinktreeItem[]>([])
  const [isAdminMode, setIsAdminMode] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [linkToDelete, setLinkToDelete] = useState<LinktreeItem | null>(null)
  const [editingLink, setEditingLink] = useState<LinktreeItem | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    url: '',
    category: 'promotion' as LinktreeItem['category']
  })

  const CATEGORIES: Array<{ id: LinktreeItem['category']; label: string }> = [
    { id: 'promotion', label: '홍보 페이지' },
    { id: 'inquiry', label: '문의 및 협업 제안' },
    { id: 'activity', label: '활동 관련' },
    { id: 'sponsor', label: '후원 업체' },
    { id: 'private', label: '비공개' }
  ]

  const fetchData = async () => {
    try {
      const data = await unwrapData<LinktreeItem[]>(apiClient.v1.public.linktree.$get())
      setLinks(data)
    } catch (error) {
      console.error('Failed to fetch linktree:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void fetchData()

    const savedAdminMode = localStorage.getItem('isAdminMode') === 'true'
    setIsAdminMode(savedAdminMode)

    const handleAdminChange = (e: Event) => {
      const customEvent = e as CustomEvent<boolean>
      setIsAdminMode(Boolean(customEvent.detail))
    }

    window.addEventListener('adminModeChange', handleAdminChange as EventListener)
    return () => window.removeEventListener('adminModeChange', handleAdminChange as EventListener)
  }, [])

  const openAddModal = () => {
    setEditingLink(null)
    setFormData({ name: '', url: '', category: 'promotion' })
    setIsFormModalOpen(true)
  }

  const openEditModal = (link: LinktreeItem) => {
    setEditingLink(link)
    setFormData({
      name: link.name,
      url: link.url,
      category: link.category
    })
    setIsFormModalOpen(true)
  }

  const openDeleteModal = (link: LinktreeItem) => {
    setLinkToDelete(link)
    setIsDeleteModalOpen(true)
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      if (editingLink) {
        await unwrapData(
          apiClient.v1.admin.linktree[':id'].$patch({
            param: { id: editingLink.id },
            json: {
              name: formData.name,
              url: formData.url,
              category: formData.category,
              icon: editingLink.icon ?? '',
              order: editingLink.order ?? 0
            }
          })
        )
      } else {
        await unwrapData(
          apiClient.v1.admin.linktree.$post({
            json: {
              name: formData.name,
              url: formData.url,
              category: formData.category,
              icon: '',
              order: links.length
            }
          })
        )
      }

      await fetchData()
      setIsFormModalOpen(false)
      alert(editingLink ? '링크가 수정되었습니다.' : '링크가 추가되었습니다.')
    } catch {
      alert('오류가 발생했습니다.')
    }
  }

  const handleDeleteConfirm = async () => {
    if (!linkToDelete) return

    try {
      await unwrapData(apiClient.v1.admin.linktree[':id'].$delete({ param: { id: linkToDelete.id } }))
      await fetchData()
      setIsDeleteModalOpen(false)
      setLinkToDelete(null)
      alert('삭제되었습니다.')
    } catch {
      alert('오류가 발생했습니다.')
    }
  }

  return (
    <div className="linktree-page">
      <div className="container">
        <header className="linktree-header">
          <div className="header-title-row">
            <h1>LINKTREE</h1>
            {isAdminMode && (
              <button className="add-link-btn" onClick={openAddModal}>
                + 새 링크 추가
              </button>
            )}
          </div>
          <p className="subtitle">연영회 공식 채널 및 서비스</p>
        </header>

        <div className="linktree-columns">
          {isLoading ? (
            <div className="loading">로딩 중...</div>
          ) : CATEGORIES.map((cat) => (
            <div key={cat.id} className="link-column">
              <h2 className="column-title">
                {cat.id === 'private' ? (
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
                    <path d="M17 10h-1V7c0-2.21-1.79-4-4-4S8 4.79 8 7v3H7c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2v-8c0-1.1-.9-2-2-2zM10 7c0-1.1.9-2 2-2s2 .9 2 2v3h-4V7z" />
                  </svg>
                ) : cat.label}
              </h2>
              <div className="column-links">
                {links.filter((link) => link.category === cat.id).length > 0 ? (
                  links
                    .filter((link) => link.category === cat.id)
                    .map((link) => (
                      <div key={link.id} className="link-card-wrapper">
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`link-card ${isAdminMode ? 'admin-mode' : ''}`}
                          onClick={(e) => isAdminMode && e.preventDefault()}
                        >
                          <span className="link-name">{link.name}</span>
                        </a>

                        {isAdminMode && (
                          <div className="admin-actions">
                            <button className="edit-btn" onClick={() => openEditModal(link)} title="수정">
                              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4L18.5 2.5z"></path></svg>
                            </button>
                            <button className="delete-btn" onClick={() => openDeleteModal(link)} title="삭제">
                              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                ) : (
                  <div className="empty-category">
                    <span>준비 중입니다.</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {isFormModalOpen && (
        <div className="linktree-modal-overlay" onClick={() => setIsFormModalOpen(false)}>
          <div className="linktree-form-modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editingLink ? '링크 수정' : '새 링크 추가'}</h2>
            <form onSubmit={handleFormSubmit}>
              <div className="form-group">
                <label>링크 이름</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="예: Instagram"
                />
              </div>
              <div className="form-group">
                <label>링크 URL</label>
                <input
                  type="url"
                  required
                  value={formData.url}
                  onChange={e => setFormData({ ...formData, url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="form-group">
                <label>카테고리</label>
                <select
                  value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value as LinktreeItem['category'] })}
                  required
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-actions">
                <button type="button" onClick={() => setIsFormModalOpen(false)}>취소</button>
                <button type="submit" className="submit-btn">저장</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDeleteModalOpen && (
        <div className="linktree-modal-overlay" onClick={() => setIsDeleteModalOpen(false)}>
          <div className="linktree-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>링크 삭제</h3>
            <p><strong>{linkToDelete?.name}</strong> 링크를 삭제하시겠습니까?</p>
            <div className="form-actions">
              <button onClick={() => setIsDeleteModalOpen(false)}>취소</button>
              <button className="delete-confirm-btn" onClick={handleDeleteConfirm}>확인</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
