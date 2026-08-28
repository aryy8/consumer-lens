import { requireUser } from '@/lib/session'
import { getProducts } from '@/lib/queries'
import { PageIntro } from '@/components/section'
import { RepositoryTable } from '@/components/repository-table'

export default async function RepositoryPage() {
  await requireUser()
  const products = await getProducts()

  return (
    <div>
      <PageIntro
        title="Product Repository"
        description="Master record of every product assessed, with its full inspection history. Expand a row to trace how compliance has changed over time."
      />
      <RepositoryTable products={products} />
    </div>
  )
}
