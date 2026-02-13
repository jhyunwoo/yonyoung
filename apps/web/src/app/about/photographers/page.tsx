'use client'

import { useState, useEffect, useRef } from 'react'
import { createBrowserApiClient } from '@/lib/api-client'
import { unwrapData } from '@/lib/api-result'
import './Photographers.css'

const apiClient = createBrowserApiClient()

type PhotographerMember = {
  id: number
  generation: string
  name: string
  type: '정회원' | '준회원'
  email: string
  instagram: string
  website: string
  mainPhotoUrl: string
  mainPhoto: string
  works: string[]
}

type PhotographerGroup = {
  generation: string
  members: PhotographerMember[]
}

function normalizeGroups(input: unknown): PhotographerGroup[] {
  if (!Array.isArray(input)) return []

  return input.map((group) => {
    const value = group as { generation?: string; members?: unknown[] }
    const members = Array.isArray(value.members)
      ? value.members.map((member) => {
          const item = member as Record<string, unknown>
          const mainPhotoUrl = String(item.mainPhotoUrl ?? '')
          return {
            id: Number(item.id ?? 0),
            generation: String(item.generation ?? value.generation ?? ''),
            name: String(item.name ?? ''),
            type: item.type === '정회원' ? '정회원' : '준회원',
            email: String(item.email ?? ''),
            instagram: String(item.instagram ?? ''),
            website: String(item.website ?? ''),
            mainPhotoUrl,
            mainPhoto: mainPhotoUrl,
            works: Array.isArray(item.works) ? item.works.map((work) => String(work)) : []
          } satisfies PhotographerMember
        })
      : []

    return {
      generation: String(value.generation ?? ''),
      members: members.sort((a, b) => {
        if (a.type !== b.type) return a.type === '정회원' ? -1 : 1
        return a.name.localeCompare(b.name, 'ko')
      })
    } satisfies PhotographerGroup
  })
}

// 이미지 업로드 컴포넌트
function ImageUploadField({ 
  label, 
  value, 
  onChange, 
  aspectRatio = '1/1' 
}: { 
  label: string, 
  value: string, 
  onChange: (url: string) => void,
  aspectRatio?: string
}) {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleUpload = async (file: File) => {
    try {
      const uploaded = await unwrapData<{ url: string }>(
        apiClient.v1.admin.assets.$post({
          form: {
            entity: 'photographer',
            file
          }
        })
      )
      onChange(uploaded.url)
    } catch {
      alert('이미지 업로드 중 오류가 발생했습니다.')
    }
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUpload(e.dataTransfer.files[0])
    }
  }

  return (
    <div className="image-upload-field">
      <label>{label}</label>
      <div 
        className={`dropzone ${isDragging ? 'dragging' : ''} ${value ? 'has-image' : ''}`}
        style={{ aspectRatio }}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        {value ? (
          <img src={value} alt="미리보기" className="upload-preview" />
        ) : (
          <div className="upload-placeholder">
            <span>+</span>
            <p>드래그 또는 클릭</p>
          </div>
        )}
        <input 
          type="file" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          accept="image/*"
          onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
        />
      </div>
    </div>
  )
}

export default function Photographers() {
  const [selectedMember, setSelectedMember] = useState<PhotographerMember | null>(null)
  const [isAdminMode, setIsAdminMode] = useState(false)
  const [photographerGroups, setPhotographerGroups] = useState<PhotographerGroup[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // 모달 관련 상태
  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [memberToDelete, setMemberToDelete] = useState<PhotographerMember | null>(null)
  const [editingMember, setEditingMember] = useState<PhotographerMember | null>(null)
  
  // 폼 상태
  const [formData, setFormData] = useState({
    generation: '',
    name: '',
    type: '정회원',
    email: '',
    instagram: '',
    website: '',
    mainPhoto: '', // 임시 (실제 파일 업로드는 나중에 처리하거나 URL 입력)
    work1: '',
    work2: '',
    work3: ''
  })

  useEffect(() => {
    // 데이터 가져오기
    const fetchData = async () => {
      try {
        const data = await unwrapData(apiClient.v1.public.photographers.$get())
        setPhotographerGroups(normalizeGroups(data))
      } catch (error) {
        console.error('Failed to fetch photographers:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()

    // 관리자 모드 감지
    const savedAdminMode = localStorage.getItem('isAdminMode') === 'true'
    setIsAdminMode(savedAdminMode)

    const handleAdminChange = (e: Event) => {
      const customEvent = e as CustomEvent<boolean>
      setIsAdminMode(Boolean(customEvent.detail))
    }
    window.addEventListener('adminModeChange', handleAdminChange as EventListener)
    return () => window.removeEventListener('adminModeChange', handleAdminChange as EventListener)
  }, [])

  const handleCloseModal = () => setSelectedMember(null)

  const openAddModal = (gen?: string) => {
    setEditingMember(null)
    setFormData({
      generation: gen || '',
      name: '',
      type: '정회원',
      email: '',
      instagram: '',
      website: '',
      mainPhoto: '',
      work1: '',
      work2: '',
      work3: ''
    })
    setIsFormModalOpen(true)
  }

  const openEditModal = (member: PhotographerMember, generation: string) => {
    setEditingMember({ ...member, generation })
    setFormData({
      generation: generation,
      name: member.name,
      type: member.type,
      email: member.email || '',
      instagram: member.instagram || '',
      website: member.website || '',
      mainPhoto: member.mainPhoto || '',
      work1: member.works?.[0] || '',
      work2: member.works?.[1] || '',
      work3: member.works?.[2] || ''
    })
    setIsFormModalOpen(true)
  }

  const openDeleteModal = (member: PhotographerMember, generation: string) => {
    setMemberToDelete({ ...member, generation })
    setIsDeleteModalOpen(true)
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const photographer = {
      generation: formData.generation.includes('기') ? formData.generation : `${formData.generation}기`,
      name: formData.name,
      type: formData.type as '정회원' | '준회원',
      email: formData.email,
      instagram: formData.instagram,
      website: formData.website,
      mainPhotoUrl: formData.mainPhoto,
      works: [formData.work1, formData.work2, formData.work3].filter(Boolean)
    }

    try {
      if (editingMember) {
        await unwrapData(
          apiClient.v1.admin.photographers[':id'].$patch({
            param: { id: editingMember.id },
            json: photographer
          })
        )
      } else {
        await unwrapData(apiClient.v1.admin.photographers.$post({ json: photographer }))
      }

      const groups = await unwrapData(apiClient.v1.public.photographers.$get())
      setPhotographerGroups(normalizeGroups(groups))
      setIsFormModalOpen(false)
      alert(editingMember ? '정보가 수정되었습니다.' : '사진가가 추가되었습니다.')
    } catch (error) {
      alert('오류가 발생했습니다.')
    }
  }

  const handleDeleteConfirm = async () => {
    if (!memberToDelete) return

    try {
      await unwrapData(apiClient.v1.admin.photographers[':id'].$delete({ param: { id: memberToDelete.id } }))
      const groups = await unwrapData(apiClient.v1.public.photographers.$get())
      setPhotographerGroups(normalizeGroups(groups))
      setIsDeleteModalOpen(false)
      setMemberToDelete(null)
      alert('삭제되었습니다.')
    } catch (error) {
      alert('오류가 발생했습니다.')
    }
  }

  return (
    <div className="photographers-page">
      <div className="container">
        <header className="photographers-header">
          <div className="header-title-row">
            <h1>PHOTOGRAPHERS</h1>
            {isAdminMode && (
              <button className="add-gen-btn" onClick={() => openAddModal()}>
                + 새 사진가 추가
              </button>
            )}
          </div>
          <div className="filter-nav">
            {photographerGroups.map(group => (
              <a key={group.generation} href={`#gen-${group.generation.replace('기', '')}`}>
                {group.generation}
              </a>
            ))}
          </div>
        </header>

        <div className="photographers-content">
          {isLoading ? (
            <div className="loading">로딩 중...</div>
          ) : photographerGroups.map((group) => (
            <section 
              key={group.generation} 
              id={`gen-${group.generation.replace('기', '')}`}
              className="gen-section"
            >
              <h2 className="gen-title">{group.generation}</h2>
              <div className="members-grid">
                {group.members.map((member: any) => (
                  <div key={member.name} className="member-item">
                    <div className="member-photo-wrapper">
                      <div 
                        className={`member-photo ${member.type === '정회원' ? 'full-member' : 'associate-member'}`}
                        onClick={() => !isAdminMode && setSelectedMember(member)}
                      >
                        {member.mainPhoto ? (
                          <img src={member.mainPhoto} alt={member.name} className="profile-img" />
                        ) : (
                          <div className="photo-placeholder"></div>
                        )}
                      </div>
                      
                      {isAdminMode && (
                        <div className="admin-actions">
                          <button className="edit-btn" onClick={() => openEditModal(member, group.generation)} title="수정">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4L18.5 2.5z"></path></svg>
                          </button>
                          <button className="delete-btn" onClick={() => openDeleteModal(member, group.generation)} title="삭제">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                          </button>
                        </div>
                      )}
                    </div>
                    <span className="member-name">{member.name}</span>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>

      {/* 상세 정보 모달 */}
      {selectedMember && (
        <div className="member-modal-overlay" onClick={handleCloseModal}>
          <div className="member-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-left">
              {selectedMember.mainPhoto ? (
                <img src={selectedMember.mainPhoto} alt={selectedMember.name} className="modal-main-photo" />
              ) : (
                <div className="main-photo-placeholder"></div>
              )}
            </div>
            <div className="modal-right">
              <div className="member-detail-info">
                <div className="detail-row">
                  <label>이름</label>
                  <div className="member-name-display">{selectedMember.name}</div>
                </div>
                <div className="detail-row">
                  <label>연락처 및 링크</label>
                  <div className="member-contact-links">
                    <a href={`mailto:${selectedMember.email || ''}`} className="contact-link-icon" title="Email">
                      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                    </a>
                    <a href={selectedMember.instagram || '#'} target="_blank" rel="noopener noreferrer" className="contact-link-icon" title="Instagram">
                      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                    </a>
                    <a href={selectedMember.website || '#'} target="_blank" rel="noopener noreferrer" className="contact-link-icon" title="Homepage">
                      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                    </a>
                  </div>
                </div>
              </div>
              
              <div className="member-works-section">
                <label>대표 작품</label>
                <div className="works-grid">
                  {[0, 1, 2].map(idx => (
                    <div key={idx} className="work-item">
                      {selectedMember.works?.[idx] ? (
                        <img src={selectedMember.works[idx]} alt={`작품 ${idx + 1}`} className="work-image" />
                      ) : (
                        <div className="work-placeholder"></div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 추가/수정 모달 */}
      {isFormModalOpen && (
        <div className="member-modal-overlay" onClick={() => setIsFormModalOpen(false)}>
          <div className="member-form-modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editingMember ? '사진가 정보 수정' : '새 사진가 추가'}</h2>
            <form onSubmit={handleFormSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label>기수 (예: 60)</label>
                  <input 
                    type="text" 
                    required 
                    value={formData.generation.replace('기', '')} 
                    onChange={e => setFormData({...formData, generation: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>이름</label>
                  <input 
                    type="text" 
                    required 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>회원 구분</label>
                  <select 
                    value={formData.type} 
                    onChange={e => setFormData({...formData, type: e.target.value})}
                  >
                    <option value="정회원">정회원</option>
                    <option value="준회원">준회원</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>이메일</label>
                  <input 
                    type="email" 
                    value={formData.email} 
                    onChange={e => setFormData({...formData, email: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>인스타그램 링크</label>
                  <input 
                    type="text" 
                    value={formData.instagram} 
                    onChange={e => setFormData({...formData, instagram: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>웹사이트 링크</label>
                  <input 
                    type="text" 
                    value={formData.website} 
                    onChange={e => setFormData({...formData, website: e.target.value})}
                  />
                </div>
              </div>

              <div className="form-section">
                <label>대표 사진 및 작품</label>
                <div className="admin-image-grid">
                  <ImageUploadField 
                    label="대표 사진 (1:1)" 
                    value={formData.mainPhoto} 
                    onChange={(url) => setFormData({...formData, mainPhoto: url})} 
                  />
                  <div className="admin-works-grid">
                    <ImageUploadField 
                      label="작품 1 (3:2)" 
                      value={formData.work1} 
                      onChange={(url) => setFormData({...formData, work1: url})} 
                      aspectRatio="3/2"
                    />
                    <ImageUploadField 
                      label="작품 2 (3:2)" 
                      value={formData.work2} 
                      onChange={(url) => setFormData({...formData, work2: url})} 
                      aspectRatio="3/2"
                    />
                    <ImageUploadField 
                      label="작품 3 (3:2)" 
                      value={formData.work3} 
                      onChange={(url) => setFormData({...formData, work3: url})} 
                      aspectRatio="3/2"
                    />
                  </div>
                </div>
              </div>

              <div className="form-actions">
                <button type="button" onClick={() => setIsFormModalOpen(false)}>취소</button>
                <button type="submit" className="submit-btn">저장</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {isDeleteModalOpen && (
        <div className="member-modal-overlay" onClick={() => setIsDeleteModalOpen(false)}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>사진가 삭제</h3>
            <p><strong>{memberToDelete?.name}</strong> 사진가를 삭제하시겠습니까?</p>
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
