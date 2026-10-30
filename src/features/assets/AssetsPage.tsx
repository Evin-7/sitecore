import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { Box, Building2, ChevronDown, Crosshair, Edit3, Plus, Search, Trash2, Truck } from 'lucide-react'
import { Badge, Button, Card, EmptyState, Field, Modal, PageHeading, Select, TextArea, TextInput } from '../../components/ui'
import { parseAssetDraft, AssetDraftSchema, type AssetDraft } from '../../lib/schemas'
import { getZoneName } from '../../lib/format'
import { useAppStore } from '../../stores/app-store'
import type { AssetKind, AssetStatus, SiteAsset } from '../../types/operations'
import { STATUS_LABELS } from '../../types/operations'
import { filterAssets } from './asset-utils'

const kinds: { value: AssetKind; label: string }[] = [
  { value: 'warehouse', label: 'Warehouse' }, { value: 'process-hall', label: 'Process hall' }, { value: 'vehicle', label: 'Vehicle' }, { value: 'container', label: 'Container' }, { value: 'pump', label: 'Pump station' }, { value: 'sensor', label: 'Sensor' }, { value: 'generator', label: 'Generator' }, { value: 'lighting', label: 'Lighting' }, { value: 'checkpoint', label: 'Checkpoint' },
]
const statuses: AssetStatus[] = ['operational', 'active', 'idle', 'attention', 'maintenance', 'offline']

function getEditAssetId(state: unknown): string | null {
  if (typeof state !== 'object' || state === null || !('editAssetId' in state)) return null
  return typeof state.editAssetId === 'string' ? state.editAssetId : null
}

function defaultDraft(zoneId: string | null): AssetDraft {
  const zone = useAppStore.getState().data?.zones.find((item) => item.id === zoneId)
  return { name: '', kind: 'vehicle', typeLabel: 'Utility vehicle', status: 'operational', location: '', zoneId, position: zone ? [...zone.center] : [0, 0], detail: '', telemetry: 'Local status · no live equipment connection', utilization: 0 }
}

function AssetForm({ asset, onCancel, onSave }: { asset: SiteAsset | null; onCancel: () => void; onSave: (draft: AssetDraft) => void }) {
  const data = useAppStore((state) => state.data)!
  const [draft, setDraft] = useState<AssetDraft>(() => asset ? { name: asset.name, kind: asset.kind, typeLabel: asset.typeLabel, status: asset.status, location: asset.location, zoneId: asset.zoneId, position: [...asset.position], footprint: asset.footprint ? [...asset.footprint] : undefined, height: asset.height, detail: asset.detail, telemetry: asset.telemetry, utilization: asset.utilization } : defaultDraft(data.zones[0]?.id ?? null))
  const [validation, setValidation] = useState<string | null>(null)
  const building = draft.kind === 'warehouse' || draft.kind === 'process-hall'
  const set = <K extends keyof AssetDraft>(key: K, value: AssetDraft[K]) => setDraft((current) => ({ ...current, [key]: value }))
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const result = AssetDraftSchema.safeParse(draft)
    if (!result.success) { setValidation(result.error.issues[0]?.message ?? 'Check the asset details.'); return }
    onSave(parseAssetDraft(result.data))
  }
  const kindLabel = kinds.find((item) => item.value === draft.kind)?.label ?? 'Asset'
  return <form className="grid gap-4" onSubmit={submit}>
    {validation && <p role="alert" className="rounded-lg border border-ops-danger/25 bg-ops-danger-bg/50 px-3 py-2 text-xs text-ops-danger">{validation}</p>}
    <div className="grid gap-3 sm:grid-cols-2"><Field label="Asset name"><TextInput required maxLength={80} value={draft.name} onChange={(event) => set('name', event.target.value)} placeholder="North yard forklift" /></Field><Field label="Category"><Select value={draft.kind} onValueChange={(value) => { const kind = value as AssetKind; set('kind', kind); set('typeLabel', kinds.find((item) => item.value === kind)?.label ?? 'Asset') }}>{kinds.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</Select></Field></div>
    <div className="grid gap-3 sm:grid-cols-2"><Field label="Asset type label"><TextInput required maxLength={50} value={draft.typeLabel} onChange={(event) => set('typeLabel', event.target.value)} /></Field><Field label="Status"><Select value={draft.status} onValueChange={(value) => set('status', value as AssetStatus)}>{statuses.map((status) => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}</Select></Field></div>
    <div className="grid gap-3 sm:grid-cols-2"><Field label="Location"><TextInput required maxLength={100} value={draft.location} onChange={(event) => set('location', event.target.value)} placeholder="South access · Lane 1" /></Field><Field label="Operational zone"><Select value={draft.zoneId ?? ''} onValueChange={(value) => { const zoneId = value || null; const zone = data.zones.find((item) => item.id === zoneId); set('zoneId', zoneId); if (zone) set('position', [...zone.center]) }}><option value="">Unassigned</option>{data.zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.name}</option>)}</Select></Field></div>
    <div className="grid gap-3 sm:grid-cols-3"><Field label="Position X"><TextInput type="number" min={-45} max={45} step="0.5" value={draft.position[0]} onChange={(event) => set('position', [Number(event.target.value), draft.position[1]])} /></Field><Field label="Position Y"><TextInput type="number" min={-45} max={45} step="0.5" value={draft.position[1]} onChange={(event) => set('position', [draft.position[0], Number(event.target.value)])} /></Field><Field label="Utilisation (%)"><TextInput type="number" min={0} max={100} step="1" value={draft.utilization} onChange={(event) => set('utilization', Number(event.target.value))} /></Field></div>
    {building && <div className="grid gap-3 sm:grid-cols-3"><Field label="Footprint width"><TextInput type="number" min={0.5} max={40} step="0.5" value={draft.footprint?.[0] ?? 8} onChange={(event) => set('footprint', [Number(event.target.value), draft.footprint?.[1] ?? 6])} /></Field><Field label="Footprint depth"><TextInput type="number" min={0.5} max={40} step="0.5" value={draft.footprint?.[1] ?? 6} onChange={(event) => set('footprint', [draft.footprint?.[0] ?? 8, Number(event.target.value)])} /></Field><Field label="Height"><TextInput type="number" min={0.5} max={20} step="0.25" value={draft.height ?? 4} onChange={(event) => set('height', Number(event.target.value))} /></Field></div>}
    <Field label="Asset details"><TextArea maxLength={240} required value={draft.detail} onChange={(event) => set('detail', event.target.value)} placeholder="Purpose, capacity, or relevant operating context" /></Field>
    <Field label="Current local telemetry" hint="Keep clear that these readings are locally recorded or simulated."><TextInput required maxLength={160} value={draft.telemetry} onChange={(event) => set('telemetry', event.target.value)} /></Field>
    <div className="flex justify-end gap-2 pt-1"><Button type="button" onClick={onCancel}>Cancel</Button><Button variant="primary" type="submit">{asset ? 'Save changes' : `Add ${kindLabel.toLowerCase()}`}</Button></div>
  </form>
}

export function AssetsPage() {
  const data = useAppStore((state) => state.data)!
  const createAsset = useAppStore((state) => state.createAsset)
  const saveAsset = useAppStore((state) => state.saveAsset)
  const deleteAsset = useAppStore((state) => state.deleteAsset)
  const selectAsset = useAppStore((state) => state.selectAsset)
  const navigate = useNavigate()
  const location = useLocation()
  const routeEditAssetId = getEditAssetId(location.state)
  const routeEditAsset = routeEditAssetId ? data.assets.find((asset) => asset.id === routeEditAssetId) ?? null : null
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'all' | AssetStatus>('all')
  const [kind, setKind] = useState<'all' | AssetKind>('all')
  const [sort, setSort] = useState<'name' | 'status' | 'utilization' | 'createdAt'>('name')
  const [direction, setDirection] = useState<'asc' | 'desc'>('asc')
  const [editing, setEditing] = useState<SiteAsset | null>(() => routeEditAsset)
  const [modal, setModal] = useState<'create' | 'edit' | 'delete' | null>(() => routeEditAsset ? 'edit' : null)
  const [busy, setBusy] = useState(false)
  const filtered = useMemo(() => filterAssets(data.assets, { query, status, kind, sort, direction }), [data.assets, direction, kind, query, sort, status])

  useEffect(() => {
    if (routeEditAssetId !== null) navigate(location.pathname, { replace: true, state: null })
  }, [location.pathname, navigate, routeEditAssetId])

  const submit = async (draft: AssetDraft) => {
    setBusy(true)
    try {
      if (editing) await saveAsset({ ...editing, ...draft })
      else await createAsset(draft)
      setModal(null); setEditing(null)
    } finally { setBusy(false) }
  }

  return <>
    <PageHeading eyebrow="Equipment & infrastructure" title="Asset register" description="Manage the site inventory, review asset status, and focus any record in the 3D site viewer." actions={<Button variant="primary" onClick={() => { setEditing(null); setModal('create') }}><Plus size={15} />Register asset</Button>} />
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-ops-line p-4 lg:flex-row lg:items-center"><label className="relative min-w-0 flex-1"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ops-muted" /><input aria-label="Search assets" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, ID, location, or serial number" className="min-h-10 w-full rounded-lg border border-ops-line bg-ops-bg pl-9 pr-3 text-sm placeholder:text-ops-muted focus:border-ops-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ops-accent" /></label><div className="grid grid-cols-2 gap-2 sm:flex"><Select aria-label="Filter by category" value={kind} onValueChange={(value) => setKind(value as 'all' | AssetKind)} className="min-w-32"><option value="all">All categories</option>{kinds.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</Select><Select aria-label="Filter by status" value={status} onValueChange={(value) => setStatus(value as 'all' | AssetStatus)} className="min-w-32"><option value="all">All statuses</option>{statuses.map((item) => <option key={item} value={item}>{STATUS_LABELS[item]}</option>)}</Select><Select aria-label="Sort assets" value={sort} onValueChange={(value) => setSort(value as typeof sort)} className="min-w-32"><option value="name">Sort: name</option><option value="status">Sort: status</option><option value="utilization">Sort: utilisation</option><option value="createdAt">Sort: date added</option></Select><Button aria-label="Reverse sort direction" onClick={() => setDirection((value) => value === 'asc' ? 'desc' : 'asc')}><ChevronDown size={15} className={direction === 'desc' ? 'rotate-180' : ''} /></Button></div></div>
      <div className="border-b border-ops-line px-4 py-2.5 text-xs text-ops-muted">Showing <span className="font-medium text-ops-text">{filtered.length}</span> of {data.assets.length} assets</div>
      {filtered.length ? <div className="overflow-x-auto"><table className="w-full min-w-[760px] border-collapse text-left"><thead><tr className="border-b border-ops-line text-xs font-semibold uppercase tracking-[.12em] text-ops-muted"><th className="px-4 py-3 font-medium">Asset</th><th className="px-4 py-3 font-medium">Category</th><th className="px-4 py-3 font-medium">Zone / location</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 font-medium">Utilisation</th><th className="px-4 py-3 text-right font-medium">Actions</th></tr></thead><tbody>{filtered.map((asset) => { const Icon = asset.kind === 'vehicle' ? Truck : asset.kind === 'warehouse' || asset.kind === 'process-hall' ? Building2 : Box; return <tr key={asset.id} className="border-b border-ops-line/70 last:border-b-0 hover:bg-ops-bg/60"><td className="px-4 py-3"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-lg bg-ops-bg text-ops-muted"><Icon size={16} /></span><div><button onClick={() => { selectAsset(asset.id, true); navigate('/site') }} className="text-left text-sm font-medium hover:text-ops-accent-text">{asset.name}</button><p className="mt-0.5 font-mono text-xs text-ops-muted">{asset.id} · {asset.serialNumber}</p></div></div></td><td className="px-4 py-3 text-sm text-ops-muted">{asset.typeLabel}</td><td className="px-4 py-3"><p className="text-xs font-medium">{getZoneName(data, asset.zoneId)}</p><p className="mt-0.5 text-xs text-ops-muted">{asset.location}</p></td><td className="px-4 py-3"><Badge tone={asset.status}>{STATUS_LABELS[asset.status]}</Badge></td><td className="px-4 py-3"><div className="flex items-center gap-2"><div className="h-1.5 w-20 overflow-hidden rounded-full bg-ops-line"><div className="h-full rounded-full bg-blue-400" style={{ width: `${asset.utilization}%` }} /></div><span className="text-xs tabular-nums text-ops-muted">{asset.utilization}%</span></div></td><td className="px-4 py-3"><div className="flex justify-end gap-1"><Button variant="subtle" className="h-8 min-h-8 w-8 p-0" title="View in site viewer" aria-label={`View ${asset.name} in site viewer`} onClick={() => { selectAsset(asset.id, true); navigate('/site') }}><Crosshair size={15} /></Button><Button variant="subtle" className="h-8 min-h-8 w-8 p-0" title="Edit asset" aria-label={`Edit ${asset.name}`} onClick={() => { setEditing(asset); setModal('edit') }}><Edit3 size={15} /></Button><Button variant="subtle" className="h-8 min-h-8 w-8 p-0 text-ops-danger hover:text-ops-danger-strong" title="Retire asset" aria-label={`Retire ${asset.name}`} onClick={() => { setEditing(asset); setModal('delete') }}><Trash2 size={15} /></Button></div></td></tr> })}</tbody></table></div> : <div className="p-5"><EmptyState title="No matching assets" detail={query || status !== 'all' || kind !== 'all' ? 'Adjust or clear your filters to see more records.' : 'Add the first asset to the site register.'} action={!(query || status !== 'all' || kind !== 'all') && <Button variant="primary" onClick={() => setModal('create')}><Plus size={15} />Register asset</Button>} /></div>}
    </Card>
    <Modal open={modal === 'create' || modal === 'edit'} onClose={() => { if (!busy) { setModal(null); setEditing(null) } }} title={editing ? `Edit ${editing.id}` : 'Register a site asset'} size="max-w-2xl"><AssetForm asset={modal === 'edit' ? editing : null} onCancel={() => { setModal(null); setEditing(null) }} onSave={(draft) => void submit(draft)} /></Modal>
    <Modal open={modal === 'delete'} onClose={() => setModal(null)} title="Retire this asset" footer={<><Button onClick={() => setModal(null)}>Cancel</Button><Button variant="danger" onClick={() => { if (editing) void deleteAsset(editing.id).then(() => setModal(null)) }}>Retire asset</Button></>}><p className="text-sm leading-6 text-ops-muted">Retire <span className="font-medium text-ops-text">{editing?.name}</span>? The asset will be removed from the live register and 3D view. Incident, inspection, and work order history will remain with the asset link cleared.</p></Modal>
  </>
}
