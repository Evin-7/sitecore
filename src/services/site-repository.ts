import { del, get, set } from 'idb-keyval'
import { createInitialData } from '../data/site-data'
import { parsePersistedSiteData, PersistedSiteDataSchema } from '../lib/schemas'
import type { PersistedSiteData } from '../types/operations'

const STORAGE_KEY = 'sitecore:site-data:v1'

export async function loadSiteData(): Promise<PersistedSiteData> {
  const stored = await get<unknown>(STORAGE_KEY)
  if (stored === undefined) return createInitialData()
  const parsed = PersistedSiteDataSchema.safeParse(stored)
  if (!parsed.success) throw new Error('Saved SiteCore data could not be validated. Export or reset the local data to continue.')
  const data = parsePersistedSiteData(parsed.data)
  return { ...data, simulation: { ...data.simulation, running: false } }
}

export async function saveSiteData(data: PersistedSiteData): Promise<void> {
  const valid = PersistedSiteDataSchema.parse(data)
  await set(STORAGE_KEY, valid)
}

export async function clearSiteData(): Promise<void> {
  await del(STORAGE_KEY)
}
