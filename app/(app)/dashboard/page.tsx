import { requireUser } from '@/lib/session'
import { getDashboardData } from '@/lib/queries'
import { DashboardView } from '@/components/dashboard/dashboard-view'

export default async function DashboardPage() {
  const user = await requireUser()
  const data = await getDashboardData(user)
  return <DashboardView data={data} />
}
