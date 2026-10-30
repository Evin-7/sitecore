export type AssetStatus = 'operational' | 'active' | 'attention' | 'maintenance' | 'offline' | 'standby'

export type AssetKind = 'warehouse' | 'process-hall' | 'vehicle' | 'container' | 'pump' | 'sensor' | 'generator'

export type LayerKey = 'buildings' | 'roads' | 'mobile' | 'infrastructure' | 'zones' | 'labels'

export type DashboardView = 'overview' | 'assets' | 'alerts'

export type InspectionMode = 'overview' | 'inspection'

export interface SiteAsset {
  id: string
  name: string
  kind: AssetKind
  typeLabel: string
  status: AssetStatus
  location: string
  position: [number, number]
  footprint?: [number, number]
  height?: number
  detail: string
  telemetry: string
  lastService: string
}

export interface SiteAlert {
  id: string
  assetId: string
  title: string
  severity: 'critical' | 'high' | 'medium'
  time: string
  description: string
  cycles: number[]
}

export type LayerState = Record<LayerKey, boolean>
