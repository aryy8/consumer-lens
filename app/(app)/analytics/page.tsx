import { PageIntro, Panel, PanelHeader } from '@/components/section'
import {
  ComplianceTrendChart,
  InspectionsLineChart,
  ViolationsBarChart,
} from '@/components/analytics/charts'
import { IndiaMap } from '@/components/analytics/india-map'

export default function AnalyticsPage() {
  return (
    <div>
      <PageIntro
        title="Analytics"
        description="System-wide enforcement trends across all jurisdictions — inspection volume, most-violated provisions, and geographic coverage."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel>
          <PanelHeader title="Inspections over time" description="Monthly inspections and violations detected" />
          <div className="p-4">
            <InspectionsLineChart />
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Top violated provisions" description="Most frequently breached rules under LMPC 2011" />
          <div className="p-4">
            <ViolationsBarChart />
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Compliance rate trend" description="Share of inspections passing all declarations" />
          <div className="p-4">
            <ComplianceTrendChart />
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Geographic distribution" description="Inspection volume by state — navy (low) to amber (high)" />
          <div className="p-4">
            <IndiaMap />
          </div>
        </Panel>
      </div>
    </div>
  )
}
