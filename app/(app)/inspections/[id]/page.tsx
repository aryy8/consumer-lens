import { notFound } from 'next/navigation'
import { PageIntro } from '@/components/section'
import { InspectionDetail } from '@/components/inspection/inspection-detail'
import { BackLink } from '@/components/inspection/new-inspection'
import { INSPECTIONS } from '@/lib/data'

export default async function InspectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const inspection = INSPECTIONS.find((i) => i.id === id)
  if (!inspection) notFound()

  return (
    <div>
      <BackLink />
      <PageIntro title={inspection.productName} description={`${inspection.id} · ${inspection.category}`} />
      <InspectionDetail inspection={inspection} />
    </div>
  )
}
