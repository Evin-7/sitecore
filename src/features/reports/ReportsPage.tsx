import { useMemo, useState } from 'react'
import { Download, FileSpreadsheet, Printer } from 'lucide-react'
import { Badge, Button, Card, EmptyState, Field, PageHeading, Select, TextInput } from '../../components/ui'
import { exportCsv } from '../../lib/format'
import { SITE_CODE, SITE_NAME } from '../../data/site-data'
import { useAppStore } from '../../stores/app-store'

type ReportType = 'summary' | 'assets' | 'maintenance' | 'incidents' | 'activity'
const reportLabels: Record<ReportType, string> = { summary: 'Operational summary', assets: 'Asset inventory', maintenance: 'Maintenance work orders', incidents: 'Incident history', activity: 'Operations activity' }

export function ReportsPage() {
  const data = useAppStore((state) => state.data)!
  const [type, setType] = useState<ReportType>('assets')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const selected = useMemo(() => {
    if (type === 'summary') return {
      headers: ['Measure', 'Current result', 'Scope'],
      rows: [
        ['Site', SITE_NAME, SITE_CODE],
        ['Registered assets', String(data.assets.length), 'Current site inventory'],
        ['Active or operational assets', String(data.assets.filter((asset) => asset.status === 'active' || asset.status === 'operational').length), 'Current asset status'],
        ['Assets needing attention', String(data.assets.filter((asset) => asset.status === 'attention' || asset.status === 'maintenance' || asset.status === 'offline').length), 'Attention, maintenance, or offline'],
        ['Open incidents', String(data.incidents.filter((incident) => incident.status !== 'resolved').length), 'Open and acknowledged'],
        ['Active work orders', String(data.maintenanceTasks.filter((task) => task.status === 'scheduled' || task.status === 'in-progress').length), 'Scheduled and in progress'],
        ['Inspections in progress', String(data.inspections.filter((inspection) => inspection.status === 'in-progress').length), 'Current checklist state'],
        ['Average utilisation', `${Math.round(data.assets.reduce((sum, asset) => sum + asset.utilization, 0) / Math.max(data.assets.length, 1))}%`, 'Mean of current asset readings'],
        ['Local scenario', data.simulation.running ? `Running · cycle ${data.simulation.tick}` : `Paused · cycle ${data.simulation.tick}`, 'No live equipment connection'],
        ['Data source', 'Local browser records', 'Operator-entered or local simulation'],
      ],
    }
    if (type === 'assets') return { headers: ['Asset ID', 'Name', 'Category', 'Status', 'Zone', 'Location', 'Utilisation (%)', 'Serial number'], rows: data.assets.filter((asset) => { const date = asset.createdAt.slice(0, 10); return (!from || date >= from) && (!to || date <= to) }).map((asset) => [asset.id, asset.name, asset.typeLabel, asset.status, data.zones.find((zone) => zone.id === asset.zoneId)?.name ?? 'Unassigned', asset.location, String(asset.utilization), asset.serialNumber]) }
    if (type === 'maintenance') return { headers: ['Work order', 'Title', 'Asset', 'Priority', 'Status', 'Due date', 'Assignee', 'Notes'], rows: data.maintenanceTasks.filter((task) => (!from || task.dueDate >= from) && (!to || task.dueDate <= to)).map((task) => [task.id, task.title, data.assets.find((asset) => asset.id === task.assetId)?.name ?? 'Unlinked', task.priority, task.status, task.dueDate, task.assignee, task.notes]) }
    if (type === 'incidents') return { headers: ['Incident ID', 'Title', 'Asset', 'Severity', 'Status', 'Reported at', 'Description', 'Source'], rows: data.incidents.filter((incident) => { const date = incident.createdAt.slice(0, 10); return (!from || date >= from) && (!to || date <= to) }).map((incident) => [incident.id, incident.title, data.assets.find((asset) => asset.id === incident.assetId)?.name ?? 'Unlinked', incident.severity, incident.status, incident.createdAt, incident.description, incident.source]) }
    return { headers: ['Event ID', 'Type', 'Title', 'Asset', 'Zone', 'Severity', 'Created at', 'Description'], rows: data.events.filter((event) => { const date = event.createdAt.slice(0, 10); return (!from || date >= from) && (!to || date <= to) }).map((event) => [event.id, event.type, event.title, data.assets.find((asset) => asset.id === event.assetId)?.name ?? 'Site level', data.zones.find((zone) => zone.id === event.zoneId)?.name ?? '—', event.severity ?? '—', event.createdAt, event.description]) }
  }, [data, from, to, type])

  const exportReport = () => exportCsv(`sitecore-${type}-${new Date().toISOString().slice(0, 10)}.csv`, [selected.headers, ...selected.rows])
  const dateRange = type === 'summary' ? 'Current local records' : from || to ? `${from || 'Beginning'} to ${to || 'Today'}` : 'All recorded dates'

  return <>
    <PageHeading eyebrow="Operational reporting" title="Reports" description="Filter current site records by date, preview the results, then export CSV or print a clean report." actions={<><Button onClick={() => window.print()}><Printer size={15}/>Print report</Button><Button variant="primary" onClick={exportReport} disabled={!selected.rows.length}><Download size={15}/>Export CSV</Button></>} />
    <Card className="mb-4 p-4"><div className="grid gap-3 md:grid-cols-[minmax(210px,1fr)_minmax(160px,.6fr)_minmax(160px,.6fr)_auto] md:items-end"><Field label="Report"><Select value={type} onValueChange={(value) => setType(value as ReportType)}>{Object.entries(reportLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</Select></Field><Field label={type === 'summary' ? 'Date range not used' : type === 'maintenance' ? 'Due from' : 'Created from'}><TextInput type="date" value={from} max={to || undefined} disabled={type === 'summary'} onChange={(event) => setFrom(event.target.value)}/></Field><Field label={type === 'summary' ? 'Current totals' : type === 'maintenance' ? 'Due through' : 'Created through'}><TextInput type="date" value={to} min={from || undefined} disabled={type === 'summary'} onChange={(event) => setTo(event.target.value)}/></Field><Button onClick={() => { setFrom(''); setTo('') }}>Clear dates</Button></div></Card>
    <Card className="overflow-hidden print:border-0 print:shadow-none"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-ops-line px-4 py-4 sm:px-5"><div><p className="text-sm font-semibold">{reportLabels[type]}</p><p className="mt-1 text-xs text-ops-muted">{dateRange} · Local workspace</p></div><div className="flex items-center gap-2"><Badge tone="idle">{selected.rows.length} records</Badge><Button onClick={exportReport} disabled={!selected.rows.length} className="no-print"><FileSpreadsheet size={14}/>CSV</Button></div></div>
      {selected.rows.length ? <div className="overflow-x-auto"><table className="w-full min-w-[800px] text-left"><thead className="bg-ops-bg/60"><tr>{selected.headers.map((header) => <th key={header} className="whitespace-nowrap border-b border-ops-line px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ops-muted">{header}</th>)}</tr></thead><tbody>{selected.rows.map((row, rowIndex) => <tr key={`${row[0]}-${rowIndex}`} className="border-b border-ops-line/70 last:border-b-0 hover:bg-ops-bg/40">{row.map((cell, cellIndex) => <td key={`${cellIndex}-${cell}`} className="max-w-[280px] truncate px-4 py-3 text-xs text-ops-text">{cell || '—'}</td>)}</tr>)}</tbody></table></div> : <div className="p-5"><EmptyState title="No records in this date range" detail="Clear the date filter or choose a different report." /></div>}
      <p className="border-t border-ops-line px-4 py-3 text-xs text-ops-muted sm:px-5">Report values reflect the records stored locally in this browser. CSV export includes all matching rows.</p>
    </Card>
  </>
}
