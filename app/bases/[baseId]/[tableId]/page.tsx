import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import TableEditorClient from './table-editor-client'

interface Props {
  params: Promise<{ baseId: string; tableId: string }>
}

export default async function TableEditorPage({ params }: Props) {
  const session = await getSession()
  if (!session) redirect('/login')

  const { baseId, tableId } = await params
  return <TableEditorClient baseId={baseId} tableId={tableId} />
}
