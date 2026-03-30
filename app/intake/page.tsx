import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { IntakeReviewClient } from './intake-review-client'

export default async function IntakeReviewPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  return <IntakeReviewClient />
}
