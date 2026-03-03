// NocoDB API service — server-side only
// Auth: xc-token header (permanent, never expires)
// Uses NOCODB_URL and NOCODB_API_TOKEN from process.env

export interface NcBase {
  id: string
  title: string
}

export interface NcTable {
  id: string
  title: string
  base_id?: string
}

export interface NcColumn {
  id: string
  title: string
  uidt: string
  system?: boolean
  pv?: boolean
  order?: number
}

export interface NcPageInfo {
  totalRows: number
  page: number
  pageSize: number
  isFirstPage: boolean
  isLastPage: boolean
}

export interface NcRowsResponse {
  list: Record<string, unknown>[]
  pageInfo: NcPageInfo
}

function getConfig() {
  const url = process.env.NOCODB_URL
  const token = process.env.NOCODB_API_TOKEN
  if (!url || !token) throw new Error('NOCODB_URL and NOCODB_API_TOKEN must be set')
  return { url: url.replace(/\/$/, ''), token }
}

async function nocoFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const { url, token } = getConfig()
  const res = await fetch(`${url}${path}`, {
    ...options,
    headers: {
      'xc-token': token,
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> | undefined),
    },
    cache: 'no-store',
  })
  if (!res.ok) {
    const text = await res.text()
    console.error(`NocoDB API error ${res.status}: ${text}`)
    throw new Error(`NocoDB API error: ${res.status}`)
  }
  return res.json() as Promise<T>
}

export async function listBases(): Promise<NcBase[]> {
  const data = await nocoFetch<{ list: NcBase[] }>('/api/v1/db/meta/projects/')
  return data.list
}

export async function listTables(baseId: string): Promise<NcTable[]> {
  const data = await nocoFetch<{ list: NcTable[] }>(`/api/v1/db/meta/projects/${baseId}/tables`)
  return data.list
}

export async function getTable(tableId: string): Promise<{ id: string; title: string; columns: NcColumn[] }> {
  return nocoFetch(`/api/v1/db/meta/tables/${tableId}`)
}

export async function getTableRows(
  baseId: string,
  tableId: string,
  { limit = 50, offset = 0 }: { limit?: number; offset?: number } = {}
): Promise<NcRowsResponse> {
  return nocoFetch(`/api/v1/db/data/noco/${baseId}/${tableId}?limit=${limit}&offset=${offset}`)
}

export async function createRow(
  baseId: string,
  tableId: string,
  data: Record<string, unknown>
): Promise<Record<string, unknown>> {
  return nocoFetch(`/api/v1/db/data/noco/${baseId}/${tableId}`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateRow(
  baseId: string,
  tableId: string,
  rowId: string | number,
  data: Record<string, unknown>
): Promise<Record<string, unknown>> {
  return nocoFetch(`/api/v1/db/data/noco/${baseId}/${tableId}/${rowId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export async function deleteRow(baseId: string, tableId: string, rowId: string | number): Promise<void> {
  await nocoFetch(`/api/v1/db/data/noco/${baseId}/${tableId}/${rowId}`, {
    method: 'DELETE',
  })
}

export async function createTable(
  baseId: string,
  title: string,
  columns: Array<{ title: string; uidt: string }>
): Promise<NcTable> {
  return nocoFetch(`/api/v1/db/meta/projects/${baseId}/tables`, {
    method: 'POST',
    body: JSON.stringify({ title, columns }),
  })
}
