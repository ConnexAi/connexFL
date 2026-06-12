'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'
import {
  LayoutDashboard,
  Building2,
  FileText,
  BarChart3,
  FileCheck,
  FileBarChart,
  LogOut,
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Inicio', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/empresas', label: 'Empresas', icon: Building2, exact: false },
  { href: '/dashboard/pliegos', label: 'Pliegos', icon: FileText, exact: false },
  { href: '/dashboard/comparaciones', label: 'Comparaciones', icon: BarChart3, exact: false },
  { href: '/dashboard/anexos', label: 'Anexos', icon: FileCheck, exact: false },
  { href: '/dashboard/informes', label: 'Informes', icon: FileBarChart, exact: false },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = authClient.useSession()

  const user = session?.user
  const initials = user?.name
    ? user.name.split(' ').filter(Boolean).map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
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
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 rounded-[6px] bg-terracotta shrink-0 flex items-center justify-center group-hover:bg-terracotta-hover transition-colors">
            <span className="text-[11px] font-bold text-white tracking-tight leading-none select-none">CX</span>
          </div>
          <span className="text-[15px] font-semibold text-ink tracking-tight">Connex</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 pb-3 space-y-0.5" aria-label="Navegación principal">
        {navItems.map((item) => {
          const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={[
                'flex items-center gap-2.5 px-3 py-2.5 rounded-[10px]',
                'text-[13px] font-medium transition-colors duration-150',
                isActive
                  ? 'bg-terracotta-dim text-ink [&_svg]:text-terracotta'
                  : 'text-ink-2 hover:bg-nav-hover hover:text-ink',
              ].join(' ')}
            >
              <Icon size={15} strokeWidth={1.75} aria-hidden="true" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User footer */}
      <div className="px-3 pt-3 pb-4 border-t border-border-subtle space-y-0.5">
        <div className="flex items-center gap-2.5 px-3 py-2.5">
          <div className="w-7 h-7 rounded-full bg-surface-2 border border-border-subtle flex items-center justify-center shrink-0 text-[10px] font-semibold text-ink-2 uppercase select-none" aria-hidden="true">
            {initials}
          </div>
          <span className="text-[13px] font-medium text-ink-2 truncate min-w-0 flex-1" title={user?.name ?? 'Abogado'}>
            {user?.name ?? 'Abogado'}
          </span>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] text-[13px] font-medium text-ink-3 hover:bg-nav-hover hover:text-ink-2 transition-colors duration-150 w-full text-left"
        >
          <LogOut size={14} strokeWidth={1.75} aria-hidden="true" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
