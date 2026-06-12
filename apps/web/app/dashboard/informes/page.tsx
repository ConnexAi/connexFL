import { FileBarChart } from 'lucide-react'

export default function InformesPage() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center max-w-sm px-6">
        <div className="w-14 h-14 rounded-2xl bg-ochre-dim flex items-center justify-center mx-auto mb-4">
          <FileBarChart size={24} className="text-ochre" />
        </div>
        <p className="text-[16px] font-semibold text-ink mb-2">Informes — próximamente</p>
        <p className="text-[13px] text-ink-2 leading-relaxed">
          Aquí encontrarás resúmenes de actividad, histórico de licitaciones y análisis de rendimiento por empresa y sector.
        </p>
      </div>
    </div>
  )
}
