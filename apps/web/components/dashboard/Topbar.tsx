'use client'

import { usePathname } from 'next/navigation'

const titles: Record<string, string> = {
  '/dashboard': 'Inicio',
  '/dashboard/empresas': 'Empresas',
  '/dashboard/pliegos': 'Pliegos',
  '/dashboard/comparaciones': 'Comparaciones',
  '/dashboard/anexos': 'Anexos',
  '/dashboard/informes': 'Informes',
}

function getTitle(pathname: string) {
  if (titles[pathname]) return titles[pathname]
  for (const [key, label] of Object.entries(titles)) {
    if (pathname.startsWith(key + '/')) return label
  }
  return 'Dashboard'
}

interface TopbarProps {
  right?: React.ReactNode
}

export default function Topbar({ right }: TopbarProps) {
  const pathname = usePathname()
  const title = getTitle(pathname)

  return (
    <header className="h-14 flex items-center justify-between px-6 border-b border-border-subtle shrink-0 bg-bg/80 backdrop-blur-sm sticky top-0 z-10">
      <h1 className="text-[15px] font-semibold text-ink">{title}</h1>
      {right && <div className="flex items-center gap-2">{right}</div>}
    </header>
  )
}
