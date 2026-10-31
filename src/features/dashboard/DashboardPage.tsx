import { useMemo } from 'react'
import { Link } from 'react-router'
import { Activity, ArrowRight, BellRing, Box, CircleCheck, ClipboardList, Gauge, MapPinned, Play, Pause, Wrench } from 'lucide-react'
import { SiteScene } from '../../components/SiteScene'
import { Badge, Button, Card, PageHeading, SectionTitle } from '../../components/ui'
import { eventTime, getAsset } from '../../lib/format'
import { useAppStore } from '../../stores/app-store'
import { STATUS_LABELS } from '../../types/operations'
import type { AssetStatus } from '../../types/operations'
import { calculateDashboardMetrics } from './dashboard-data'

const statusColors: Record<AssetStatus, string> = { operational: '#34d399', active: '#60a5fa', idle: '#94a3b8', attention: '#fbbf24', maintenance: '#fb923c', offline: '#fb7185' }

function StatusDonut({ items, total }: { items: { status: AssetStatus; value: number }[]; total: number }) {
  const radius = 43
  const circumference = 2 * Math.PI * radius
  const segments = items.reduce<{ status: AssetStatus; length: number; offset: number }[]>((result, item) => {
    const offset = result.at(-1)?.offset ?? 0
    const previousLength = result.at(-1)?.length ?? 0
    const length = total ? item.value / total * circumference : 0
    result.push({ status: item.status, length, offset: offset + previousLength })
    return result
  }, [])
  return <div className="relative mx-auto h-48 w-48" role="img" aria-label={`Asset status distribution across ${total} records`}>
    <svg viewBox="0 0 112 112" className="h-full w-full -rotate-90"><circle cx="56" cy="56" r={radius} fill="none" stroke="var(--line-color)" strokeWidth="11"/>{segments.map((segment) => <circle key={segment.status} cx="56" cy="56" r={radius} fill="none" stroke={statusColors[segment.status]} strokeWidth="11" strokeDasharray={`${segment.length} ${circumference - segment.length}`} strokeDashoffset={-segment.offset}/>)}</svg>
    <div className="absolute inset-0 grid place-items-center text-center"><div><span className="block text-2xl font-semibold tabular-nums">{total}</span><span className="text-xs text-ops-muted">registered assets</span></div></div>
  </div>
}

export function DashboardPage() {
  const data = useAppStore((state) => state.data)!
  const layers = useAppStore((state) => state.layers)
  const selectedAssetId = useAppStore((state) => state.selectedAssetId)
  const selectedZoneId = useAppStore((state) => state.selectedZoneId)
  const resetKey = useAppStore((state) => state.cameraResetKey)
  const focusRequest = useAppStore((state) => state.focusRequest)
  const selectAsset = useAppStore((state) => state.selectAsset)
  const selectZone = useAppStore((state) => state.selectZone)
  const setSimulation = useAppStore((state) => state.setSimulation)
  const metricsData = calculateDashboardMetrics(data)
  const openIncidents = metricsData.openIncidents
  const health = metricsData.health
  const statusData = useMemo(() => (Object.keys(statusColors) as AssetStatus[]).map((status) => ({ name: STATUS_LABELS[status], value: data.assets.filter((asset) => asset.status === status).length, status })).filter((item) => item.value), [data.assets])
  const recent = data.events.slice(0, 6)

  const metrics = [
    { label: 'Registered assets', value: metricsData.assets, icon: Box, detail: 'Across the site inventory', color: 'text-ops-accent-text bg-ops-accent-bg' },
    { label: 'Active & operational', value: metricsData.activeAssets, icon: CircleCheck, detail: `${health}% of registered assets`, color: 'text-ops-success bg-ops-success-bg' },
    { label: 'Idle', value: metricsData.idleAssets, icon: Activity, detail: 'Ready or unassigned', color: 'text-ops-neutral bg-ops-neutral-bg' },
    { label: 'Needs attention', value: metricsData.needsAttention, icon: Wrench, detail: 'Service, review, or offline', color: 'text-ops-caution bg-ops-caution-bg' },
    { label: 'Open incidents', value: openIncidents, icon: BellRing, detail: 'Awaiting operator closure', color: 'text-ops-warning bg-ops-warning-bg' },
    { label: 'Operational zones', value: metricsData.zones, icon: MapPinned, detail: 'Defined site areas', color: 'text-ops-accent-text bg-ops-accent-bg' },
  ]

  return <>
    <PageHeading eyebrow="Site 04 · North district" title="Operations overview" description="A unified view of site assets, active work, and operator activity." actions={<><Badge tone="idle">Shared public data</Badge><Button onClick={() => void setSimulation({ running: !data.simulation.running })} variant={data.simulation.running ? 'secondary' : 'primary'}>{data.simulation.running ? <Pause size={15} /> : <Play size={15} />}{data.simulation.running ? 'Pause simulation' : 'Run simulation'}</Button></>} />
    <div className="mt-4 grid items-start gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(280px,.8fr)]">
      <Card className="overflow-hidden"><div className="flex items-center justify-between gap-3 border-b border-ops-line px-4 py-3.5 sm:px-5"><div className="min-w-0"><p className="text-sm font-semibold">Site monitoring</p><p className="mt-0.5 text-sm text-ops-muted">Select an asset or zone to inspect its saved record</p></div><Link to="/site" className="inline-flex min-h-9 shrink-0 items-center gap-1 whitespace-nowrap text-sm font-medium text-ops-accent-text hover:text-ops-accent-strong">Open viewer <ArrowRight size={14} /></Link></div><div className="h-[min(64vh,680px)] min-h-[380px] bg-[#151b20]"><SiteScene assets={data.assets} selectedId={selectedAssetId} selectedZoneId={selectedZoneId} zones={data.zones} layers={layers} resetKey={resetKey} focusRequest={focusRequest} view={data.settings.defaultCamera} quality={data.settings.sceneQuality} onSelect={(id) => selectAsset(id || null)} onSelectZone={selectZone} /></div><div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-ops-line px-4 py-3 text-xs text-ops-muted sm:px-5"><span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-400" />Operational</span><span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-amber-400" />Attention</span><span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-rose-400" />Offline</span><span className="ml-auto hidden sm:inline">Drag to orbit · scroll to zoom</span></div></Card>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
      <Card className="p-5"><SectionTitle title="Site health" detail="Calculated from registered asset status" action={<Gauge size={16} className="text-ops-muted" />} /><div className="flex items-center gap-5"><div className="relative grid h-28 w-28 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(#34d399 ${health}%, var(--line-color) 0)` }}><div className="grid h-[88px] w-[88px] place-items-center rounded-full bg-ops-panel"><div className="text-center"><div className="text-2xl font-semibold">{health}%</div><div className="text-xs text-ops-muted">availability index</div></div></div></div><div className="min-w-0 flex-1 space-y-2.5">{statusData.slice(0, 4).map((item) => <div key={item.status} className="flex items-center justify-between gap-3 text-xs"><span className="flex items-center gap-2 text-ops-muted"><span className="h-2 w-2 rounded-full" style={{ background: statusColors[item.status] }} />{item.name}</span><span className="font-semibold tabular-nums">{item.value}</span></div>)}</div></div><div className="mt-5 border-t border-ops-line pt-4"><div className="flex items-center justify-between text-xs"><span className="text-ops-muted">Zones in operation</span><span className="font-medium">{data.zones.length} active</span></div><div className="mt-3 grid grid-cols-2 gap-2">{data.zones.map((zone) => <button key={zone.id} onClick={() => selectZone(zone.id)} className={`rounded-lg border p-2.5 text-left transition-colors ${selectedZoneId === zone.id ? 'border-ops-accent/50 bg-ops-accent-bg/40' : 'border-ops-line hover:bg-ops-bg'}`}><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: zone.color }} /><span className="truncate text-xs font-medium">{zone.name}</span></span><span className="mt-1 block pl-4 text-xs text-ops-muted">{data.assets.filter((asset) => asset.zoneId === zone.id).length} assets</span></button>)}</div></div></Card>
        <Card className="p-5"><SectionTitle title="Asset status" detail="Current distribution across the site" /><StatusDonut items={statusData} total={data.assets.length}/><div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-2">{statusData.slice(0, 6).map((item) => <div key={item.status} className="flex items-center justify-between gap-2 text-xs"><span className="flex min-w-0 items-center gap-2 text-ops-muted"><span className="h-2 w-2 shrink-0 rounded-full" style={{ background: statusColors[item.status] }} /><span className="truncate">{item.name}</span></span><span className="font-medium tabular-nums">{item.value}</span></div>)}</div></Card>
      </div>
    </div>

    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{metrics.map(({ label, value, icon: Icon, detail, color }) => <Card key={label} className="p-4"><div className="flex items-start justify-between"><div><p className="text-sm font-medium text-ops-muted">{label}</p><p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight">{value}</p><p className="mt-1 text-sm text-ops-muted">{detail}</p></div><span className={`grid h-9 w-9 place-items-center rounded-lg ${color}`}><Icon size={17} /></span></div></Card>)}</div>

    <div className="mt-4 grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,.8fr)]">
      <Card className="min-w-0 p-5"><SectionTitle title="Recent activity" detail="Operator actions and simulated events" action={<Link to="/operations" className="text-xs font-medium text-ops-accent-text hover:text-ops-accent-strong">Activity log</Link>} />{recent.length ? <div className="min-w-0 divide-y divide-ops-line">{recent.map((event) => { const asset = getAsset(data, event.assetId); return <div key={event.id} className="flex min-w-0 items-start gap-3 py-3 first:pt-0 last:pb-0"><span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-ops-bg text-ops-muted"><Activity size={15} /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-xs font-medium">{event.title}</p>{event.severity && <Badge tone={event.severity}>{event.severity}</Badge>}</div><p className="mt-1 truncate text-xs text-ops-muted">{asset ? `${asset.name} · ` : ''}{event.description}</p></div><time className="shrink-0 text-xs text-ops-muted">{eventTime(event.createdAt)}</time></div> })}</div> : <p className="py-8 text-center text-sm text-ops-muted">No activity recorded yet.</p>}</Card>
      <Card className="min-w-0 p-5"><SectionTitle title="Work & response" detail="Items needing operator attention" /><div className="space-y-2">{[
        { label: 'Open alerts', value: openIncidents, icon: BellRing, to: '/alerts', tone: openIncidents ? 'text-ops-warning' : 'text-ops-success' },
        { label: 'Overdue work orders', value: metricsData.overdueWorkOrders, icon: Wrench, to: '/maintenance', tone: 'text-ops-caution' },
        { label: 'Inspections underway', value: metricsData.inspectionsInProgress, icon: ClipboardList, to: '/inspections', tone: 'text-ops-accent-text' },
      ].map(({ label, value, icon: Icon, to, tone }) => <Link key={label} to={to} className="flex items-center gap-3 rounded-lg border border-ops-line p-3 transition-colors hover:bg-ops-bg"><span className={`grid h-8 w-8 place-items-center rounded-lg bg-ops-bg ${tone}`}><Icon size={15} /></span><span className="flex-1 text-xs font-medium">{label}</span><span className="text-lg font-semibold tabular-nums">{value}</span><ArrowRight size={14} className="text-ops-muted" /></Link>)}</div><div className="mt-4 rounded-lg bg-ops-accent-bg/40 p-3 text-xs leading-5 text-ops-muted"><MapPinned size={14} className="mr-1.5 inline text-ops-accent-text" />Changes sync to one shared workspace. Any visitor can edit these demo records.</div></Card>
    </div>
  </>
}
