// NocoDB API service — server-side only
// Supports NocoDB v0.90+ (projects API) and v0.200+ (bases API)

const NOCODB_URL = process.env.NOCODB_URL ?? 'http://localhost:8080'
const NOCODB_API_TOKEN = process.env.NOCODB_API_TOKEN ?? ''

function nocoHeaders() {
  return {
    'xc-auth': NOCODB_API_TOKEN,
    'Content-Type': 'application/json',
  }
}

async function nocoFetch<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${NOCODB_URL}/${path}`
  console.log('[NocoDB] fetch:', url, 'token-len:', NOCODB_API_TOKEN.length)
  const res = await fetch(url, {
    ...options,
    headers: {
      ...nocoHeaders(),
      ...(options.headers as Record<string, string>),
    },
    cache: 'no-store',
  })
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`NocoDB ${res.status}: ${text}`)
  }
  return res.json() as Promise<T>
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface NocoBase {
  id: string
  title: string
  type?: string
  color?: string
  description?: string
  created_at?: string
  updated_at?: string
  tables?: NocoTable[]
}

export interface NocoTable {
  id: string
  base_id?: string
  fk_workspace_id?: string
  title: string
  description?: string
  type?: string
  columns?: NocoField[]
  created_at?: string
  updated_at?: string
}

export interface NocoField {
  id: string
  base_id?: string
  fk_model_id?: string
  title: string
  uidt: string  // UI data type e.g. 'SingleLineText', 'Number', 'Checkbox', etc.
  dt?: string   // database type
  pk?: boolean  // primary key
  pv?: boolean  // primary value (display column)
  rqd?: boolean // required
  system?: boolean
  order?: number
  colOptions?: {
    options?: Array<{ id: string; title: string; color?: string; order?: number }>
  }
}

export interface NocoRow {
  Id: number
  [key: string]: unknown
}

export interface NocoPageInfo {
  totalRows: number
  page: number
  pageSize: number
  isFirstPage: boolean
  isLastPage: boolean
}

export interface NocoRowsResponse {
  list: NocoRow[]
  pageInfo: NocoPageInfo
}

// ── API functions ─────────────────────────────────────────────────────────────

// List all bases/projects
export async function listBases(): Promise<NocoBase[]> {
  try {
    // Try newer API (v0.200+) first
    try {
      const data = await nocoFetch<{ list: NocoBase[] }>('api/v1/meta/bases?limit=100')
      if (Array.isArray(data?.list)) return data.list
    } catch {
      // fall through to older API
    }
    // Older API (v0.90+)
    const data = await nocoFetch<{ list: NocoBase[] }>('api/v1/db/meta/projects/?limit=100')
    return data?.list ?? []
  } catch (err) {
    console.error('[NocoDB] listBases error:', err)
    return []
  }
}

// List tables in a base
export async function listTables(baseId: string): Promise<NocoTable[]> {
  try {
    // Try newer API first
    try {
      const data = await nocoFetch<{ list: NocoTable[] }>(`api/v1/meta/bases/${baseId}/tables?limit=200`)
      if (Array.isArray(data?.list)) return data.list
    } catch {
      // fall through
    }
    const data = await nocoFetch<{ list: NocoTable[] }>(`api/v1/db/meta/projects/${baseId}/tables?limit=200`)
    return data?.list ?? []
  } catch (err) {
    console.error('[NocoDB] listTables error:', err)
    return []
  }
}

// Get table metadata (title etc.)
export async function getTable(tableId: string): Promise<NocoTable | null> {
  try {
    return await nocoFetch<NocoTable>(`api/v1/db/meta/tables/${tableId}`)
  } catch (err) {
    console.error('[NocoDB] getTable error:', err)
    return null
  }
}

// Get table fields/columns
export async function getTableFields(tableId: string): Promise<NocoField[]> {
  try {
    // Fields are often included in the table object; try the fields endpoint
    const data = await nocoFetch<{ list: NocoField[] }>(`api/v1/db/meta/tables/${tableId}/fields`)
    return data?.list ?? []
  } catch (err) {
    console.error('[NocoDB] getTableFields error:', err)
    return []
  }
}

// Get rows with pagination/filtering/sorting
export async function getTableRows(
  baseId: string,
  tableId: string,
  opts: {
    limit?: number
    offset?: number
    where?: string
    sort?: string
  } = {}
): Promise<NocoRowsResponse> {
  const params = new URLSearchParams()
  params.set('limit', String(opts.limit ?? 50))
  if (opts.offset) params.set('offset', String(opts.offset))
  if (opts.where) params.set('where', opts.where)
  if (opts.sort) params.set('sort', opts.sort)

  try {
    return await nocoFetch<NocoRowsResponse>(
      `api/v1/db/data/noco/${baseId}/${tableId}?${params.toString()}`
    )
  } catch (err) {
    console.error('[NocoDB] getTableRows error:', err)
    return {
      list: [],
      pageInfo: { totalRows: 0, page: 1, pageSize: 50, isFirstPage: true, isLastPage: true },
    }
  }
}

// Create a row
export async function createRow(
  baseId: string,
  tableId: string,
  data: Record<string, unknown>
): Promise<NocoRow> {
  return nocoFetch<NocoRow>(`api/v1/db/data/noco/${baseId}/${tableId}`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

// Update a row
export async function updateRow(
  baseId: string,
  tableId: string,
  rowId: number,
  data: Record<string, unknown>
): Promise<NocoRow> {
  return nocoFetch<NocoRow>(`api/v1/db/data/noco/${baseId}/${tableId}/${rowId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

// Delete a row
export async function deleteRow(baseId: string, tableId: string, rowId: number): Promise<void> {
  await nocoFetch(`api/v1/db/data/noco/${baseId}/${tableId}/${rowId}`, { method: 'DELETE' })
}

// Create a new table
export async function createTable(
  baseId: string,
  name: string,
  columns: Array<{ title: string; uidt: string }>
): Promise<NocoTable> {
  try {
    return await nocoFetch<NocoTable>(`api/v1/db/meta/projects/${baseId}/tables`, {
      method: 'POST',
      body: JSON.stringify({ title: name, columns }),
    })
  } catch {
    // Try newer API
    return nocoFetch<NocoTable>(`api/v1/meta/bases/${baseId}/tables`, {
      method: 'POST',
      body: JSON.stringify({ title: name, columns }),
    })
  }
}
