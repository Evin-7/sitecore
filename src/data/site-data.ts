import type {
  Incident,
  Inspection,
  MaintenanceTask,
  OperationalEvent,
  PersistedSiteData,
  SiteAsset,
  SiteZone,
} from '../types/operations'

export const SITE_NAME = 'Northline Materials Terminal'
export const SITE_CODE = 'SITE 04 · NORTH DISTRICT'
export const YARD_TRUCK_ROUTE: [number, number][] = [[-2, 10], [5, 10], [12, 9], [18, 7], [12, 9], [5, 10]]

export const SITE_ZONES: SiteZone[] = [
  { id: 'zone-north', name: 'North storage', code: 'Z-01', color: '#8ca4a1', center: [-13, -3], footprint: [15, 11], capacity: 18, description: 'Bulk material receiving and covered storage.' },
  { id: 'zone-process', name: 'Processing', code: 'Z-02', color: '#a3b777', center: [8, -3], footprint: [14, 12], capacity: 12, description: 'Sorting, transfer, and process control area.' },
  { id: 'zone-loading', name: 'Loading apron', code: 'Z-03', color: '#c0a26a', center: [14, 8], footprint: [18, 10], capacity: 16, description: 'Vehicle staging and loading bays.' },
  { id: 'zone-utility', name: 'Utility corridor', code: 'Z-04', color: '#8799a2', center: [-22, -7], footprint: [12, 8], capacity: 8, description: 'Power, transfer equipment, and site services.' },
]

export const INITIAL_ASSETS: SiteAsset[] = [
  { id: 'BLD-01', name: 'North warehouse', kind: 'warehouse', typeLabel: 'Warehouse', status: 'operational', location: 'North sector · Grid C4', zoneId: 'zone-north', position: [-13, -3], footprint: [13, 9], height: 5.6, detail: 'Bulk materials storage · bays 01–06', telemetry: 'Ambient 21.4 °C · 42% RH', lastService: '14 Oct 2026', utilization: 68, serialNumber: 'WH-N-04-2018', createdAt: '2026-09-08T08:00:00.000Z' },
  { id: 'BLD-02', name: 'Processing hall', kind: 'process-hall', typeLabel: 'Processing', status: 'operational', location: 'East sector · Grid F4', zoneId: 'zone-process', position: [8, -3], footprint: [12, 10], height: 7, detail: 'Primary sorting and transfer line', telemetry: 'Line 02 · throughput 84%', lastService: '21 Oct 2026', utilization: 84, serialNumber: 'PH-E-04-2020', createdAt: '2026-09-08T08:00:00.000Z' },
  { id: 'BLD-03', name: 'Site services', kind: 'warehouse', typeLabel: 'Operations', status: 'operational', location: 'West sector · Grid B7', zoneId: 'zone-utility', position: [-14, 8], footprint: [7, 5], height: 3.2, detail: 'Control room and staff facilities', telemetry: 'Occupancy 6 · access secure', lastService: '06 Oct 2026', utilization: 42, serialNumber: 'SV-W-02-2019', createdAt: '2026-09-08T08:00:00.000Z' },
  { id: 'VHC-07', name: 'Yard truck 07', kind: 'vehicle', typeLabel: 'Utility vehicle', status: 'active', location: 'South access · Lane 2', zoneId: 'zone-loading', position: [-2, 10], detail: 'Electric utility truck · operator M. Patel', telemetry: 'Battery 78% · 12 km/h', lastService: '25 Oct 2026', utilization: 56, serialNumber: 'EV-YD-007', createdAt: '2026-09-10T08:00:00.000Z' },
  { id: 'VHC-12', name: 'Forklift 12', kind: 'vehicle', typeLabel: 'Forklift', status: 'maintenance', location: 'Loading zone · Bay 03', zoneId: 'zone-loading', position: [12, 9], detail: 'Electric counterbalance · 2.5 t capacity', telemetry: 'Service window · mast inspection', lastService: 'Due 30 Oct 2026', utilization: 0, serialNumber: 'FL-12-2022', createdAt: '2026-09-10T08:00:00.000Z' },
  { id: 'VHC-03', name: 'Service van 03', kind: 'vehicle', typeLabel: 'Service vehicle', status: 'idle', location: 'West access · Lane 1', zoneId: 'zone-utility', position: [-20, 2], detail: 'Field maintenance response unit', telemetry: 'Battery 91% · parked', lastService: '19 Oct 2026', utilization: 12, serialNumber: 'SV-03-2021', createdAt: '2026-09-10T08:00:00.000Z' },
  { id: 'STG-04', name: 'Chemical store', kind: 'container', typeLabel: 'Secure storage', status: 'attention', location: 'East loading apron · Grid G6', zoneId: 'zone-loading', position: [21, 7], detail: 'Bunded storage · restricted access', telemetry: 'Door contact · review requested', lastService: '28 Oct 2026', utilization: 76, serialNumber: 'CS-04-2023', createdAt: '2026-09-11T08:00:00.000Z' },
  { id: 'PWR-01', name: 'Pump station 01', kind: 'pump', typeLabel: 'Pump station', status: 'operational', location: 'South utility corridor', zoneId: 'zone-utility', position: [19, -5], detail: 'Transfer pump · duty unit A', telemetry: 'Pressure 3.4 bar · flow 28 L/s', lastService: '18 Oct 2026', utilization: 72, serialNumber: 'PS-01-2017', createdAt: '2026-09-12T08:00:00.000Z' },
  { id: 'SNS-08', name: 'Line monitor 08', kind: 'sensor', typeLabel: 'Monitoring sensor', status: 'offline', location: 'Central transfer line · Grid D3', zoneId: 'zone-process', position: [1, -11], detail: 'Vibration and temperature node', telemetry: 'Last packet 07:42 · signal lost', lastService: '22 Oct 2026', utilization: 0, serialNumber: 'LM-08-2024', createdAt: '2026-09-12T08:00:00.000Z' },
  { id: 'GEN-01', name: 'Backup generator', kind: 'generator', typeLabel: 'Power infrastructure', status: 'idle', location: 'West utility yard · Grid A5', zoneId: 'zone-utility', position: [-24, -7], detail: 'Emergency supply · 500 kVA', telemetry: 'Ready · fuel reserve 82%', lastService: '10 Oct 2026', utilization: 8, serialNumber: 'BG-01-2016', createdAt: '2026-09-12T08:00:00.000Z' },
  { id: 'LGT-02', name: 'Yard light mast 02', kind: 'lighting', typeLabel: 'Lighting', status: 'operational', location: 'North perimeter · Grid B3', zoneId: 'zone-north', position: [-25, -13], detail: 'LED perimeter light · pole 02', telemetry: 'Power draw 48 W · local estimate', lastService: '02 Sep 2026', utilization: 100, serialNumber: 'LM-P-002', createdAt: '2026-09-15T08:00:00.000Z' },
  { id: 'SEC-01', name: 'South access checkpoint', kind: 'checkpoint', typeLabel: 'Security checkpoint', status: 'operational', location: 'South gate · Lane 1', zoneId: 'zone-loading', position: [1, 17], detail: 'Vehicle access barrier and inspection point', telemetry: 'Gate closed · local status', lastService: '16 Oct 2026', utilization: 24, serialNumber: 'SC-S-001', createdAt: '2026-09-15T08:00:00.000Z' },
]

const makeIncident = (incident: Omit<Incident, 'updatedAt' | 'acknowledgedAt' | 'resolvedAt'>): Incident => ({
  ...incident,
  updatedAt: incident.createdAt,
  acknowledgedAt: incident.status === 'open' ? null : incident.createdAt,
  resolvedAt: incident.status === 'resolved' ? incident.createdAt : null,
})

export const INITIAL_INCIDENTS: Incident[] = [
  makeIncident({ id: 'AL-014', assetId: 'STG-04', zoneId: 'zone-loading', title: 'Storage door requires review', severity: 'high', status: 'open', description: 'The local door contact is marked open after the scheduled receiving window.', source: 'local-simulation', createdAt: '2026-10-30T07:54:00.000Z' }),
  makeIncident({ id: 'AL-018', assetId: 'SNS-08', zoneId: 'zone-process', title: 'Monitoring feed interrupted', severity: 'critical', status: 'open', description: 'The local simulation has not received a reading from the central transfer line sensor.', source: 'local-simulation', createdAt: '2026-10-30T07:42:00.000Z' }),
  makeIncident({ id: 'AL-021', assetId: 'VHC-12', zoneId: 'zone-loading', title: 'Forklift service window', severity: 'medium', status: 'acknowledged', description: 'Mast inspection is due before the next equipment assignment.', source: 'local-simulation', createdAt: '2026-10-30T07:30:00.000Z' }),
  makeIncident({ id: 'AL-026', assetId: 'PWR-01', zoneId: 'zone-utility', title: 'Pump pressure variance', severity: 'high', status: 'resolved', description: 'Pressure variance was reviewed in the local data set.', source: 'local-simulation', createdAt: '2026-10-29T08:18:00.000Z' }),
]

export const INITIAL_MAINTENANCE: MaintenanceTask[] = [
  { id: 'WO-1042', title: 'Inspect forklift mast and carriage', assetId: 'VHC-12', priority: 'high', status: 'scheduled', dueDate: '2026-10-30', assignee: 'R. Kapoor', notes: 'Verify mast chain wear and hydraulic hose condition.', createdAt: '2026-10-22T09:00:00.000Z', completedAt: null },
  { id: 'WO-1038', title: 'Replace sensor battery pack', assetId: 'SNS-08', priority: 'normal', status: 'in-progress', dueDate: '2026-10-31', assignee: 'A. Thomas', notes: 'Confirm signal after replacement.', createdAt: '2026-10-21T08:30:00.000Z', completedAt: null },
  { id: 'WO-1029', title: 'Inspect pump seal assembly', assetId: 'PWR-01', priority: 'normal', status: 'scheduled', dueDate: '2026-11-03', assignee: 'J. George', notes: 'Check seal leakage and record pressure after restart.', createdAt: '2026-10-18T07:00:00.000Z', completedAt: null },
  { id: 'WO-1017', title: 'Service north warehouse door track', assetId: 'BLD-01', priority: 'low', status: 'completed', dueDate: '2026-10-24', assignee: 'R. Kapoor', notes: 'Track cleaned and aligned.', createdAt: '2026-10-12T10:00:00.000Z', completedAt: '2026-10-23T13:00:00.000Z' },
  { id: 'WO-1045', title: 'Review chemical store door contact', assetId: 'STG-04', priority: 'critical', status: 'in-progress', dueDate: '2026-10-30', assignee: 'A. Thomas', notes: 'Validate contact sensor state before closing the work order.', createdAt: '2026-10-29T12:00:00.000Z', completedAt: null },
]

const inspectionChecklist = (labels: string[]) => labels.map((label, index) => ({ id: `item-${index + 1}`, label, complete: index < 2 }))

export const INITIAL_INSPECTIONS: Inspection[] = [
  { id: 'IN-208', title: 'Forklift pre-assignment inspection', assetId: 'VHC-12', zoneId: 'zone-loading', status: 'in-progress', dueDate: '2026-10-30', inspector: 'M. Patel', checklist: inspectionChecklist(['Mast and forks', 'Tyres and wheels', 'Hydraulic lines', 'Horn and warning lights', 'Battery charge']), notes: 'Machine held from assignment pending mast review.', findings: 'Visual mast chain wear observed.', createdAt: '2026-10-30T06:45:00.000Z', completedAt: null },
  { id: 'IN-204', title: 'North warehouse monthly walk-through', assetId: 'BLD-01', zoneId: 'zone-north', status: 'completed', dueDate: '2026-10-25', inspector: 'A. Thomas', checklist: inspectionChecklist(['Fire exits clear', 'Racking condition', 'Lighting and signs', 'Floor and access']), notes: 'No new issues recorded.', findings: '', createdAt: '2026-10-24T07:00:00.000Z', completedAt: '2026-10-25T11:20:00.000Z' },
  { id: 'IN-211', title: 'Transfer line sensor enclosure', assetId: 'SNS-08', zoneId: 'zone-process', status: 'draft', dueDate: '2026-11-02', inspector: 'J. George', checklist: inspectionChecklist(['Enclosure seal', 'Cable routing', 'Mounting bracket', 'Signal check']), notes: '', findings: '', createdAt: '2026-10-30T08:10:00.000Z', completedAt: null },
]

export const INITIAL_EVENTS: OperationalEvent[] = [
  { id: 'EV-5001', type: 'incident', title: 'Monitoring feed interrupted', description: 'Line monitor 08 was marked offline in local data.', assetId: 'SNS-08', zoneId: 'zone-process', severity: 'critical', createdAt: '2026-10-30T07:42:00.000Z' },
  { id: 'EV-5000', type: 'maintenance', title: 'Forklift service window opened', description: 'Work order WO-1042 is scheduled for today.', assetId: 'VHC-12', zoneId: 'zone-loading', severity: 'high', createdAt: '2026-10-30T07:30:00.000Z' },
  { id: 'EV-4998', type: 'status', title: 'Yard truck 07 active', description: 'Utility vehicle status changed in the local simulation.', assetId: 'VHC-07', zoneId: 'zone-loading', severity: null, createdAt: '2026-10-30T07:12:00.000Z' },
  { id: 'EV-4995', type: 'inspection', title: 'Warehouse walk-through completed', description: 'Inspection IN-204 was recorded complete.', assetId: 'BLD-01', zoneId: 'zone-north', severity: null, createdAt: '2026-10-25T11:20:00.000Z' },
  { id: 'EV-4993', type: 'maintenance', title: 'Warehouse door track serviced', description: 'Work order WO-1017 was closed.', assetId: 'BLD-01', zoneId: 'zone-north', severity: null, createdAt: '2026-10-23T13:00:00.000Z' },
]

export function createInitialData(): PersistedSiteData {
  return structuredClone({
    assets: INITIAL_ASSETS,
    zones: SITE_ZONES,
    incidents: INITIAL_INCIDENTS,
    maintenanceTasks: INITIAL_MAINTENANCE,
    inspections: INITIAL_INSPECTIONS,
    events: INITIAL_EVENTS,
    settings: { theme: 'dark', defaultCamera: 'perspective', sceneQuality: 'balanced', notificationsEnabled: true, units: 'metric' },
    simulation: { running: false, speed: 1 as const, tick: 0 },
  })
}
