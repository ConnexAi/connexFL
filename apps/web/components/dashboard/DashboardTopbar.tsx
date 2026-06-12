'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { authClient } from '@/lib/auth-client'
import { Settings, Bell, ChevronDown, LogOut, User } from 'lucide-react'

const navLinks = [
  { href: '/dashboard', label: 'Inicio', exact: true },
  { href: '/dashboard/empresas', label: 'Empresas' },
  { href: '/dashboard/pliegos', label: 'Pliegos' },
  { href: '/dashboard/comparaciones', label: 'Comparaciones' },
  { href: '/dashboard/anexos', label: 'Anexos' },
  { href: '/dashboard/informes', label: 'Informes' },
]

export default function DashboardTopbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = authClient.useSession()
  const [dropdownOpen, setDropdownOpen] = useState(false)

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href
    return pathname === href || pathname.startsWith(href + '/')
  }

  async function handleSignOut() {
    await authClient.signOut()
    router.push('/')
  }

  const initials =
    session?.user?.name
      ?.split(' ')
      .filter(Boolean)
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() ?? '?'

  return (
    <header className="sticky top-0 z-50 bg-surface border-b border-border shrink-0">
      <div className="max-w-[1280px] mx-auto px-8 h-[60px] flex items-center gap-6">

        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2.5 shrink-0">
          <div
            className="w-9 h-9 rounded-[10px] bg-terracotta flex items-center justify-center shrink-0"
          >
            <span style={{ fontFamily: 'var(--font-outfit, Outfit, sans-serif)', fontWeight: 700, fontSize: 14, color: 'white', letterSpacing: '-0.01em', lineHeight: 1 }}>CX</span>
          </div>
          <span style={{ fontFamily: 'var(--font-outfit, Outfit, sans-serif)', fontWeight: 700, fontSize: 18, color: '#111827', letterSpacing: '-0.01em' }}>
            Connex
          </span>
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-0.5" aria-label="Navegación principal">
          {navLinks.map(({ href, label, exact }) => {
            const active = isActive(href, exact)
            return (
              <Link
                key={href}
                href={href}
                className={[
                  'relative px-3 py-1.5 rounded-md transition-colors duration-150',
                  active
                    ? 'text-[#111827]'
                    : 'text-[#374151] hover:text-[#111827] hover:bg-nav-hover',
                ].join(' ')}
                style={{
                  fontFamily: 'var(--font-outfit, Outfit, sans-serif)',
                  fontWeight: 600,
                  fontSize: 15,
                  letterSpacing: 0,
                }}
              >
                {label}
                {active && (
                  <span
                    className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-terracotta rounded-full"
                    aria-hidden="true"
                  />
                )}
              </Link>
            )
          })}
        </nav>

        <div className="flex-1" />

        {/* Search */}
        <div className="relative shrink-0 hidden lg:block">
          <svg
            width="13"
            height="13"
            viewBox="0 0 16 16"
            fill="none"
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            stroke="#9CA3AF"
            strokeWidth="1.5"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <circle cx="6.5" cy="6.5" r="4.5" />
            <path d="M10 10 14 14" />
          </svg>
          <input
            type="search"
            placeholder="Buscar..."
            className="w-[200px] h-8 pl-8 pr-3 rounded-lg bg-bg border border-border text-[14px] text-ink placeholder:text-ink-3 focus:outline-none focus:border-terracotta/50 transition-colors"
            style={{ fontFamily: 'var(--font-outfit, Outfit, sans-serif)', fontWeight: 500 }}
          />
        </div>

        {/* Icon buttons */}
        <button
          type="button"
          aria-label="Configuración"
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-nav-hover transition-colors"
        >
          <Settings size={16} color="#374151" />
        </button>
        <button
          type="button"
          aria-label="Notificaciones"
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-nav-hover transition-colors"
        >
          <Bell size={16} color="#374151" />
        </button>

        {/* Avatar + dropdown */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setDropdownOpen((o) => !o)}
            className="flex items-center gap-1.5 h-8 pl-1 pr-2 rounded-lg hover:bg-nav-hover transition-colors"
            aria-haspopup="true"
            aria-expanded={dropdownOpen}
          >
            <div className="w-7 h-7 rounded-full bg-[#F3F4F6] border border-border flex items-center justify-center">
              <span style={{ fontFamily: 'var(--font-outfit, Outfit, sans-serif)', fontWeight: 600, fontSize: 11, color: '#374151', lineHeight: 1 }}>
                {initials}
              </span>
            </div>
            <ChevronDown size={12} color="#9CA3AF" />
          </button>

          {dropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setDropdownOpen(false)}
                aria-hidden="true"
              />
              <div className="absolute right-0 top-full mt-1 w-52 bg-surface border border-border rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.08)] py-1 z-50">
                <div className="px-3.5 py-2.5 border-b border-border">
                  <p className="text-[14px] font-semibold text-ink truncate"
                    style={{ fontFamily: 'var(--font-outfit, Outfit, sans-serif)', fontWeight: 600 }}>
                    {session?.user?.name ?? 'Usuario'}
                  </p>
                  <p className="text-[12px] text-ink-3 truncate mt-0.5"
                    style={{ fontFamily: 'var(--font-outfit, Outfit, sans-serif)', fontWeight: 500 }}>
                    {session?.user?.email ?? ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { setDropdownOpen(false); router.push('/dashboard') }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[14px] text-ink-2 hover:text-ink hover:bg-nav-hover transition-colors"
                  style={{ fontFamily: 'var(--font-outfit, Outfit, sans-serif)', fontWeight: 500 }}
                >
                  <User size={14} color="#374151" />
                  Perfil
                </button>
                <button
                  type="button"
                  onClick={() => { setDropdownOpen(false); handleSignOut() }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[14px] text-terracotta hover:bg-terracotta-dim transition-colors"
                  style={{ fontFamily: 'var(--font-outfit, Outfit, sans-serif)', fontWeight: 500 }}
                >
                  <LogOut size={14} className="text-terracotta" />
                  Cerrar sesión
                </button>
              </div>
            </>
          )}
        </div>

      </div>
    </header>
  )
}
