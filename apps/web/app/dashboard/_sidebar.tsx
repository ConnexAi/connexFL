'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function IconHome() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 7.5 8 2.5l6 5V14a.5.5 0 0 1-.5.5H10v-4H6v4H2.5A.5.5 0 0 1 2 14V7.5Z" />
    </svg>
  )
}

function IconBuilding() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6.5" width="12" height="8" rx=".5" />
      <path d="M5.5 6.5V4a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 .5.5v2.5" />
      <line x1="6.5" y1="11" x2="9.5" y2="11" />
    </svg>
  )
}

function IconFile() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 1.5h6l3 3v9.5a.5.5 0 0 1-.5.5h-8.5a.5.5 0 0 1-.5-.5V2a.5.5 0 0 1 .5-.5Z" />
      <path d="M9.5 1.5V4.5h3" />
      <path d="M5.5 7.5h5M5.5 9.5h5M5.5 11.5h3" />
    </svg>
  )
}

function IconBars() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7.5" width="3" height="6" rx=".5" />
      <rect x="6.5" y="4.5" width="3" height="9" rx=".5" />
      <rect x="11" y="2" width="3" height="11.5" rx=".5" />
      <line x1="1.5" y1="13.75" x2="14.5" y2="13.75" />
    </svg>
  )
}

function IconLogout() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.5 5.5 14 9l-3.5 3.5M14 9H5.5" />
      <path d="M5 3.5H2.5a.5.5 0 0 0-.5.5v9a.5.5 0 0 0 .5.5H5" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Nav items
// ---------------------------------------------------------------------------

const navItems = [
  { href: '/dashboard', label: 'Inicio', icon: <IconHome />, exact: true },
  { href: '/dashboard/empresas', label: 'Empresas', icon: <IconBuilding />, exact: false },
  { href: '/dashboard/pliegos', label: 'Pliegos', icon: <IconFile />, exact: false },
  { href: '/dashboard/comparaciones', label: 'Comparaciones', icon: <IconBars />, exact: false },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = authClient.useSession()

  const user = session?.user
  const initials = user?.name
    ? user.name
        .split(' ')
        .filter(Boolean)
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'A'

  async function handleSignOut() {
    await authClient.signOut({
      fetchOptions: { onSuccess: () => router.push('/login') },
    })
  }

  return (
    <aside className="w-[240px] shrink-0 flex flex-col min-h-screen bg-surface border-r border-border-subtle">
      {/* Logo */}
      <div className="px-5 pt-6 pb-5">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full bg-terracotta shrink-0 flex items-center justify-center"
            aria-hidden="true"
          >
            <span className="text-[11px] font-bold text-white tracking-tight leading-none select-none">
              CX
            </span>
          </div>
          <span className="text-[15px] font-semibold text-ink tracking-tight">Connex</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 pb-3 space-y-0.5" aria-label="Navegación principal">
        {navItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={[
                'flex items-center gap-2.5 px-3 py-2.5 rounded-[10px]',
                'text-[14px] font-medium transition-colors duration-150',
                isActive
                  ? 'bg-terracotta-dim text-white [&_svg]:text-terracotta'
                  : 'text-ink-2 hover:bg-nav-hover',
              ].join(' ')}
            >
              {item.icon}
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User footer */}
      <div className="px-3 pt-3 pb-4 border-t border-border-subtle space-y-0.5">
        <div className="flex items-center gap-2.5 px-3 py-2.5">
          <div
            className="w-7 h-7 rounded-full bg-surface-2 border border-border-subtle flex items-center justify-center shrink-0 text-[10px] font-semibold text-ink-2 uppercase select-none"
            aria-hidden="true"
          >
            {initials}
          </div>
          <span
            className="text-[13px] font-medium text-ink-2 truncate min-w-0 flex-1"
            title={user?.name ?? 'Abogado'}
          >
            {user?.name ?? 'Abogado'}
          </span>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] text-[14px] font-medium text-ink-3 hover:bg-nav-hover hover:text-ink-2 transition-colors duration-150 w-full text-left"
        >
          <IconLogout />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
