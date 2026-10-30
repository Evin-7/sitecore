import { useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { AlertTriangle, ArrowRight, Box, Check, CircleAlert, Plus, Search } from 'lucide-react'
import { Badge, Button, Card, EmptyState, Field, Modal, PageHeading, Select, TextArea, TextInput } from '../../components/ui'
import { IncidentSchema } from '../../lib/schemas'
import { eventTime, getAsset, getZoneName } from '../../lib/format'
import { useAppStore } from '../../stores/app-store'
import type { Incident, IncidentSeverity, IncidentStatus } from '../../types/operations'

function IncidentForm({ onCancel, onSave }: { onCancel: () => void; onSave: (incident: Omit<Incident, 'id' | 'createdAt' | 'updatedAt' | 'acknowledgedAt' | 'resolvedAt' | 'source'>) => Promise<void> }) {
  const data = useAppStore((state) => state.data)!
  const [title, setTitle] = useState('')
  const [assetId, setAssetId] = useState('')
  const [severity, setSeverity] = useState<IncidentSeverity>('medium')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const submit = (event: FormEvent) => {
    event.preventDefault()
    const asset = data.assets.find((item) => item.id === assetId)
    const next = { title, description, assetId: asset?.id ?? null, zoneId: asset?.zoneId ?? null, severity, status: 'open' as const }
    const parsed = IncidentSchema.omit({ id: true, createdAt: true, updatedAt: true, acknowledgedAt: true, resolvedAt: true, source: true }).safeParse(next)
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? 'Check the incident details.'); return }
    void onSave(next)
  }
  return <form onSubmit={submit} className="grid gap-4">{error && <p role="alert" className="text-xs text-ops-danger">{error}</p>}<Field label="Incident title"><TextInput required value={title} maxLength={100} onChange={(event) => setTitle(event.target.value)} placeholder="Describe what needs attention" /></Field><div className="grid gap-3 sm:grid-cols-2"><Field label="Severity"><Select value={severity} onValueChange={(value) => setSeverity(value as IncidentSeverity)}>{(['critical', 'high', 'medium', 'low'] as const).map((value) => <option value={value} key={value}>{value}</option>)}</Select></Field><Field label="Related asset"><Select value={assetId} onValueChange={setAssetId}><option value="">Site-level incident</option>{data.assets.map((asset) => <option value={asset.id} key={asset.id}>{asset.name} · {asset.id}</option>)}</Select></Field></div><Field label="Description"><TextArea required minLength={3} maxLength={400} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What happened and what should an operator check?" /></Field><div className="flex justify-end gap-2"><Button type="button" onClick={onCancel}>Cancel</Button><Button variant="primary" type="submit">Create incident</Button></div></form>
}

const statusOptions: (IncidentStatus | 'all')[] = ['all', 'open', 'acknowledged', 'resolved']
const severityOptions: (IncidentSeverity | 'all')[] = ['all', 'critical', 'high', 'medium', 'low']

export function AlertsPage() {
  const data = useAppStore((state) => state.data)!
  const saveIncident = useAppStore((state) => state.saveIncident)
  const addIncident = useAppStore((state) => state.addIncident)
  const selectAsset = useAppStore((state) => state.selectAsset)
  const showToast = useAppStore((state) => state.showToast)
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'all' | IncidentStatus>('all')
  const [severity, setSeverity] = useState<'all' | IncidentSeverity>('all')
  const [creating, setCreating] = useState(false)
  const [selected, setSelected] = useState<Incident | null>(null)
  const filtered = useMemo(() => data.incidents.filter((incident) => {
    const asset = getAsset(data, incident.assetId)
    const search = query.trim().toLowerCase()
    return (status === 'all' || incident.status === status) && (severity === 'all' || incident.severity === severity) && (!search || [incident.id, incident.title, incident.description, asset?.name ?? ''].some((item) => item.toLowerCase().includes(search)))
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [data, query, severity, status])
  const openCount = data.incidents.filter((incident) => incident.status === 'open').length
  const activeCount = data.incidents.filter((incident) => incident.status !== 'resolved').length

  const transition = async (incident: Incident, next: IncidentStatus) => {
    const now = new Date().toISOString()
    try {
      await saveIncident({ ...incident, status: next, updatedAt: now, acknowledgedAt: next === 'acknowledged' ? now : incident.acknowledgedAt, resolvedAt: next === 'resolved' ? now : next === 'open' ? null : incident.resolvedAt })
      setSelected(null)
      showToast({ type: 'success', title: `Incident ${next}`, description: incident.title })
    } catch (error) {
      showToast({ type: 'error', title: 'Incident not updated', description: error instanceof Error ? error.message : 'Please try again.' })
    }
  }
  const submitIncident = async (draft: Omit<Incident, 'id' | 'createdAt' | 'updatedAt' | 'acknowledgedAt' | 'resolvedAt' | 'source'>) => {
    try {
      await addIncident(draft)
      setCreating(false)
      showToast({ type: 'success', title: 'Incident logged', description: draft.title })
    } catch (error) {
      showToast({ type: 'error', title: 'Incident not saved', description: error instanceof Error ? error.message : 'Please try again.' })
    }
  }
  const focusAsset = (incident: Incident) => { if (incident.assetId) { selectAsset(incident.assetId, true); navigate('/site') } }

  return <>
    <PageHeading eyebrow="Response & event history" title="Alerts & incidents" description="Triage local operator and simulation alerts, keep a clear response history, and navigate to related site assets." actions={<Button variant="primary" onClick={() => setCreating(true)}><Plus size={15}/>Log incident</Button>} />
    <div className="mb-4 grid gap-3 sm:grid-cols-3">{[{ label: 'Open', value: openCount, tone: 'text-ops-danger' }, { label: 'Acknowledged', value: data.incidents.filter((item) => item.status === 'acknowledged').length, tone: 'text-ops-warning' }, { label: 'Resolved', value: data.incidents.filter((item) => item.status === 'resolved').length, tone: 'text-ops-success' }].map((item) => <Card key={item.label} className="flex items-center gap-3 p-4"><span className={`grid h-9 w-9 place-items-center rounded-lg bg-ops-bg ${item.tone}`}><CircleAlert size={17}/></span><div><p className="text-xs text-ops-muted">{item.label}</p><p className="text-xl font-semibold tabular-nums">{item.value}</p></div></Card>)}</div>
    <Card className="overflow-hidden"><div className="grid gap-2 border-b border-ops-line p-4 md:grid-cols-[minmax(0,1fr)_190px_170px_auto] md:items-center"><label className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ops-muted"/><input aria-label="Search incidents" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search alerts and assets" className="h-10 w-full rounded-lg border border-ops-line bg-ops-bg pl-9 pr-3 text-sm placeholder:text-ops-muted focus:border-ops-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ops-accent"/></label><Select aria-label="Filter incidents by status" value={status} onValueChange={(value) => setStatus(value as typeof status)}>{statusOptions.map((value) => <option key={value} value={value}>{value === 'all' ? 'All statuses' : value}</option>)}</Select><Select aria-label="Filter incidents by severity" value={severity} onValueChange={(value) => setSeverity(value as typeof severity)}>{severityOptions.map((value) => <option key={value} value={value}>{value === 'all' ? 'All severities' : `${value} severity`}</option>)}</Select><span className="text-xs text-ops-muted">{filtered.length} records</span></div>
      {filtered.length ? <div className="divide-y divide-ops-line">{filtered.map((incident) => { const asset = getAsset(data, incident.assetId); return <button key={incident.id} onClick={() => setSelected(incident)} className="grid w-full gap-3 px-4 py-4 text-left transition-colors hover:bg-ops-bg/65 sm:grid-cols-[minmax(0,1fr)_130px_130px_110px] sm:items-center"><div className="flex min-w-0 items-start gap-3"><span className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg ${incident.severity === 'critical' || incident.severity === 'high' ? 'bg-ops-danger-bg text-ops-danger' : 'bg-ops-warning-bg text-ops-warning'}`}><AlertTriangle size={16}/></span><span className="min-w-0"><span className="flex flex-wrap items-center gap-2"><span className="truncate text-sm font-medium">{incident.title}</span><Badge tone={incident.severity}>{incident.severity}</Badge></span><span className="mt-1 block truncate text-xs text-ops-muted">{incident.id} · {incident.description}</span><span className="mt-1 block text-xs text-ops-muted">{asset ? `${asset.name} · ${asset.id}` : getZoneName(data, incident.zoneId)}</span></span></div><span><Badge tone={incident.status}>{incident.status}</Badge></span><time className="text-xs text-ops-muted">{eventTime(incident.updatedAt)}</time><span className="flex items-center gap-1 text-xs font-medium text-ops-accent-text">Details <ArrowRight size={13}/></span></button> })}</div> : <div className="p-5"><EmptyState title="No incidents found" detail={query || status !== 'all' || severity !== 'all' ? 'Try another status, severity, or search term.' : 'No incidents have been recorded.'} action={activeCount === 0 && <Button variant="primary" onClick={() => setCreating(true)}><Plus size={14}/>Log incident</Button>} /></div>}
    </Card>
    <Modal open={creating} onClose={() => setCreating(false)} title="Log an operator incident"><IncidentForm onCancel={() => setCreating(false)} onSave={submitIncident}/></Modal>
    <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.title ?? 'Incident details'} footer={selected && <>{selected.status === 'open' && <Button onClick={() => transition(selected, 'acknowledged')}><Check size={14}/>Acknowledge</Button>}{selected.status !== 'resolved' && <Button variant="primary" onClick={() => transition(selected, 'resolved')}><Check size={14}/>Resolve incident</Button>}{selected.status === 'resolved' && <Button variant="primary" onClick={() => transition(selected, 'open')}>Reopen incident</Button>}</>}>
      {selected && <div className="space-y-4"><div className="flex flex-wrap items-center gap-2"><Badge tone={selected.severity}>{selected.severity} severity</Badge><Badge tone={selected.status}>{selected.status}</Badge><span className="font-mono text-xs text-ops-muted">{selected.id}</span></div><p className="text-sm leading-6 text-ops-muted">{selected.description}</p><dl className="grid gap-3 rounded-lg bg-ops-bg p-4 text-xs sm:grid-cols-2"><div><dt className="text-ops-muted">Reported</dt><dd className="mt-1">{eventTime(selected.createdAt)}</dd></div><div><dt className="text-ops-muted">Last updated</dt><dd className="mt-1">{eventTime(selected.updatedAt)}</dd></div><div><dt className="text-ops-muted">Source</dt><dd className="mt-1 capitalize">{selected.source === 'local-simulation' ? 'Local simulation' : 'Operator reported'}</dd></div><div><dt className="text-ops-muted">Related zone</dt><dd className="mt-1">{getZoneName(data, selected.zoneId)}</dd></div></dl>{selected.assetId && <Button onClick={() => focusAsset(selected)}><Box size={14}/>Focus {getAsset(data, selected.assetId)?.name ?? selected.assetId}</Button>}</div>}
    </Modal>
  </>
}
