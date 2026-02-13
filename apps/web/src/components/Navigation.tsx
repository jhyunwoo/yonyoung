'use client'

import React from 'react'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import ThemeToggle from './ThemeToggle'
import './Navigation.css'

export default function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navItems = [
    { 
      href: '/about', 
      label: 'ABOUT',
      subItems: [
        { href: '/about', label: '소개' },
        { href: '/about/photographers', label: 'PHOTOGRAPHERS' },
        { href: '/about/recruiting', label: 'RECRUITING' },
      ]
    },
    { 
      href: '/archive', 
      label: 'ARCHIVE',
      subItems: [
        { href: '/archive/records', label: '활동 기록' },
        { href: '/archive/supporters', label: '서포터즈' },
        { href: '/archive/exhibitions', label: '전시회' },
      ]
    },
    { href: '/linktree', label: 'LINKTREE' },
    { href: '/donate', label: 'DONATE US' },
  ]

  return (
    <nav className={`navigation ${isScrolled ? 'scrolled' : ''}`}>
      <div className="nav-container">
        <div className="nav-left">
          <Link href="/" className="logo">
            <div className="logo-image">
              <Image
                src="/images/연영회 방패로고_검정.jpg"
                alt="연영회 로고"
                width={40}
                height={40}
                priority
                style={{ objectFit: 'contain' }}
              />
            </div>
              <div className="logo-text">
                <span>연세대학교 중앙사진동아리</span>
                연영회
              </div>
          </Link>
        </div>
        
        <button
          className="mobile-menu-toggle"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="메뉴 토글"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        <ul className={`nav-menu ${isMobileMenuOpen ? 'open' : ''}`}>
          {navItems.map((item) => (
            <li key={item.href} className={item.subItems ? 'has-dropdown' : ''}>
              <Link
                href={item.href}
                className={pathname === item.href || (item.subItems && pathname.startsWith(item.href)) ? 'active' : ''}
                onClick={() => !item.subItems && setIsMobileMenuOpen(false)}
              >
                {item.label}
              </Link>
              {item.subItems && (
                <ul className="dropdown">
                  {item.subItems.map((subItem) => (
                    <li key={subItem.href}>
                      <Link 
                        href={subItem.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        {subItem.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
          <li>
            <Link href="/admin" onClick={() => setIsMobileMenuOpen(false)}>
              ADMIN
            </Link>
          </li>
          <li>
            <ThemeToggle />
          </li>
        </ul>
      </div>
    </nav>
  )
}
