export type AssetStatus = 'operational' | 'active' | 'idle' | 'attention' | 'maintenance' | 'offline'

export type AssetKind = 'warehouse' | 'process-hall' | 'vehicle' | 'container' | 'pump' | 'sensor' | 'generator' | 'lighting' | 'checkpoint'

export type IncidentSeverity = 'critical' | 'high' | 'medium' | 'low'
export type IncidentStatus = 'open' | 'acknowledged' | 'resolved'
export type WorkPriority = 'critical' | 'high' | 'normal' | 'low'
export type WorkStatus = 'scheduled' | 'in-progress' | 'completed' | 'cancelled'
export type InspectionStatus = 'draft' | 'in-progress' | 'completed'
export type SceneLayerKey = 'buildings' | 'roads' | 'mobile' | 'infrastructure' | 'zones' | 'labels'
export type SceneView = 'perspective' | 'isometric' | 'top-down'
export type SceneQuality = 'low' | 'balanced' | 'high'
export type MeasurementUnits = 'metric' | 'imperial'

export interface SiteAsset {
  id: string
  name: string
  kind: AssetKind
  typeLabel: string
  status: AssetStatus
  location: string
  zoneId: string | null
  position: [number, number]
  heading?: number
  footprint?: [number, number]
  height?: number
  detail: string
  telemetry: string
  telemetryUpdatedAt?: string
  lastService: string
  utilization: number
  serialNumber: string
  createdAt: string
}

export interface SiteZone {
  id: string
  name: string
  code: string
  color: string
  center: [number, number]
  footprint: [number, number]
  capacity: number
  description: string
}

export interface Incident {
  id: string
  title: string
  assetId: string | null
  zoneId: string | null
  severity: IncidentSeverity
  status: IncidentStatus
  description: string
  source: 'operator' | 'local-simulation'
  createdAt: string
  updatedAt: string
  acknowledgedAt: string | null
  resolvedAt: string | null
}

export interface MaintenanceTask {
  id: string
  title: string
  assetId: string | null
  priority: WorkPriority
  status: WorkStatus
  dueDate: string
  assignee: string
  notes: string
  createdAt: string
  completedAt: string | null
}

export interface InspectionChecklistItem {
  id: string
  label: string
  complete: boolean
}

export interface Inspection {
  id: string
  title: string
  assetId: string | null
  zoneId: string | null
  status: InspectionStatus
  dueDate: string
  inspector: string
  checklist: InspectionChecklistItem[]
  notes: string
  findings: string
  createdAt: string
  completedAt: string | null
}

export interface OperationalEvent {
  id: string
  type: 'status' | 'incident' | 'maintenance' | 'inspection' | 'simulation' | 'asset'
  title: string
  description: string
  assetId: string | null
  zoneId: string | null
  severity: IncidentSeverity | null
  createdAt: string
}

export interface SceneLayers {
  buildings: boolean
  roads: boolean
  mobile: boolean
  infrastructure: boolean
  zones: boolean
  labels: boolean
}

export interface SiteSettings {
  theme: 'light' | 'dark'
  defaultCamera: SceneView
  sceneQuality: SceneQuality
  notificationsEnabled: boolean
  units: MeasurementUnits
}

export interface SimulationState {
  running: boolean
  speed: 0.5 | 1 | 2
  tick: number
}

export interface PersistedSiteData {
  assets: SiteAsset[]
  zones: SiteZone[]
  incidents: Incident[]
  maintenanceTasks: MaintenanceTask[]
  inspections: Inspection[]
  events: OperationalEvent[]
  settings: SiteSettings
  simulation: SimulationState
}

export const STATUS_LABELS: Record<AssetStatus, string> = {
  operational: 'Operational',
  active: 'Active',
  idle: 'Idle',
  attention: 'Attention',
  maintenance: 'Maintenance',
  offline: 'Offline',
}

export const SEVERITY_LABELS: Record<IncidentSeverity, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}
