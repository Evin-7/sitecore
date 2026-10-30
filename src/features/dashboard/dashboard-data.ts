import type { PersistedSiteData } from '../../types/operations'

export function calculateDashboardMetrics(data: PersistedSiteData, today = new Date().toISOString().slice(0, 10)) {
  const activeAssets = data.assets.filter((asset) => asset.status === 'operational' || asset.status === 'active').length
  return {
    assets: data.assets.length,
    activeAssets,
    idleAssets: data.assets.filter((asset) => asset.status === 'idle').length,
    needsAttention: data.assets.filter((asset) => asset.status === 'attention' || asset.status === 'maintenance' || asset.status === 'offline').length,
    openIncidents: data.incidents.filter((incident) => incident.status !== 'resolved').length,
    zones: data.zones.length,
    health: data.assets.length ? Math.round(activeAssets / data.assets.length * 100) : 0,
    activeWorkOrders: data.maintenanceTasks.filter((task) => task.status === 'in-progress').length,
    overdueWorkOrders: data.maintenanceTasks.filter((task) => task.status !== 'completed' && task.status !== 'cancelled' && task.dueDate < today).length,
    inspectionsInProgress: data.inspections.filter((inspection) => inspection.status === 'in-progress').length,
  }
}
