import type { AssetKind, AssetStatus, SiteAsset } from '../../types/operations'

export interface AssetFilters {
  query: string
  status: 'all' | AssetStatus
  kind: 'all' | AssetKind
  sort: 'name' | 'status' | 'utilization' | 'createdAt'
  direction: 'asc' | 'desc'
}

export function filterAssets(assets: SiteAsset[], filters: AssetFilters) {
  const query = filters.query.toLowerCase().trim()
  return assets.filter((asset) => {
    const matchesQuery = !query || [asset.name, asset.id, asset.typeLabel, asset.location, asset.serialNumber].some((field) => field.toLowerCase().includes(query))
    return matchesQuery && (filters.status === 'all' || asset.status === filters.status) && (filters.kind === 'all' || asset.kind === filters.kind)
  }).sort((a, b) => {
    const value = filters.sort === 'utilization' ? a.utilization - b.utilization : filters.sort === 'createdAt' ? a.createdAt.localeCompare(b.createdAt) : filters.sort === 'status' ? a.status.localeCompare(b.status) : a.name.localeCompare(b.name)
    return filters.direction === 'asc' ? value : -value
  })
}
