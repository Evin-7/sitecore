import type { OperationalEvent, PersistedSiteData, SiteAsset } from '../types/operations'
import { YARD_TRUCK_ROUTE } from '../data/site-data'

const SIMULATION_EPOCH = Date.parse('2026-10-30T08:30:00.000Z')
const SIMULATED_ASSET_IDS = new Set(['VHC-07', 'PWR-01', 'SNS-08', 'GEN-01'])

function makeId(prefix: string, tick: number) {
  return `${prefix}-${String(tick).padStart(4, '0')}`
}

function simulationTime(tick: number) {
  return new Date(SIMULATION_EPOCH + tick * 60_000).toISOString()
}

function makeEvent({
  id,
  type = 'simulation',
  title,
  description,
  asset,
  createdAt,
  severity = null,
}: {
  id: string
  type?: OperationalEvent['type']
  title: string
  description: string
  asset?: SiteAsset
  createdAt: string
  severity?: OperationalEvent['severity']
}): OperationalEvent {
  return {
    id,
    type,
    title,
    description,
    assetId: asset?.id ?? null,
    zoneId: asset?.zoneId ?? null,
    severity,
    createdAt,
  }
}

function pumpReading(tick: number) {
  return tick % 5 === 0 ? 3 : Number((3.2 + ((tick % 6) - 2) * 0.1).toFixed(1))
}

export function advanceSimulation(data: PersistedSiteData): PersistedSiteData {
  const tick = data.simulation.tick + 1
  const createdAt = simulationTime(tick)
  const routeIndex = (tick - 1) % YARD_TRUCK_ROUTE.length
  const routePoint = YARD_TRUCK_ROUTE[routeIndex]
  const nextPoint = YARD_TRUCK_ROUTE[(routeIndex + 1) % YARD_TRUCK_ROUTE.length]
  const heading = Math.atan2(nextPoint[1] - routePoint[1], -(nextPoint[0] - routePoint[0]))
  const pressure = pumpReading(tick)
  const sensorOnline = tick % 4 !== 0
  const generatorRunning = tick % 6 === 0
  const vehicle = data.assets.find((asset) => asset.id === 'VHC-07')

  const assets = data.assets.map((asset) => {
    if (asset.id === 'VHC-07') return {
      ...asset,
      position: [...routePoint] as [number, number],
      heading,
      utilization: 40 + ((tick * 7) % 49),
      location: `Loading apron · route point ${routeIndex + 1}`,
      telemetry: `Battery ${Math.max(24, 84 - ((tick * 2) % 35))}% · ${8 + ((tick * 3) % 16)} km/h`,
      telemetryUpdatedAt: createdAt,
    }
    if (asset.id === 'PWR-01') return {
      ...asset,
      status: pressure < 3.2 ? 'attention' as const : 'operational' as const,
      utilization: 62 + ((tick * 5) % 30),
      telemetry: `Pressure ${pressure.toFixed(1)} bar · flow ${26 + ((tick * 2) % 7)} L/s`,
      telemetryUpdatedAt: createdAt,
    }
    if (asset.id === 'SNS-08') return {
      ...asset,
      status: sensorOnline ? 'operational' as const : 'offline' as const,
      utilization: sensorOnline ? 50 + ((tick * 11) % 48) : 0,
      telemetry: sensorOnline ? `Signal ${-70 + ((tick * 3) % 16)} dBm · simulated reading` : 'Last packet · signal lost',
      telemetryUpdatedAt: createdAt,
    }
    if (asset.id === 'GEN-01') return {
      ...asset,
      status: generatorRunning ? 'active' as const : 'idle' as const,
      utilization: generatorRunning ? 34 + ((tick * 9) % 27) : 8,
      telemetry: `${generatorRunning ? 'Running' : 'Standby'} · fuel reserve ${82 - ((tick * 3) % 20)}%`,
      telemetryUpdatedAt: createdAt,
    }
    return asset
  })

  const statusEvents = assets.flatMap((asset) => {
    if (!SIMULATED_ASSET_IDS.has(asset.id)) return []
    const previous = data.assets.find((item) => item.id === asset.id)
    if (!previous || previous.status === asset.status) return []
    return [makeEvent({
      id: makeId(`SIM-STATUS-${asset.id}`, tick),
      type: 'status',
      title: `${asset.name} status changed`,
      description: `${previous.status} → ${asset.status} · local simulation`,
      asset,
      createdAt,
      severity: asset.status === 'attention' ? 'medium' : null,
    })]
  })

  const events = [
    makeEvent({ id: makeId('SIM', tick), title: 'Local simulation advanced', description: `Vehicle route and equipment readings updated · cycle ${tick}.`, asset: vehicle, createdAt }),
    ...statusEvents,
    ...data.events,
  ].slice(0, 5000)
  const incidents = [...data.incidents]

  if (tick % 5 === 0) {
    const asset = assets.find((item) => item.id === 'PWR-01')
    const existing = incidents.some((item) => item.assetId === asset?.id && item.status !== 'resolved')
    if (asset && asset.status === 'attention' && !existing) {
      incidents.unshift({
        id: makeId('SIM-AL', tick), title: 'Pump pressure needs operator review',
        assetId: asset.id, zoneId: asset.zoneId, severity: 'medium', status: 'open',
        description: 'A deterministic local scenario flagged a pressure variance for review.',
        source: 'local-simulation', createdAt, updatedAt: createdAt, acknowledgedAt: null, resolvedAt: null,
      })
      events.unshift(makeEvent({
        id: makeId('SIM-AL-EV', tick),
        type: 'incident',
        title: 'Local alert generated',
        description: 'Pump pressure variance is ready for operator review.',
        asset,
        createdAt,
        severity: 'medium',
      }))
    }
  }

  return {
    ...data,
    assets,
    incidents: incidents.slice(0, 1000),
    events: events.slice(0, 5000),
    simulation: { ...data.simulation, tick },
  }
}

export function resetSimulation(data: PersistedSiteData, baseline: PersistedSiteData): PersistedSiteData {
  const baselineById = new Map(baseline.assets.map((asset) => [asset.id, asset]))
  const assets = data.assets.map((asset) => {
    if (!SIMULATED_ASSET_IDS.has(asset.id)) return asset
    const original = baselineById.get(asset.id)
    if (!original) return asset
    return {
      ...asset,
      position: [...original.position] as [number, number],
      heading: original.heading,
      status: original.status,
      location: original.location,
      utilization: original.utilization,
      telemetry: original.telemetry,
      telemetryUpdatedAt: original.telemetryUpdatedAt,
    }
  })
  return {
    ...data,
    assets,
    incidents: data.incidents.filter((incident) => !incident.id.startsWith('SIM-AL-')),
    events: data.events.filter((event) => !event.id.startsWith('SIM-')),
    simulation: { running: false, speed: data.simulation.speed, tick: 0 },
  }
}
