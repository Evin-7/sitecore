import { describe, expect, it } from 'vitest'
import { createInitialData } from '../data/site-data'
import { calculateDashboardMetrics } from '../features/dashboard/dashboard-data'
import { filterAssets } from '../features/assets/asset-utils'
import { PersistedSiteDataSchema } from '../lib/schemas'
import { advanceSimulation, resetSimulation } from '../services/simulation-engine'

describe('domain data validation', () => {
  it('accepts the initial site record set', () => {
    expect(PersistedSiteDataSchema.safeParse(createInitialData()).success).toBe(true)
  })

  it('rejects an asset utilisation outside the supported range', () => {
    const data = createInitialData()
    data.assets[0]!.utilization = 140
    expect(PersistedSiteDataSchema.safeParse(data).success).toBe(false)
  })
})

describe('asset filtering and sorting', () => {
  const assets = createInitialData().assets

  it('filters by asset name, id, location, status, and kind', () => {
    const results = filterAssets(assets, { query: 'forklift', status: 'maintenance', kind: 'vehicle', sort: 'name', direction: 'asc' })
    expect(results.map((asset) => asset.id)).toEqual(['VHC-12'])
  })

  it('sorts utilisation in descending order', () => {
    const results = filterAssets(assets, { query: '', status: 'all', kind: 'all', sort: 'utilization', direction: 'desc' })
    expect(results[0]?.utilization).toBe(100)
    expect(results.at(-1)?.utilization).toBe(0)
  })
})

describe('dashboard calculations', () => {
  it('derives asset, incident, work, and zone metrics from shared state', () => {
    const metrics = calculateDashboardMetrics(createInitialData(), '2026-10-30')
    expect(metrics.assets).toBe(12)
    expect(metrics.openIncidents).toBe(3)
    expect(metrics.zones).toBe(4)
    expect(metrics.overdueWorkOrders).toBe(0)
    expect(metrics.inspectionsInProgress).toBe(1)
    expect(metrics.health).toBeGreaterThan(0)
  })
})

describe('local operations simulation', () => {
  it('replays route, telemetry, status, and alert changes deterministically', () => {
    const baseline = createInitialData()
    let first = baseline
    let second = baseline
    for (let tick = 0; tick < 6; tick += 1) {
      first = advanceSimulation(first)
      second = advanceSimulation(second)
    }

    expect(first).toEqual(second)
    expect(first.assets.find((asset) => asset.id === 'VHC-07')).toMatchObject({ position: [5, 10], heading: expect.any(Number) })
    expect(first.assets.find((asset) => asset.id === 'SNS-08')?.status).toBe('operational')
    expect(first.assets.find((asset) => asset.id === 'GEN-01')?.status).toBe('active')
    expect(first.incidents.some((incident) => incident.id === 'SIM-AL-0005')).toBe(true)
    expect(first.events.some((event) => event.type === 'status' && event.assetId === 'SNS-08')).toBe(true)
    expect(first.assets.find((asset) => asset.id === 'PWR-01')?.telemetryUpdatedAt).toBe('2026-10-30T08:36:00.000Z')

    const reset = resetSimulation(first, baseline)
    expect(reset.assets.find((asset) => asset.id === 'VHC-07')).toMatchObject({ position: [-2, 10], status: 'active', telemetry: 'Battery 78% · 12 km/h' })
    expect(reset.simulation.tick).toBe(0)
    expect(reset.events.some((event) => event.id.startsWith('SIM-'))).toBe(false)
  })
})
