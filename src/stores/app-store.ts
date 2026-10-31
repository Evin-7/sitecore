import { create } from 'zustand'
import { createInitialData } from '../data/site-data'
import { ImportDocumentSchema, parsePersistedSiteData, parseSiteAsset, type AssetDraft, type ImportDocument } from '../lib/schemas'
import { advanceSimulation, resetSimulation } from '../services/simulation-engine'
import { loadSharedSiteData, saveSharedSiteData, saveSiteData, WorkspaceConflictError, type LegacyWorkspaceChoice, type SiteWorkspaceSnapshot } from '../services/site-repository'
import type { Incident, IncidentSeverity, Inspection, MaintenanceTask, OperationalEvent, PersistedSiteData, SceneLayers, SiteAsset, SiteSettings } from '../types/operations'

type DataPatch = (data: PersistedSiteData) => PersistedSiteData
export interface AppToast {
  id: string
  type: 'success' | 'error'
  title: string
  description?: string
}
interface AppState {
  data: PersistedSiteData | null
  sharedWorkspace: boolean
  cloudVersion: number | null
  hydrated: boolean
  migrationRequired: boolean
  migrationHasSharedData: boolean
  error: string | null
  toast: AppToast | null
  notice: { id: string; title: string; description: string } | null
  selectedAssetId: string | null
  selectedZoneId: string | null
  layers: SceneLayers
  cameraResetKey: number
  focusRequest: { assetId: string; key: number; position: [number, number]; distance: number } | null
  hydrate: (legacyChoice?: LegacyWorkspaceChoice) => Promise<void>
  clearWorkspace: () => void
  receiveRemoteWorkspace: (snapshot: SiteWorkspaceSnapshot) => void
  setError: (error: string | null) => void
  showToast: (toast: Omit<AppToast, 'id'>) => void
  dismissToast: (id?: string) => void
  dismissNotice: () => void
  selectAsset: (id: string | null, focus?: boolean) => void
  selectZone: (id: string | null) => void
  toggleLayer: (key: keyof SceneLayers) => void
  resetCamera: () => void
  commit: (patch: DataPatch) => Promise<void>
  saveAsset: (asset: SiteAsset) => Promise<void>
  createAsset: (asset: AssetDraft) => Promise<SiteAsset>
  deleteAsset: (id: string) => Promise<void>
  saveIncident: (incident: Incident) => Promise<void>
  addIncident: (incident: Omit<Incident, 'id' | 'createdAt' | 'updatedAt' | 'acknowledgedAt' | 'resolvedAt' | 'source'> & { severity: IncidentSeverity }) => Promise<void>
  saveMaintenance: (task: MaintenanceTask) => Promise<void>
  deleteMaintenance: (id: string) => Promise<void>
  saveInspection: (inspection: Inspection) => Promise<void>
  updateSettings: (settings: Partial<SiteSettings>) => Promise<void>
  setSimulation: (patch: Partial<PersistedSiteData['simulation']>) => Promise<void>
  advanceSimulation: () => Promise<void>
  resetSimulation: () => Promise<void>
  exportData: () => ImportDocument | null
  importData: (value: unknown) => Promise<void>
  resetAllData: () => Promise<void>
}

let saveQueue = Promise.resolve()
let idSequence = 0
const makeId = (prefix: string) => `${prefix}-${Date.now().toString(36).toUpperCase()}-${(++idSequence).toString(36).toUpperCase()}`

function addEvent(data: PersistedSiteData, event: Omit<OperationalEvent, 'id' | 'createdAt'>): PersistedSiteData {
  const next: OperationalEvent = { ...event, id: makeId('EV'), createdAt: new Date().toISOString() }
  return { ...data, events: [next, ...data.events].slice(0, 5000) }
}

function validateReferences(data: PersistedSiteData) {
  const ids = [data.assets.map((item) => item.id), data.zones.map((item) => item.id), data.incidents.map((item) => item.id), data.maintenanceTasks.map((item) => item.id), data.inspections.map((item) => item.id), data.events.map((item) => item.id)]
  if (ids.some((collection) => new Set(collection).size !== collection.length)) throw new Error('Workspace data contains duplicate identifiers.')
  const assets = new Set(data.assets.map((asset) => asset.id))
  const zones = new Set(data.zones.map((zone) => zone.id))
  const invalid = data.assets.some((asset) => asset.zoneId !== null && !zones.has(asset.zoneId))
    || data.incidents.some((item) => (item.assetId !== null && !assets.has(item.assetId)) || (item.zoneId !== null && !zones.has(item.zoneId)))
    || data.maintenanceTasks.some((item) => item.assetId !== null && !assets.has(item.assetId))
    || data.inspections.some((item) => (item.assetId !== null && !assets.has(item.assetId)) || (item.zoneId !== null && !zones.has(item.zoneId)))
    || data.events.some((item) => (item.assetId !== null && !assets.has(item.assetId)) || (item.zoneId !== null && !zones.has(item.zoneId)))
  if (invalid) throw new Error('Workspace data contains a record linked to a missing asset or zone.')
  return data
}

export const useAppStore = create<AppState>((set, get) => {
  const apply = async (patch: DataPatch) => {
    const operation = saveQueue.catch(() => undefined).then(async () => {
      const initial = get()
      if (!initial.data) throw new Error('The workspace is not ready to save.')

      const isSharedWorkspace = initial.sharedWorkspace
      let baseData = initial.data
      let version = initial.cloudVersion

      for (let attempt = 0; attempt < 2; attempt += 1) {
        const next = validateReferences(parsePersistedSiteData(patch(baseData)))
        try {
          let saved: { version: number | null; writerId: string | null }
          if (isSharedWorkspace) saved = await saveSharedSiteData(next, version)
          else {
            await saveSiteData(next)
            saved = { version: null, writerId: null }
          }
          const current = get()
          if (current.sharedWorkspace !== isSharedWorkspace) return
          if (isSharedWorkspace && current.cloudVersion !== null && saved.version !== null && current.cloudVersion > saved.version) return
          set({ data: next, cloudVersion: saved.version, error: null })
          return
        } catch (error) {
          if (!(error instanceof WorkspaceConflictError) || !isSharedWorkspace || attempt > 0) throw error
          const latestResult = await loadSharedSiteData()
          if (latestResult.status !== 'ready') throw new Error('Workspace migration needs your choice before this change can be saved.', { cause: error })
          const latest = latestResult.snapshot
          if (!get().sharedWorkspace) return
          set({ data: latest.data, cloudVersion: latest.version, error: null })
          baseData = latest.data
          version = latest.version
        }
      }
    })
    saveQueue = operation
    try { await operation } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Workspace data could not be saved.' })
      throw error
    }
  }

  return {
    data: null,
    sharedWorkspace: false,
    cloudVersion: null,
    hydrated: false,
    migrationRequired: false,
    migrationHasSharedData: false,
    error: null,
    toast: null,
    notice: null,
    selectedAssetId: null,
    selectedZoneId: null,
    layers: { buildings: true, roads: true, mobile: true, infrastructure: true, zones: true, labels: false },
    cameraResetKey: 0,
    focusRequest: null,
    hydrate: async (legacyChoice) => {
      set({ data: null, sharedWorkspace: true, cloudVersion: null, hydrated: false, migrationRequired: false, migrationHasSharedData: false, error: null })
      try {
        const result = await loadSharedSiteData(legacyChoice)
        if (result.status === 'migration-choice') {
          if (!get().sharedWorkspace) return
          set({ data: null, cloudVersion: result.snapshot?.version ?? null, hydrated: true, migrationRequired: true, migrationHasSharedData: result.hasSharedWorkspace })
          return
        }
        if (!get().sharedWorkspace) return
        set({ data: parsePersistedSiteData(result.snapshot.data), cloudVersion: result.snapshot.version, hydrated: true, migrationRequired: false, migrationHasSharedData: false, error: null })
      } catch (error) {
        if (!get().sharedWorkspace) return
        set({ data: null, cloudVersion: null, hydrated: true, migrationRequired: false, migrationHasSharedData: false, error: error instanceof Error ? error.message : 'Could not load the workspace.' })
      }
    },
    clearWorkspace: () => {
      saveQueue = Promise.resolve()
      set({ data: null, sharedWorkspace: false, cloudVersion: null, hydrated: false, migrationRequired: false, migrationHasSharedData: false, error: null, selectedAssetId: null, selectedZoneId: null, focusRequest: null, notice: null })
    },
    receiveRemoteWorkspace: (snapshot) => set((state) => {
      if (!state.sharedWorkspace || state.migrationRequired || state.cloudVersion === null || state.cloudVersion >= snapshot.version) return state
      return {
        data: { ...snapshot.data, simulation: { ...snapshot.data.simulation, running: state.data?.simulation.running ?? false } },
        cloudVersion: snapshot.version,
        error: null,
      }
    }),
    setError: (error) => set(error ? { error, toast: null } : { error: null }),
    showToast: (toast) => set({ toast: { ...toast, id: makeId('TOAST') }, error: null }),
    dismissToast: (id) => set((state) => state.toast && (!id || state.toast.id === id) ? { toast: null } : state),
    dismissNotice: () => set({ notice: null }),
    selectAsset: (id, focus = false) => {
      const asset = id ? get().data?.assets.find((item) => item.id === id) : undefined
      set((state) => ({
        selectedAssetId: id,
        selectedZoneId: asset?.zoneId ?? null,
        focusRequest: focus && asset ? { assetId: asset.id, key: (state.focusRequest?.key ?? 0) + 1, position: [...asset.position], distance: asset.footprint ? Math.max(...asset.footprint) * 2.5 + 14 : 20 } : state.focusRequest,
      }))
    },
    selectZone: (id) => set({ selectedZoneId: id, selectedAssetId: null }),
    toggleLayer: (key) => set((state) => ({ layers: { ...state.layers, [key]: !state.layers[key] } })),
    resetCamera: () => set((state) => ({ cameraResetKey: state.cameraResetKey + 1 })),
    commit: apply,
    saveAsset: async (asset) => {
      await apply((data) => {
        const previous = data.assets.find((item) => item.id === asset.id)
        const exists = Boolean(previous)
        const updated = {
          ...asset,
          telemetryUpdatedAt: asset.telemetryUpdatedAt ?? (previous?.telemetry === asset.telemetry ? previous.telemetryUpdatedAt ?? previous.createdAt : new Date().toISOString()),
        }
        const next = exists ? data.assets.map((item) => item.id === asset.id ? updated : item) : [...data.assets, updated]
        return addEvent({ ...data, assets: next }, { type: 'asset', title: exists ? 'Asset details updated' : 'Asset registered', description: `${asset.name} · ${asset.id}`, assetId: asset.id, zoneId: asset.zoneId, severity: null })
      })
    },
    createAsset: async (draft) => {
      const now = new Date().toISOString()
      const asset: SiteAsset = { ...draft, id: makeId('AST'), serialNumber: `SC-${Date.now().toString(36).toUpperCase()}`, lastService: 'Not recorded', createdAt: now, telemetryUpdatedAt: now }
      const parsed = parseSiteAsset(asset)
      await get().saveAsset(parsed)
      return parsed
    },
    deleteAsset: async (id) => apply((data) => {
      const removed = data.assets.find((asset) => asset.id === id)
      if (!removed) return data
      const incidents = data.incidents.map((item) => item.assetId === id ? { ...item, assetId: null } : item)
      const maintenanceTasks = data.maintenanceTasks.map((item) => item.assetId === id ? { ...item, assetId: null } : item)
      const inspections = data.inspections.map((item) => item.assetId === id ? { ...item, assetId: null } : item)
      const events = data.events.map((event) => event.assetId === id ? { ...event, assetId: null } : event)
      return addEvent({ ...data, assets: data.assets.filter((asset) => asset.id !== id), incidents, maintenanceTasks, inspections, events }, { type: 'asset', title: 'Asset retired', description: `${removed.name} · related records retained without an asset link`, assetId: null, zoneId: removed.zoneId, severity: null })
    }),
    saveIncident: async (incident) => {
      const isNew = !get().data?.incidents.some((item) => item.id === incident.id)
      await apply((data) => {
        const old = data.incidents.find((item) => item.id === incident.id)
        const incidents = old ? data.incidents.map((item) => item.id === incident.id ? incident : item) : [incident, ...data.incidents]
        return addEvent({ ...data, incidents }, { type: 'incident', title: old ? `Alert ${incident.status}` : 'Incident logged', description: incident.title, assetId: incident.assetId, zoneId: incident.zoneId, severity: incident.severity })
      })
      if (isNew && get().data?.settings.notificationsEnabled) set({ notice: { id: incident.id, title: incident.title, description: incident.description } })
    },
    addIncident: async (draft) => {
      const timestamp = new Date().toISOString()
      await get().saveIncident({ ...draft, id: makeId('AL'), source: 'operator', createdAt: timestamp, updatedAt: timestamp, acknowledgedAt: null, resolvedAt: null })
    },
    saveMaintenance: async (task) => apply((data) => {
      const old = data.maintenanceTasks.some((item) => item.id === task.id)
      const maintenanceTasks = old ? data.maintenanceTasks.map((item) => item.id === task.id ? task : item) : [task, ...data.maintenanceTasks]
      return addEvent({ ...data, maintenanceTasks }, { type: 'maintenance', title: old ? 'Work order updated' : 'Work order scheduled', description: `${task.title} · ${task.status}`, assetId: task.assetId, zoneId: data.assets.find((asset) => asset.id === task.assetId)?.zoneId ?? null, severity: task.priority === 'critical' ? 'critical' : task.priority === 'high' ? 'high' : null })
    }),
    deleteMaintenance: async (id) => apply((data) => {
      const removed = data.maintenanceTasks.find((task) => task.id === id)
      if (!removed) return data
      return addEvent({ ...data, maintenanceTasks: data.maintenanceTasks.filter((task) => task.id !== id) }, { type: 'maintenance', title: 'Work order removed', description: removed.title, assetId: removed.assetId, zoneId: data.assets.find((asset) => asset.id === removed.assetId)?.zoneId ?? null, severity: null })
    }),
    saveInspection: async (inspection) => apply((data) => {
      const exists = data.inspections.some((item) => item.id === inspection.id)
      const inspections = exists ? data.inspections.map((item) => item.id === inspection.id ? inspection : item) : [inspection, ...data.inspections]
      return addEvent({ ...data, inspections }, { type: 'inspection', title: exists ? 'Inspection updated' : 'Inspection scheduled', description: `${inspection.title} · ${inspection.status}`, assetId: inspection.assetId, zoneId: inspection.zoneId, severity: null })
    }),
    updateSettings: async (patch) => apply((data) => ({ ...data, settings: { ...data.settings, ...patch } })),
    setSimulation: async (patch) => apply((data) => {
      const simulation = { ...data.simulation, ...patch }
      if (simulation.running === data.simulation.running) return { ...data, simulation }
      return addEvent({ ...data, simulation }, { type: 'simulation', title: simulation.running ? 'Local simulation started' : 'Local simulation paused', description: simulation.running ? 'Deterministic site activity updates are running locally.' : 'The local scenario is paused.', assetId: null, zoneId: null, severity: null })
    }),
    advanceSimulation: async () => {
      const current = get().data
      if (!current) return
      const next = advanceSimulation(current)
      const nextTick = next.simulation.tick
      set({ data: parsePersistedSiteData(next) })
      const data = get().data
      const generated = data?.incidents.find((incident) => incident.id === `SIM-AL-${String(nextTick).padStart(4, '0')}`)
      if (generated && data?.settings.notificationsEnabled) set({ notice: { id: generated.id, title: generated.title, description: generated.description } })
    },
    resetSimulation: async () => apply((data) => addEvent(resetSimulation(data, createInitialData()), { type: 'simulation', title: 'Local simulation reset', description: 'The local scenario returned to its starting cycle.', assetId: null, zoneId: null, severity: null })),
    exportData: () => {
      const data = get().data
      return data ? { schemaVersion: 1, exportedAt: new Date().toISOString(), data } : null
    },
    importData: async (value) => {
      const parsed = ImportDocumentSchema.parse(value) as ImportDocument
      const data = parsePersistedSiteData(parsed.data)
      validateReferences(data)
      await apply(() => data)
    },
    resetAllData: async () => {
      const initial = createInitialData()
      await apply(() => initial)
      set({ notice: null, selectedAssetId: null, selectedZoneId: null, focusRequest: null })
    },
  }
})
