import { requireUser } from '@/lib/session'
import { getReportsForUser } from '@/lib/queries'
import { PageIntro } from '@/components/section'
import { ReportsTable } from '@/components/reports-table'

export default async function ReportsPage() {
  const user = await requireUser()
  const reports = await getReportsForUser(user)

  return (
    <div>
      <PageIntro
        title="Reports"
        description="Generated compliance reports ready for filing and export. Each links back to the underlying inspection record."
      />
      <ReportsTable reports={reports} />
    </div>
  )
}
