'use client'

import { authClient } from '@/lib/auth-client'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function DashboardPage() {
  const { data: session, isPending } = authClient.useSession()
  const router = useRouter()

  useEffect(() => {
    if (session?.user) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/abogados/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          id: session.user.id,
          email: session.user.email,
          nombre: session.user.name,
        }),
      }).catch(console.error)
    }
  }, [session])

  async function handleSignOut() {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => router.push('/login'),
      },
    })
  }

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    )
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">
              Bienvenido, {session?.user?.name ?? 'Abogado'}
            </p>
          </div>
          <button
            onClick={handleSignOut}
            className="px-4 py-2 border border-border rounded-lg hover:bg-accent transition-colors text-sm"
          >
            Cerrar sesión
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-6 border border-border rounded-lg">
            <h2 className="font-semibold">Empresas</h2>
            <p className="text-3xl font-bold mt-2">0</p>
            <p className="text-muted-foreground text-sm">empresas registradas</p>
          </div>
          <div className="p-6 border border-border rounded-lg">
            <h2 className="font-semibold">Pliegos</h2>
            <p className="text-3xl font-bold mt-2">0</p>
            <p className="text-muted-foreground text-sm">pliegos analizados</p>
          </div>
          <div className="p-6 border border-border rounded-lg">
            <h2 className="font-semibold">Comparaciones</h2>
            <p className="text-3xl font-bold mt-2">0</p>
            <p className="text-muted-foreground text-sm">comparaciones realizadas</p>
          </div>
        </div>
      </div>
    </main>
  )
}
