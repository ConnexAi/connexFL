'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

const sections = [
  { id: 'problema', label: 'Problema' },
  { id: 'como-funciona', label: 'Cómo funciona' },
  { id: 'resultados', label: 'Resultados' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [activeSection, setActiveSection] = useState('')
  const dotRef = useRef<HTMLSpanElement>(null)
  const navRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const observers: IntersectionObserver[] = []

    sections.forEach(({ id }) => {
      const el = document.getElementById(id)
      if (!el) return
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (!entry) return
          if (entry.isIntersecting) setActiveSection(id)
        },
        { rootMargin: '-40% 0px -55% 0px' }
      )
      obs.observe(el)
      observers.push(obs)
    })

    return () => observers.forEach((o) => o.disconnect())
  }, [])

  useEffect(() => {
    if (!dotRef.current || !navRef.current) return
    const activeEl = navRef.current.querySelector(`[data-section="${activeSection}"]`) as HTMLElement
    if (!activeEl) {
      dotRef.current.style.opacity = '0'
      return
    }
    const navRect = navRef.current.getBoundingClientRect()
    const elRect = activeEl.getBoundingClientRect()
    const centerX = elRect.left - navRect.left + elRect.width / 2
    dotRef.current.style.transform = `translateX(${centerX}px)`
    dotRef.current.style.opacity = '1'
  }, [activeSection])

  return (
    <header
      className={[
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        scrolled
          ? 'bg-bg/90 backdrop-blur-md border-b border-border-subtle'
          : 'bg-transparent',
      ].join(' ')}
    >
      <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 rounded-[6px] bg-terracotta flex items-center justify-center shrink-0 group-hover:bg-terracotta-hover transition-colors">
            <span className="text-[11px] font-bold text-white tracking-tight leading-none">CX</span>
          </div>
          <span className="text-[14px] font-semibold text-ink tracking-tight">Connex</span>
        </Link>

        <nav className="hidden md:flex items-center relative" ref={navRef}>
          <span
            ref={dotRef}
            className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-terracotta transition-all duration-300 ease-out opacity-0 -translate-x-0.5"
            aria-hidden="true"
          />
          {sections.map(({ id, label }) => (
            <a
              key={id}
              href={`#${id}`}
              data-section={id}
              className={[
                'px-4 py-2 text-[13px] font-medium transition-colors duration-150',
                activeSection === id ? 'text-ink' : 'text-ink-2 hover:text-ink',
              ].join(' ')}
            >
              {label}
            </a>
          ))}
        </nav>

        <Link
          href="/login"
          className="px-4 py-2 rounded-md bg-terracotta text-white text-[13px] font-medium hover:bg-terracotta-hover transition-colors"
        >
          Acceder
        </Link>
      </div>
    </header>
  )
}
