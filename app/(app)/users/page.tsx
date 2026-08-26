import { PageIntro } from '@/components/section'
import { UserManagement } from '@/components/admin/user-management'
import { OFFICERS } from '@/lib/data'

export default function UsersPage() {
  return (
    <div>
      <PageIntro
        title="User Management"
        description="Administer field inspectors, supervisors and desk officers. Toggle access, adjust roles and onboard new personnel."
      />
      <UserManagement officers={OFFICERS} />
    </div>
  )
}
