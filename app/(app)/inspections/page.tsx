import Link from 'next/link'
import { Plus } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { PageIntro } from '@/components/section'
import { cn } from '@/lib/utils'
import { requireUser } from '@/lib/session'
import { getInspectionsForUser } from '@/lib/queries'
import { InspectionsTable } from '@/components/inspection/inspections-table'

export default async function InspectionsPage() {
  const user = await requireUser()
  const inspections = await getInspectionsForUser(user)

  return (
    <div>
      <PageIntro
        title="Inspections"
        description="Every label analysis recorded across the field. Filter by status or category and open any record for the full declaration breakdown."
      >
        <Link href="/inspections/new" className={cn(buttonVariants(), 'gap-1.5')}>
          <Plus className="size-4" /> New Inspection
        </Link>
      </PageIntro>
      <InspectionsTable inspections={inspections} />
    </div>
  )
}
