import { PageIntro } from '@/components/section'
import { ReportsTable } from '@/components/reports-table'
import { REPORTS } from '@/lib/data'

export default function ReportsPage() {
  return (
    <div>
      <PageIntro
        title="Reports"
        description="Generated compliance reports ready for filing and export. Each links back to the underlying inspection record."
      />
      <ReportsTable reports={REPORTS} />
    </div>
  )
}
