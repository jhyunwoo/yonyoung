import Image from 'next/image'
import './Footer.css'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-top">
          <div className="logo">
            <div className="logo-image">
              <Image
                src="/images/연영회 방패로고_검정.jpg"
                alt="연영회 로고"
                width={40}
                height={40}
                style={{ objectFit: 'contain' }}
              />
            </div>
            <div className="logo-text">
              <span>연세대학교 중앙사진동아리</span>
              연영회
            </div>
          </div>
        </div>
        
        <div className="footer-bottom">
          <div className="footer-info-grid">
            <div className="footer-info-item">
              <span className="info-label">오픈 카톡방</span>
              <a href="https://open.kakao.com/o/snVWZ4th" target="_blank" rel="noopener noreferrer" className="info-content">
                https://open.kakao.com/o/snVWZ4th
              </a>
            </div>
            
            <div className="footer-info-item">
              <span className="info-label">INSTAGRAM</span>
              <span className="info-content">@yonyongpage</span>
            </div>

            <div className="footer-info-item">
              <span className="info-label">E-mail</span>
              <a href="mailto:kimse0604@naver.com" className="info-content">
                kimse0604@naver.com
              </a>
            </div>
            
            <div className="footer-info-item">
              <span className="info-label">HP</span>
              <span className="info-content">010-6814-1800</span>
            </div>
            
            <div className="footer-info-item">
              <span className="info-label">주소</span>
              <span className="info-content">
                서울특별시 서대문구 연희로 50 연세대학교 대강당 nn호
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
