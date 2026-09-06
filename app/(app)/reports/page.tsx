import { requireUser } from '@/lib/session'
import { getReportsForUser } from '@/lib/queries'
import { ReportsTable } from '@/components/reports-table'

export default async function ReportsPage() {
  const user = await requireUser()
  const reports = await getReportsForUser(user)

  return <ReportsTable reports={reports} />
}
