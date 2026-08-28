import { notFound } from 'next/navigation'
import { requireUser } from '@/lib/session'
import { getInspectionById } from '@/lib/queries'
import { PageIntro } from '@/components/section'
import { InspectionDetail } from '@/components/inspection/inspection-detail'
import { BackLink } from '@/components/inspection/new-inspection'

export default async function InspectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  await requireUser()
  const inspection = await getInspectionById(id)
  if (!inspection) notFound()

  return (
    <div>
      <BackLink />
      <PageIntro title={inspection.productName} description={`${inspection.id} · ${inspection.category}`} />
      <InspectionDetail inspection={inspection} />
    </div>
  )
}
