'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'

export default function PliegoDetailRedirect() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params.id

  useEffect(() => {
    api.pliegos.get(id)
      .then((pliego) => {
        if (pliego.licitacion_id) {
          router.replace(`/dashboard/licitaciones/${pliego.licitacion_id}`)
        } else {
          router.replace('/dashboard/licitaciones')
        }
      })
      .catch(() => {
        router.replace('/dashboard/licitaciones')
      })
  }, [id, router])

  return null
}
