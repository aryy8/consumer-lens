import { PageIntro } from '@/components/section'
import { RepositoryTable } from '@/components/repository-table'
import { PRODUCTS } from '@/lib/data'

export default function RepositoryPage() {
  return (
    <div>
      <PageIntro
        title="Product Repository"
        description="Master record of every product assessed, with its full inspection history. Expand a row to trace how compliance has changed over time."
      />
      <RepositoryTable products={PRODUCTS} />
    </div>
  )
}
