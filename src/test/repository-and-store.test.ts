import { beforeEach, describe, expect, it } from 'vitest'
import { createInitialData } from '../data/site-data'
import { clearSiteData, loadSiteData, saveSiteData } from '../services/site-repository'
import { useAppStore } from '../stores/app-store'

describe('IndexedDB repository', () => {
  beforeEach(async () => { await clearSiteData() })

  it('persists the workspace and safely pauses a running simulation on reload', async () => {
    const data = createInitialData()
    data.simulation.running = true
    await saveSiteData(data)
    const loaded = await loadSiteData()
    expect(loaded.assets).toHaveLength(12)
    expect(loaded.simulation.running).toBe(false)
  })
})

describe('shared application workflows', () => {
  beforeEach(async () => {
    await clearSiteData()
    useAppStore.setState({ data: createInitialData(), hydrated: true, error: null, selectedAssetId: null, selectedZoneId: null, focusRequest: null })
  })

  it('creates, edits, persists, and retires an asset while retaining historical records', async () => {
    const created = await useAppStore.getState().createAsset({
      name: 'South yard beacon', kind: 'lighting', typeLabel: 'Lighting', status: 'operational', location: 'South perimeter',
      zoneId: 'zone-loading', position: [0, 12], detail: 'Warning beacon · pole 01', telemetry: 'Local status · no live equipment connection', utilization: 24,
    })
    await useAppStore.getState().saveAsset({ ...created, status: 'attention', utilization: 35 })
    expect(useAppStore.getState().data?.assets.find((asset) => asset.id === created.id)?.status).toBe('attention')
    expect((await loadSiteData()).assets.some((asset) => asset.id === created.id)).toBe(true)

    await useAppStore.getState().deleteAsset('STG-04')
    const saved = await loadSiteData()
    expect(saved.assets.some((asset) => asset.id === 'STG-04')).toBe(false)
    expect(saved.incidents.find((incident) => incident.id === 'AL-014')?.assetId).toBeNull()
  })

  it('runs the incident acknowledge, resolve, and reopen workflow', async () => {
    const incident = useAppStore.getState().data!.incidents.find((item) => item.id === 'AL-014')!
    await useAppStore.getState().saveIncident({ ...incident, status: 'acknowledged', acknowledgedAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
    await useAppStore.getState().saveIncident({ ...useAppStore.getState().data!.incidents[0]!, status: 'resolved', resolvedAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
    const resolved = useAppStore.getState().data!.incidents.find((item) => item.id === incident.id)!
    await useAppStore.getState().saveIncident({ ...resolved, status: 'open', resolvedAt: null, updatedAt: new Date().toISOString() })
    expect(useAppStore.getState().data?.incidents.find((item) => item.id === incident.id)?.status).toBe('open')
  })

  it('saves completed maintenance work and inspection checklists', async () => {
    const task = useAppStore.getState().data!.maintenanceTasks[0]!
    await useAppStore.getState().saveMaintenance({ ...task, status: 'completed', completedAt: new Date().toISOString() })
    const inspection = useAppStore.getState().data!.inspections.find((item) => item.id === 'IN-208')!
    await useAppStore.getState().saveInspection({ ...inspection, status: 'completed', checklist: inspection.checklist.map((item) => ({ ...item, complete: true })), completedAt: new Date().toISOString() })
    const saved = await loadSiteData()
    expect(saved.maintenanceTasks.find((item) => item.id === task.id)?.status).toBe('completed')
    expect(saved.inspections.find((item) => item.id === 'IN-208')?.checklist.every((item) => item.complete)).toBe(true)
  })

  it('advances and resets the local simulation without retaining generated alerts', async () => {
    for (let step = 0; step < 5; step += 1) await useAppStore.getState().advanceSimulation()
    expect(useAppStore.getState().data?.simulation.tick).toBe(5)
    expect(useAppStore.getState().data?.incidents.some((incident) => incident.id === 'SIM-AL-0005')).toBe(true)
    await useAppStore.getState().resetSimulation()
    const state = useAppStore.getState().data!
    expect(state.simulation.tick).toBe(0)
    expect(state.incidents.some((incident) => incident.id.startsWith('SIM-AL-'))).toBe(false)
  })

  it('exports validated workspace data and rejects broken imports', async () => {
    const exported = useAppStore.getState().exportData()!
    await expect(useAppStore.getState().importData(exported)).resolves.toBeUndefined()
    const invalid = structuredClone(exported)
    invalid.data.assets[1]!.id = invalid.data.assets[0]!.id
    await expect(useAppStore.getState().importData(invalid)).rejects.toThrow(/duplicate/i)
  })
})
