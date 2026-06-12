import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="border-t border-border-subtle py-10 px-6">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-[5px] bg-terracotta flex items-center justify-center shrink-0">
            <span className="text-[10px] font-bold text-white leading-none">CX</span>
          </div>
          <span className="text-[13px] font-semibold text-ink-2">Connex</span>
        </div>

        <p className="text-[12px] text-ink-3 text-center">
          Plataforma de IA para abogados especializados en contratación pública colombiana.
        </p>

        <div className="flex items-center gap-4">
          <Link href="/login" className="text-[12px] text-ink-3 hover:text-ink-2 transition-colors">
            Acceder
          </Link>
          <span className="text-ink-3">·</span>
          <span className="text-[12px] text-ink-3">
            {new Date().getFullYear()} Connex
          </span>
        </div>
      </div>
    </footer>
  )
}
