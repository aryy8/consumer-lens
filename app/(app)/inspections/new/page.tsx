import { PageIntro } from '@/components/section'
import { NewInspection } from '@/components/inspection/new-inspection'

export default function NewInspectionPage() {
  return (
    <div>
      <PageIntro
        title="New Inspection"
        description="Capture a product label and run automated compliance analysis against the Legal Metrology (Packaged Commodities) Rules, 2011."
      />
      <NewInspection />
    </div>
  )
}
