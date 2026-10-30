import { z } from 'zod'
import type { AssetKind, AssetStatus, PersistedSiteData, SiteAsset } from '../types/operations'

const AssetStatusSchema = z.enum(['operational', 'active', 'idle', 'attention', 'maintenance', 'offline'])
const AssetKindSchema = z.enum(['warehouse', 'process-hall', 'vehicle', 'container', 'pump', 'sensor', 'generator', 'lighting', 'checkpoint'])
const SeveritySchema = z.enum(['critical', 'high', 'medium', 'low'])
const PrioritySchema = z.enum(['critical', 'high', 'normal', 'low'])
const IncidentStatusSchema = z.enum(['open', 'acknowledged', 'resolved'])
const WorkStatusSchema = z.enum(['scheduled', 'in-progress', 'completed', 'cancelled'])
const InspectionStatusSchema = z.enum(['draft', 'in-progress', 'completed'])
const IsoDateTimeSchema = z.iso.datetime({ offset: true })
const PositionSchema = z.tuple([z.number().min(-45).max(45), z.number().min(-45).max(45)])
const FootprintSchema = z.tuple([z.number().min(0.5).max(40), z.number().min(0.5).max(40)])

export const AssetDraftSchema = z.object({
  name: z.string().trim().min(2).max(80),
  kind: AssetKindSchema,
  typeLabel: z.string().trim().min(2).max(50),
  status: AssetStatusSchema,
  location: z.string().trim().min(2).max(100),
  zoneId: z.string().nullable(),
  position: PositionSchema,
  heading: z.number().min(-Math.PI * 2).max(Math.PI * 2).optional(),
  footprint: FootprintSchema.optional(),
  height: z.number().min(0.5).max(20).optional(),
  detail: z.string().trim().min(2).max(240),
  telemetry: z.string().trim().min(2).max(160),
  telemetryUpdatedAt: IsoDateTimeSchema.optional(),
  utilization: z.number().int().min(0).max(100),
})

export const SiteAssetSchema = AssetDraftSchema.extend({
  id: z.string().trim().min(3).max(40),
  serialNumber: z.string().trim().min(3).max(50),
  lastService: z.string().trim().min(3).max(40),
  createdAt: IsoDateTimeSchema,
})

export const SiteZoneSchema = z.object({
  id: z.string().min(2).max(40),
  name: z.string().trim().min(2).max(80),
  code: z.string().trim().min(2).max(24),
  color: z.string().regex(/^#[\da-fA-F]{6}$/),
  center: PositionSchema,
  footprint: FootprintSchema,
  capacity: z.number().int().min(1).max(500),
  description: z.string().trim().min(2).max(200),
})

export const IncidentSchema = z.object({
  id: z.string().min(3).max(40),
  title: z.string().trim().min(3).max(100),
  assetId: z.string().nullable(),
  zoneId: z.string().nullable(),
  severity: SeveritySchema,
  status: IncidentStatusSchema,
  description: z.string().trim().min(3).max(400),
  source: z.enum(['operator', 'local-simulation']),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
  acknowledgedAt: IsoDateTimeSchema.nullable(),
  resolvedAt: IsoDateTimeSchema.nullable(),
})

export const MaintenanceTaskSchema = z.object({
  id: z.string().min(3).max(40),
  title: z.string().trim().min(3).max(100),
  assetId: z.string().nullable(),
  priority: PrioritySchema,
  status: WorkStatusSchema,
  dueDate: z.iso.date(),
  assignee: z.string().trim().min(2).max(80),
  notes: z.string().max(400),
  createdAt: IsoDateTimeSchema,
  completedAt: IsoDateTimeSchema.nullable(),
})

export const InspectionChecklistItemSchema = z.object({
  id: z.string().min(2).max(40),
  label: z.string().trim().min(2).max(120),
  complete: z.boolean(),
})

export const InspectionSchema = z.object({
  id: z.string().min(3).max(40),
  title: z.string().trim().min(3).max(100),
  assetId: z.string().nullable(),
  zoneId: z.string().nullable(),
  status: InspectionStatusSchema,
  dueDate: z.iso.date(),
  inspector: z.string().trim().min(2).max(80),
  checklist: z.array(InspectionChecklistItemSchema).min(1).max(40),
  notes: z.string().max(400),
  findings: z.string().max(600),
  createdAt: IsoDateTimeSchema,
  completedAt: IsoDateTimeSchema.nullable(),
})

export const OperationalEventSchema = z.object({
  id: z.string().min(3).max(40),
  type: z.enum(['status', 'incident', 'maintenance', 'inspection', 'simulation', 'asset']),
  title: z.string().trim().min(3).max(100),
  description: z.string().trim().min(3).max(300),
  assetId: z.string().nullable(),
  zoneId: z.string().nullable(),
  severity: SeveritySchema.nullable(),
  createdAt: IsoDateTimeSchema,
})

export const SiteSettingsSchema = z.object({
  theme: z.enum(['light', 'dark']),
  defaultCamera: z.enum(['perspective', 'isometric', 'top-down']),
  sceneQuality: z.enum(['low', 'balanced', 'high']),
  notificationsEnabled: z.boolean(),
  units: z.enum(['metric', 'imperial']),
})

export const SimulationStateSchema = z.object({
  running: z.boolean(),
  speed: z.union([z.literal(0.5), z.literal(1), z.literal(2)]),
  tick: z.number().int().min(0),
})

export const PersistedSiteDataSchema = z.object({
  assets: z.array(SiteAssetSchema).max(500),
  zones: z.array(SiteZoneSchema).max(100),
  incidents: z.array(IncidentSchema).max(1000),
  maintenanceTasks: z.array(MaintenanceTaskSchema).max(1000),
  inspections: z.array(InspectionSchema).max(1000),
  events: z.array(OperationalEventSchema).max(5000),
  settings: SiteSettingsSchema,
  simulation: SimulationStateSchema,
})

export const ImportDocumentSchema = z.object({
  schemaVersion: z.literal(1),
  exportedAt: IsoDateTimeSchema,
  data: PersistedSiteDataSchema,
})

export type AssetDraft = Omit<SiteAsset, 'id' | 'serialNumber' | 'lastService' | 'createdAt'>
export type ImportDocument = { schemaVersion: 1; exportedAt: string; data: PersistedSiteData }

export function parsePersistedSiteData(value: unknown): PersistedSiteData {
  return PersistedSiteDataSchema.parse(value) as PersistedSiteData
}

export function parseSiteAsset(value: unknown): SiteAsset {
  return SiteAssetSchema.parse(value) as SiteAsset
}

export function parseAssetDraft(value: unknown): AssetDraft {
  return AssetDraftSchema.parse(value) as AssetDraft
}

export type { AssetKind, AssetStatus }
