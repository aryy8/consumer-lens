import { requireUser } from '@/lib/session'
import { AppShell } from '@/components/app-shell'

export default async function AppGroupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Single choke point: any session-less request bounces to /login.
  const user = await requireUser()
  return <AppShell user={user}>{children}</AppShell>
}
