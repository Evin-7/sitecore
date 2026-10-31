import { useMemo } from 'react'
import { Activity, AlertTriangle, Boxes, Wrench } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Badge, Card, PageHeading, SectionTitle } from '../../components/ui'
import { useAppStore } from '../../stores/app-store'
import type { AssetStatus } from '../../types/operations'
import { STATUS_LABELS } from '../../types/operations'

const statusColors: Record<AssetStatus, string> = { operational: '#34d399', active: '#60a5fa', idle: '#94a3b8', attention: '#fbbf24', maintenance: '#fb923c', offline: '#fb7185' }
const chartTooltip = { background: 'var(--panel-bg)', border: '1px solid var(--line-color)', borderRadius: 8, fontSize: 12, color: 'var(--text-color)' }

export function AnalyticsPage() {
  const data = useAppStore((state) => state.data)!
  const status = useMemo(() => (Object.keys(statusColors) as AssetStatus[]).map((key) => ({ name: STATUS_LABELS[key], count: data.assets.filter((asset) => asset.status === key).length, key })).filter((item) => item.count), [data.assets])
  const zones = useMemo(() => data.zones.map((zone) => {
    const assets = data.assets.filter((asset) => asset.zoneId === zone.id)
    return { name: zone.name, utilisation: assets.length ? Math.round(assets.reduce((sum, asset) => sum + asset.utilization, 0) / assets.length) : 0, assets: assets.length, active: assets.filter((asset) => asset.status === 'operational' || asset.status === 'active').length }
  }), [data.assets, data.zones])
  const alerts = ['critical', 'high', 'medium', 'low'].map((severity) => ({ severity, count: data.incidents.filter((incident) => incident.severity === severity).length }))
  const work = ['scheduled', 'in-progress', 'completed', 'cancelled'].map((status) => ({ status, count: data.maintenanceTasks.filter((task) => task.status === status).length }))
  const activityTrend = useMemo(() => {
    const latestRecord = [...data.events, ...data.incidents].reduce<string | null>((latest, item) => latest === null || item.createdAt > latest ? item.createdAt : latest, null)
    const referenceDate = new Date(latestRecord ?? data.assets[0]?.createdAt ?? '1970-01-01T00:00:00.000Z')
    const days = Array.from({ length: 7 }, (_, index) => {
      const day = new Date(referenceDate.getTime())
      day.setUTCHours(0, 0, 0, 0)
      day.setUTCDate(day.getUTCDate() - 6 + index)
      const key = day.toISOString().slice(0, 10)
      return { key, day: day.toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' }), activity: 0, incidents: 0 }
    })
    const byDay = new Map(days.map((day) => [day.key, day]))
    for (const event of data.events) {
      const date = byDay.get(event.createdAt.slice(0, 10))
      if (date) date.activity += 1
    }
    for (const incident of data.incidents) {
      const date = byDay.get(incident.createdAt.slice(0, 10))
      if (date) date.incidents += 1
    }
    return days
  }, [data.assets, data.events, data.incidents])
  const avgUtilization = data.assets.length ? Math.round(data.assets.reduce((sum, asset) => sum + asset.utilization, 0) / data.assets.length) : 0
  const resolvedRate = data.incidents.length ? Math.round(data.incidents.filter((incident) => incident.status === 'resolved').length / data.incidents.length * 100) : 0

  const latestActivityDate = activityTrend[activityTrend.length - 1]?.day ?? '—'

  return <>
    <PageHeading eyebrow="Derived from workspace records" title="Site analytics" description="Asset distribution, utilisation, incident severity, and maintenance completion from one shared data set." actions={<Badge tone="idle">Shared public data</Badge>} />
    <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[
      { label: 'Tracked assets', value: data.assets.length, suffix: 'registered', icon: Boxes, color: 'text-ops-accent-text' },
      { label: 'Average utilisation', value: `${avgUtilization}%`, suffix: 'asset-weighted', icon: Activity, color: 'text-ops-success' },
      { label: 'Incident resolution', value: `${resolvedRate}%`, suffix: 'resolved records', icon: AlertTriangle, color: 'text-ops-warning' },
      { label: 'Work completed', value: `${data.maintenanceTasks.filter((task) => task.status === 'completed').length}/${data.maintenanceTasks.length}`, suffix: 'work orders', icon: Wrench, color: 'text-ops-caution' },
    ].map(({ label, value, suffix, icon: Icon, color }) => <Card key={label} className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-ops-muted">{label}</p><p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p><p className="mt-1 text-xs text-ops-muted">{suffix}</p></div><span className={`grid h-9 w-9 place-items-center rounded-lg bg-ops-bg ${color}`}><Icon size={17}/></span></div></Card>)}</div>
    <div className="grid gap-4 xl:grid-cols-2">
      <Card className="p-5"><SectionTitle title="Asset status distribution" detail={`${data.assets.length} registered assets`} /><div className="h-[260px]"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={status} dataKey="count" nameKey="name" innerRadius={69} outerRadius={104} paddingAngle={3} stroke="none">{status.map((item) => <Cell key={item.key} fill={statusColors[item.key]}/>)}</Pie><Tooltip contentStyle={chartTooltip}/></PieChart></ResponsiveContainer></div><div className="flex flex-wrap gap-x-4 gap-y-2">{status.map((item) => <span key={item.key} className="inline-flex items-center gap-2 text-xs text-ops-muted"><span className="h-2 w-2 rounded-full" style={{ background: statusColors[item.key] }}/>{item.name} <span className="font-medium text-ops-text">{item.count}</span></span>)}</div></Card>
      <Card className="p-5"><SectionTitle title="Utilisation by zone" detail="Mean utilisation across assigned assets" /><div className="h-[300px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={zones} margin={{ top: 14, right: 8, left: -18, bottom: 4 }}><CartesianGrid stroke="var(--line-color)" strokeDasharray="3 4" vertical={false}/><XAxis dataKey="name" tick={{ fill: 'var(--muted-color)', fontSize: 12 }} axisLine={false} tickLine={false}/><YAxis domain={[0, 100]} tick={{ fill: 'var(--muted-color)', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(value: number) => `${value}%`}/><Tooltip contentStyle={chartTooltip} formatter={(value) => [`${value}%`, 'Average utilisation']}/><Bar dataKey="utilisation" fill="#6ca5ff" radius={[5, 5, 0, 0]} maxBarSize={54}/></BarChart></ResponsiveContainer></div><div className="mt-2 grid grid-cols-2 gap-2">{zones.map((zone) => <div key={zone.name} className="flex items-center justify-between rounded-md bg-ops-bg px-2.5 py-2 text-xs"><span className="truncate text-ops-muted">{zone.name}</span><span className="ml-2 font-medium">{zone.assets} assets · {zone.active} active</span></div>)}</div></Card>
      <Card className="p-5"><SectionTitle title="Incidents by severity" detail="All current and resolved incident records"/><div className="h-[250px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={alerts} layout="vertical" margin={{ top: 8, right: 18, left: 8, bottom: 5 }}><CartesianGrid stroke="var(--line-color)" strokeDasharray="3 4" horizontal={false}/><XAxis type="number" allowDecimals={false} tick={{ fill: 'var(--muted-color)', fontSize: 12 }} axisLine={false} tickLine={false}/><YAxis dataKey="severity" type="category" tick={{ fill: 'var(--muted-color)', fontSize: 12 }} axisLine={false} tickLine={false} width={60}/><Tooltip contentStyle={chartTooltip}/><Bar dataKey="count" name="Incidents" fill="#f59e0b" radius={[0, 5, 5, 0]} maxBarSize={28}/></BarChart></ResponsiveContainer></div></Card>
      <Card className="p-5"><SectionTitle title="Maintenance workflow" detail="Work order distribution by status"/><div className="h-[250px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={work} margin={{ top: 8, right: 10, left: -18, bottom: 0 }}><CartesianGrid stroke="var(--line-color)" strokeDasharray="3 4" vertical={false}/><XAxis dataKey="status" tick={{ fill: 'var(--muted-color)', fontSize: 12 }} axisLine={false} tickLine={false}/><YAxis allowDecimals={false} tick={{ fill: 'var(--muted-color)', fontSize: 12 }} axisLine={false} tickLine={false}/><Tooltip contentStyle={chartTooltip}/><Bar dataKey="count" name="Work orders" fill="#60a5fa" radius={[5, 5, 0, 0]} maxBarSize={48}/></BarChart></ResponsiveContainer></div><p className="mt-2 text-xs leading-5 text-ops-muted">The metrics on this page are recalculated from the current workspace data. No operational data is fetched from external systems.</p></Card>
      <Card className="p-5 xl:col-span-2"><SectionTitle title="Recorded activity trend" detail={`Daily activity and incident entries · 7 days through ${latestActivityDate}`}/><div className="h-[260px]" role="img" aria-label="Line chart showing daily activity events and incident entries for the seven days through the latest workspace record"><ResponsiveContainer width="100%" height="100%"><LineChart data={activityTrend} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}><CartesianGrid stroke="var(--line-color)" strokeDasharray="3 4" vertical={false}/><XAxis dataKey="day" tick={{ fill: 'var(--muted-color)', fontSize: 12 }} axisLine={false} tickLine={false}/><YAxis allowDecimals={false} tick={{ fill: 'var(--muted-color)', fontSize: 12 }} axisLine={false} tickLine={false}/><Tooltip contentStyle={chartTooltip}/><Line type="monotone" dataKey="activity" name="Activity events" stroke="#6ca5ff" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} isAnimationActive={false}/><Line type="monotone" dataKey="incidents" name="Incident entries" stroke="#f5b942" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} isAnimationActive={false}/></LineChart></ResponsiveContainer></div><p className="mt-2 text-xs leading-5 text-ops-muted">A record-based trend, not a live operational feed. New operator actions and simulated events appear as they sync.</p></Card>
    </div>
  </>
}
