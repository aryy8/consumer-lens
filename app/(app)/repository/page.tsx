import { requireUser } from '@/lib/session'
import { getProducts } from '@/lib/queries'
import { RepositoryTable } from '@/components/repository-table'

export default async function RepositoryPage() {
  await requireUser()
  const products = await getProducts()

  return <RepositoryTable products={products} />
}
