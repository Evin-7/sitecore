import type { OperationalEvent, PersistedSiteData, SiteAsset } from '../types/operations'

export function eventTime(value: string) {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value))
}

export function dateLabel(value: string) {
  const date = new Date(`${value.slice(0, 10)}T12:00:00`)
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(date)
}

export function timeAgo(value: string) {
  const elapsed = Math.max(0, Date.now() - new Date(value).getTime())
  const minutes = Math.floor(elapsed / 60_000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export function eventLabel(event: OperationalEvent) {
  const asset = event.assetId ? ` · ${event.assetId}` : ''
  return `${event.title}${asset}`
}

export function getAsset(data: PersistedSiteData, id: string | null) {
  return id ? data.assets.find((asset) => asset.id === id) ?? null : null
}

export function getZoneName(data: PersistedSiteData, id: string | null) {
  return id ? data.zones.find((zone) => zone.id === id)?.name ?? 'Unknown zone' : 'Unassigned'
}

export function activeIncidentCount(data: PersistedSiteData) {
  return data.incidents.filter((incident) => incident.status !== 'resolved').length
}

export function exportCsv(filename: string, rows: string[][]) {
  const quote = (rawValue: string) => {
    const value = /^[\s]*[=+\-@]/.test(rawValue) ? `'${rawValue}` : rawValue
    return `"${value.replaceAll('"', '""')}"`
  }
  const content = rows.map((row) => row.map(quote).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function assetLabel(asset: SiteAsset | undefined | null) { return asset ? `${asset.name} · ${asset.id}` : 'Unlinked asset' }

export function formatDimensions(dimensions: [number, number] | undefined, units: 'metric' | 'imperial') {
  if (!dimensions) return null
  const factor = units === 'metric' ? 1 : 3.28084
  const label = units === 'metric' ? 'm' : 'ft'
  return `${(dimensions[0] * factor).toFixed(1)} × ${(dimensions[1] * factor).toFixed(1)} ${label}`
}

export function formatLength(meters: number, units: 'metric' | 'imperial') {
  const value = units === 'metric' ? meters : meters * 3.28084
  return `${value.toFixed(1)} ${units === 'metric' ? 'm' : 'ft'}`
}
