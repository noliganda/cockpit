import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import BaseDetailClient from './base-detail-client'

interface Props {
  params: Promise<{ baseId: string }>
}

export default async function BaseDetailPage({ params }: Props) {
  const session = await getSession()
  if (!session) redirect('/login')

  const { baseId } = await params
  return <BaseDetailClient baseId={baseId} />
}
