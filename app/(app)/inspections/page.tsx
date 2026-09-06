import Link from 'next/link'
import { Plus } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { requireUser } from '@/lib/session'
import { getInspectionsForUser } from '@/lib/queries'
import { InspectionsTable } from '@/components/inspection/inspections-table'

export default async function InspectionsPage() {
  const user = await requireUser()
  const inspections = await getInspectionsForUser(user)

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Link href="/inspections/new" className={cn(buttonVariants(), 'gap-1.5')}>
          <Plus className="size-4" /> New Inspection
        </Link>
      </div>
      <InspectionsTable inspections={inspections} />
    </div>
  )
}
