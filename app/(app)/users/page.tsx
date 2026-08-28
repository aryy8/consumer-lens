import { requireAdmin } from '@/lib/session'
import { getUsers } from '@/lib/queries'
import { PageIntro } from '@/components/section'
import { UserManagement } from '@/components/admin/user-management'

export default async function UsersPage() {
  await requireAdmin()
  const officers = await getUsers()

  return (
    <div>
      <PageIntro
        title="User Management"
        description="Administer field inspectors, supervisors and desk officers. Toggle access, adjust roles and onboard new personnel."
      />
      <UserManagement officers={officers} />
    </div>
  )
}
