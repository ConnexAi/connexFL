import DashboardTopbar from '@/components/dashboard/DashboardTopbar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dashboard-root flex flex-col" style={{ minHeight: '100dvh' }}>
      <DashboardTopbar />
      <main className="dashboard-main flex-1 min-w-0 flex flex-col overflow-hidden">{children}</main>
    </div>
  )
}
