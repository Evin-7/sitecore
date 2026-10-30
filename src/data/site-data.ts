import type { AssetStatus, SiteAlert, SiteAsset } from '../types/operations'

export const SITE_NAME = 'Northline Materials Terminal'
export const SITE_CODE = 'SITE 04 · NORTH DISTRICT'
export const SHIFT_LABEL = 'SHIFT A · 08:00–16:00'

export const BASE_ASSETS: SiteAsset[] = [
  {
    id: 'BLD-01', name: 'North warehouse', kind: 'warehouse', typeLabel: 'Warehouse', status: 'operational',
    location: 'North sector · Grid C4', position: [-13, -3], footprint: [13, 9], height: 5.6,
    detail: 'Bulk materials storage · bays 01–06', telemetry: 'Ambient 21.4 °C · 42% RH', lastService: '14 Oct 2026',
  },
  {
    id: 'BLD-02', name: 'Processing hall', kind: 'process-hall', typeLabel: 'Processing', status: 'operational',
    location: 'East sector · Grid F4', position: [8, -3], footprint: [12, 10], height: 7,
    detail: 'Primary sorting and transfer line', telemetry: 'Line 02 · throughput 84%', lastService: '21 Oct 2026',
  },
  {
    id: 'BLD-03', name: 'Site services', kind: 'warehouse', typeLabel: 'Operations', status: 'operational',
    location: 'West sector · Grid B7', position: [-14, 8], footprint: [7, 5], height: 3.2,
    detail: 'Control room and staff facilities', telemetry: 'Occupancy 6 · access secure', lastService: '06 Oct 2026',
  },
  {
    id: 'VHC-07', name: 'Yard truck 07', kind: 'vehicle', typeLabel: 'Utility vehicle', status: 'active',
    location: 'South access · Lane 2', position: [-2, 10], detail: 'Electric utility truck · operator M. Patel',
    telemetry: 'Battery 78% · 12 km/h', lastService: '25 Oct 2026',
  },
  {
    id: 'VHC-12', name: 'Forklift 12', kind: 'vehicle', typeLabel: 'Forklift', status: 'maintenance',
    location: 'Loading zone · Bay 03', position: [12, 9], detail: 'Electric counterbalance · 2.5 t capacity',
    telemetry: 'Service window · mast inspection', lastService: 'Due 30 Oct 2026',
  },
  {
    id: 'VHC-03', name: 'Service van 03', kind: 'vehicle', typeLabel: 'Service vehicle', status: 'standby',
    location: 'West access · Lane 1', position: [-20, 2], detail: 'Field maintenance response unit',
    telemetry: 'Battery 91% · parked', lastService: '19 Oct 2026',
  },
  {
    id: 'STG-04', name: 'Chemical store', kind: 'container', typeLabel: 'Secure storage', status: 'attention',
    location: 'East loading apron · Grid G6', position: [21, 7], detail: 'Bunded storage · restricted access',
    telemetry: 'Door contact · review requested', lastService: '28 Oct 2026',
  },
  {
    id: 'PWR-01', name: 'Pump station 01', kind: 'pump', typeLabel: 'Pump station', status: 'operational',
    location: 'South utility corridor', position: [19, -5], detail: 'Transfer pump · duty unit A',
    telemetry: 'Pressure 3.4 bar · flow 28 L/s', lastService: '18 Oct 2026',
  },
  {
    id: 'SNS-08', name: 'Line monitor 08', kind: 'sensor', typeLabel: 'Monitoring sensor', status: 'offline',
    location: 'Central transfer line · Grid D3', position: [1, -11], detail: 'Vibration and temperature node',
    telemetry: 'Last packet 07:42 · signal lost', lastService: '22 Oct 2026',
  },
  {
    id: 'GEN-01', name: 'Backup generator', kind: 'generator', typeLabel: 'Power infrastructure', status: 'standby',
    location: 'West utility yard · Grid A5', position: [-21, -7], detail: 'Emergency supply · 500 kVA',
    telemetry: 'Ready · fuel reserve 82%', lastService: '10 Oct 2026',
  },
]

export const ALERTS: SiteAlert[] = [
  {
    id: 'AL-014', assetId: 'STG-04', title: 'Storage door requires review', severity: 'high', time: '07:54',
    description: 'Door contact remained open after the scheduled receiving window.', cycles: [0, 2],
  },
  {
    id: 'AL-018', assetId: 'SNS-08', title: 'Monitoring feed interrupted', severity: 'critical', time: '07:42',
    description: 'No telemetry received from the central transfer line sensor.', cycles: [0, 1, 2],
  },
  {
    id: 'AL-021', assetId: 'VHC-12', title: 'Forklift service window', severity: 'medium', time: '07:30',
    description: 'Mast inspection is due before the next equipment assignment.', cycles: [0, 1],
  },
  {
    id: 'AL-026', assetId: 'PWR-01', title: 'Pump pressure variance', severity: 'high', time: '08:18',
    description: 'Pressure is above the target band. Check valve response at the next round.', cycles: [2],
  },
]

export interface SimulationCycle {
  label: string
  time: string
  overrides: Partial<Record<string, AssetStatus>>
}

export const SIMULATION_CYCLES: SimulationCycle[] = [
  { label: 'SHIFT A · 08:00', time: '08:00', overrides: {} },
  { label: 'SHIFT A · 08:12', time: '08:12', overrides: { 'VHC-12': 'active', 'STG-04': 'operational' } },
  { label: 'SHIFT A · 08:24', time: '08:24', overrides: { 'VHC-12': 'operational', 'STG-04': 'attention', 'PWR-01': 'attention', 'SNS-08': 'maintenance' } },
]

export const STATUS_LABELS: Record<AssetStatus, string> = {
  operational: 'Operational', active: 'Active', attention: 'Attention', maintenance: 'Maintenance', offline: 'Offline', standby: 'Standby',
}
