'use client'

import { use, useState, useEffect } from 'react'
import { notFound } from 'next/navigation'
import { PageIntro } from '@/components/section'
import { InspectionDetail } from '@/components/inspection/inspection-detail'
import { BackLink } from '@/components/inspection/new-inspection'
import { INSPECTIONS, DECLARATION_TEMPLATE } from '@/lib/data'
import { getInspectionById } from '@/lib/storage'
import type { Inspection } from '@/lib/types'

export default function InspectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [inspection, setInspection] = useState<Inspection | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 1. Try static list
    const staticInsp = INSPECTIONS.find((i) => i.id === id)
    if (staticInsp) {
      setInspection(staticInsp)
      setLoading(false)
      return
    }

    // 2. Try localStorage
    const saved = getInspectionById(id)
    if (saved) {
      const mapped: Inspection = {
        id: saved.id,
        productName: saved.productName,
        manufacturer: saved.manufacturer,
        category: saved.category,
        score: saved.score,
        status: saved.status,
        date: saved.date,
        state: saved.state,
        batchNumber: saved.batchNumber,
        inspectorId: 'SELF',
        inspectorName: saved.inspectorName,
        image: saved.image || '/placeholder.svg',
        fields: saved.fields.map((f, idx) => ({
          ...f,
          box: DECLARATION_TEMPLATE[idx]?.box ?? { x: 0, y: 0, w: 0, h: 0 },
        })),
      }
      setInspection(mapped)
    }
    setLoading(false)
  }, [id])

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!inspection) notFound()

  return (
    <div>
      <BackLink />
      <PageIntro title={inspection.productName} description={`${inspection.id} · ${inspection.category}`} />
      <InspectionDetail inspection={inspection} />
    </div>
  )
}
