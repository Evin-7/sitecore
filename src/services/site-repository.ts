import { del, get, set } from 'idb-keyval'
import { createInitialData } from '../data/site-data'
import { supabase } from '../lib/supabase'
import { parsePersistedSiteData, PersistedSiteDataSchema } from '../lib/schemas'
import type { PersistedSiteData } from '../types/operations'

const STORAGE_KEY = 'sitecore:site-data:v1'
const SHARED_WORKSPACE_KEY = 'northline'
const WRITER_ID = globalThis.crypto?.randomUUID?.() ?? `browser-${Date.now().toString(36)}`

type WorkspaceRow = {
  workspace_key: string
  data: unknown
  revision: number | string
  writer_id: string
}

export type SiteWorkspaceSnapshot = {
  data: PersistedSiteData
  version: number
  writerId: string
}

export type LegacyWorkspaceChoice = 'publish' | 'use-shared'
export type SharedWorkspaceLoadResult =
  | { status: 'ready'; snapshot: SiteWorkspaceSnapshot }
  | { status: 'migration-choice'; hasSharedWorkspace: boolean; snapshot: SiteWorkspaceSnapshot | null }

export class WorkspaceConflictError extends Error {
  constructor() {
    super('The shared workspace changed in another browser. The latest data was loaded; retry your action.')
    this.name = 'WorkspaceConflictError'
  }
}

function requireSupabase() {
  if (!supabase) throw new Error('Cloud storage is not configured. Add the Supabase project URL and publishable key, then reload SiteCore.')
  return supabase
}

function normalizeWorkspace(value: unknown): PersistedSiteData {
  const parsed = PersistedSiteDataSchema.safeParse(value)
  if (!parsed.success) {
    throw new Error('The shared workspace data is invalid. Restore a recent revision in Supabase, then reload SiteCore.')
  }
  const normalized = parsePersistedSiteData(parsed.data)
  return { ...normalized, simulation: { ...normalized.simulation, running: false } }
}

function toCloudWorkspace(value: PersistedSiteData): PersistedSiteData {
  const parsed = parsePersistedSiteData(value)
  return { ...parsed, simulation: { ...parsed.simulation, running: false } }
}

function describeCloudError(action: string, error: { code?: string; message: string }) {
  if (error.code === 'PGRST205' || error.code === '42P01') {
    return new Error('Shared SiteCore storage is not set up yet. Apply the public workspace migration from supabase/migrations, then reload.')
  }
  if (error.code === '42501') {
    return new Error('The shared workspace is not accessible. Check that the public workspace migration is applied.')
  }
  return new Error(`${action}: ${error.message}`)
}

async function readLegacySiteData(): Promise<PersistedSiteData | null> {
  const stored = await get<unknown>(STORAGE_KEY)
  if (stored === undefined) return null
  const parsed = PersistedSiteDataSchema.safeParse(stored)
  if (!parsed.success) throw new Error('Saved browser data could not be validated. Export or reset it before moving it to the shared workspace.')
  return normalizeWorkspace(parsed.data)
}

async function readSharedWorkspace(): Promise<SiteWorkspaceSnapshot | null> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('site_shared_workspaces')
    .select('workspace_key, data, revision, writer_id')
    .eq('workspace_key', SHARED_WORKSPACE_KEY)
    .maybeSingle()

  if (error) throw describeCloudError('Shared workspace could not be loaded', error)
  if (!data) return null

  const row = data as WorkspaceRow
  return { data: normalizeWorkspace(row.data), version: Number(row.revision), writerId: row.writer_id }
}

async function createSharedWorkspace(workspace: PersistedSiteData): Promise<SiteWorkspaceSnapshot> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('site_shared_workspaces')
    .insert({ workspace_key: SHARED_WORKSPACE_KEY, data: toCloudWorkspace(workspace), writer_id: WRITER_ID })
    .select('workspace_key, data, revision, writer_id')
    .single()

  if (error?.code === '23505') throw new WorkspaceConflictError()
  if (error) throw describeCloudError('Shared workspace could not be initialized', error)

  const row = data as WorkspaceRow
  return { data: normalizeWorkspace(row.data), version: Number(row.revision), writerId: row.writer_id }
}

/** Loads one shared dataset for all visitors, while requiring explicit consent to publish old browser data. */
export async function loadSharedSiteData(choice?: LegacyWorkspaceChoice): Promise<SharedWorkspaceLoadResult> {
  const [existing, legacy] = await Promise.all([readSharedWorkspace(), readLegacySiteData()])

  if (legacy && !choice) {
    return { status: 'migration-choice', hasSharedWorkspace: Boolean(existing), snapshot: existing }
  }

  if (choice === 'publish' && legacy) {
    let snapshot: SiteWorkspaceSnapshot
    if (existing) {
      const saved = await saveSharedSiteData(legacy, existing.version)
      snapshot = { data: legacy, version: saved.version, writerId: saved.writerId }
    } else {
      try {
        snapshot = await createSharedWorkspace(legacy)
      } catch (error) {
        if (!(error instanceof WorkspaceConflictError)) throw error
        const latest = await readSharedWorkspace()
        if (!latest) throw error
        const saved = await saveSharedSiteData(legacy, latest.version)
        snapshot = { data: legacy, version: saved.version, writerId: saved.writerId }
      }
    }
    await del(STORAGE_KEY).catch(() => undefined)
    return { status: 'ready', snapshot }
  }

  if (choice === 'use-shared' && legacy) await del(STORAGE_KEY).catch(() => undefined)
  if (existing) return { status: 'ready', snapshot: existing }

  try {
    return { status: 'ready', snapshot: await createSharedWorkspace(createInitialData()) }
  } catch (error) {
    if (!(error instanceof WorkspaceConflictError)) throw error
    const latest = await readSharedWorkspace()
    if (!latest) throw error
    return { status: 'ready', snapshot: latest }
  }
}

/** Persists one validated shared snapshot using optimistic revision checking. */
export async function saveSharedSiteData(
  data: PersistedSiteData,
  expectedVersion: number | null,
): Promise<{ version: number; writerId: string }> {
  const client = requireSupabase()
  const payload = toCloudWorkspace(data)
  if (expectedVersion === null) {
    const created = await createSharedWorkspace(payload)
    return { version: created.version, writerId: created.writerId }
  }

  const { data: updated, error } = await client
    .from('site_shared_workspaces')
    .update({ data: payload, writer_id: WRITER_ID })
    .eq('workspace_key', SHARED_WORKSPACE_KEY)
    .eq('revision', expectedVersion)
    .select('revision, writer_id')
    .maybeSingle()

  if (error) throw describeCloudError('Shared workspace could not be saved', error)
  if (!updated) throw new WorkspaceConflictError()
  return { version: Number(updated.revision), writerId: updated.writer_id }
}

/** Realtime subscription broadcasts updates to every visitor with public read access. */
export function subscribeToSharedSiteData(onChange: (snapshot: SiteWorkspaceSnapshot) => void) {
  const client = supabase
  if (!client) return () => undefined

  const channel = client
    .channel(`sitecore-shared-${WRITER_ID}`)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'site_shared_workspaces',
      filter: `workspace_key=eq.${SHARED_WORKSPACE_KEY}`,
    }, (payload) => {
      const row = payload.new as WorkspaceRow
      if (row.writer_id === WRITER_ID) return
      try {
        onChange({ data: normalizeWorkspace(row.data), version: Number(row.revision), writerId: row.writer_id })
      } catch {
        // A malformed public update must not replace valid in-memory state.
      }
    })
    .subscribe()

  return () => { void client.removeChannel(channel) }
}

/** Legacy local repository helpers remain for migration and existing local-only tests. */
export async function loadSiteData(): Promise<PersistedSiteData> {
  return (await readLegacySiteData()) ?? createInitialData()
}

export async function saveSiteData(data: PersistedSiteData): Promise<void> {
  await set(STORAGE_KEY, parsePersistedSiteData(data))
}

export async function clearSiteData(): Promise<void> {
  await del(STORAGE_KEY)
}
