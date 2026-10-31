import { useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { CalendarCheck, Check, ClipboardCheck, Crosshair, Edit3, Plus, Search } from 'lucide-react'
import { Badge, Button, Card, EmptyState, Field, Modal, PageHeading, Select, TextArea, TextInput } from '../../components/ui'
import { InspectionSchema } from '../../lib/schemas'
import { dateLabel, getAsset } from '../../lib/format'
import { useAppStore } from '../../stores/app-store'
import type { Inspection, InspectionChecklistItem, InspectionStatus } from '../../types/operations'

function blankInspection(): Inspection {
  const now = new Date().toISOString()
  return { id: `IN-${Date.now().toString(36).toUpperCase()}`, title: '', assetId: null, zoneId: null, status: 'draft', dueDate: new Date().toISOString().slice(0, 10), inspector: '', checklist: [{ id: 'item-1', label: 'Visual condition', complete: false }, { id: 'item-2', label: 'Safety controls', complete: false }, { id: 'item-3', label: 'Operational check', complete: false }], notes: '', findings: '', createdAt: now, completedAt: null }
}

function markInspectionComplete(inspection: Inspection): Inspection {
  return { ...inspection, status: 'completed', completedAt: new Date().toISOString() }
}

function InspectionForm({ inspection, onCancel, onSave }: { inspection: Inspection; onCancel: () => void; onSave: (inspection: Inspection) => Promise<void> }) {
  const data = useAppStore((state) => state.data)!
  const [draft, setDraft] = useState(inspection)
  const [error, setError] = useState('')
  const set = <K extends keyof Inspection>(key: K, value: Inspection[K]) => setDraft((current) => ({ ...current, [key]: value }))
  const changeAsset = (id: string) => { const asset = data.assets.find((item) => item.id === id); setDraft((current) => ({ ...current, assetId: asset?.id ?? null, zoneId: asset?.zoneId ?? null })) }
  const updateItem = (id: string, patch: Partial<InspectionChecklistItem>) => set('checklist', draft.checklist.map((item) => item.id === id ? { ...item, ...patch } : item))
  const addItem = () => set('checklist', [...draft.checklist, { id: `item-${Date.now().toString(36)}`, label: '', complete: false }])
  const removeItem = (id: string) => set('checklist', draft.checklist.filter((item) => item.id !== id))
  const submit = (event: FormEvent) => {
    event.preventDefault()
    const normalized = { ...draft, checklist: draft.checklist.filter((item) => item.label.trim()), completedAt: draft.status === 'completed' ? draft.completedAt ?? new Date().toISOString() : null }
    const parsed = InspectionSchema.safeParse(normalized)
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? 'Check the inspection details.'); return }
    if (draft.checklist.some((item) => !item.label.trim())) { setError('Each checklist row needs a label or should be removed.'); return }
    if (parsed.data.status === 'completed' && parsed.data.checklist.some((item) => !item.complete)) { setError('Complete every checklist item before closing this inspection.'); return }
    void onSave(parsed.data as Inspection)
  }
  return <form onSubmit={submit} className="grid gap-4">{error && <p role="alert" className="text-xs text-ops-danger">{error}</p>}<Field label="Inspection title"><TextInput required maxLength={100} value={draft.title} onChange={(event) => set('title', event.target.value)} placeholder="Monthly equipment inspection" /></Field><div className="grid gap-3 sm:grid-cols-2"><Field label="Asset"><Select value={draft.assetId ?? ''} onValueChange={changeAsset}><option value="">Site level</option>{data.assets.map((asset) => <option value={asset.id} key={asset.id}>{asset.name} · {asset.id}</option>)}</Select></Field><Field label="Inspector"><TextInput required maxLength={80} value={draft.inspector} onChange={(event) => set('inspector', event.target.value)} placeholder="Inspector name" /></Field></div><div className="grid gap-3 sm:grid-cols-2"><Field label="Due date"><TextInput type="date" required value={draft.dueDate} onChange={(event) => set('dueDate', event.target.value)} /></Field><Field label="Status"><Select value={draft.status} onValueChange={(value) => { const status = value as InspectionStatus; setDraft((current) => ({ ...current, status, completedAt: status === 'completed' ? current.completedAt ?? new Date().toISOString() : null })) }}>{(['draft', 'in-progress', 'completed'] as const).map((status) => <option key={status} value={status}>{status}</option>)}</Select></Field></div><div className="rounded-lg border border-ops-line p-3"><div className="mb-2 flex items-center justify-between"><p className="text-xs font-semibold">Inspection checklist</p><Button type="button" className="h-8 min-h-8" onClick={addItem}><Plus size={13}/>Add check</Button></div><div className="space-y-2">{draft.checklist.map((item) => <div key={item.id} className="flex items-center gap-2"><input type="checkbox" checked={item.complete} onChange={(event) => updateItem(item.id, { complete: event.target.checked })} aria-label={`Complete: ${item.label || 'new checklist item'}`} className="h-4 w-4 accent-blue-500"/><TextInput aria-label="Checklist item label" maxLength={120} value={item.label} onChange={(event) => updateItem(item.id, { label: event.target.value })} placeholder="Inspection check"/><Button type="button" variant="subtle" className="h-8 min-h-8 px-2 text-ops-danger" onClick={() => removeItem(item.id)} aria-label={`Remove ${item.label || 'checklist item'}`}>Remove</Button></div>)}</div><p className="mt-2 text-xs text-ops-muted">{draft.checklist.filter((item) => item.complete).length} of {draft.checklist.length} complete</p></div><Field label="Notes"><TextArea maxLength={400} value={draft.notes} onChange={(event) => set('notes', event.target.value)} placeholder="Context or inspection instructions" /></Field><Field label="Findings"><TextArea maxLength={600} value={draft.findings} onChange={(event) => set('findings', event.target.value)} placeholder="Observations and follow-up required" /></Field><div className="flex justify-end gap-2"><Button type="button" onClick={onCancel}>Cancel</Button><Button variant="primary" type="submit">Save inspection</Button></div></form>
}

export function InspectionsPage() {
  const data = useAppStore((state) => state.data)!
  const saveInspection = useAppStore((state) => state.saveInspection)
  const selectAsset = useAppStore((state) => state.selectAsset)
  const showToast = useAppStore((state) => state.showToast)
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'all' | InspectionStatus>('all')
  const [editing, setEditing] = useState<Inspection | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [today] = useState(() => new Date().toISOString().slice(0, 10))
  const filtered = useMemo(() => data.inspections.filter((inspection) => {
    const asset = getAsset(data, inspection.assetId)
    return (status === 'all' || inspection.status === status) && (!query.trim() || [inspection.title, inspection.id, inspection.inspector, asset?.name ?? ''].some((item) => item.toLowerCase().includes(query.trim().toLowerCase())))
  }).sort((a, b) => a.dueDate.localeCompare(b.dueDate)), [data, query, status])
  const closeInspection = (inspection: Inspection) => {
    if (inspection.checklist.some((item) => !item.complete)) return
    void saveInspection(markInspectionComplete(inspection))
  }
  const submitInspection = async (inspection: Inspection) => {
    try {
      await saveInspection(inspection)
      setModalOpen(false)
      showToast({ type: 'success', title: editing ? 'Inspection updated' : 'Inspection scheduled', description: inspection.title })
    } catch (error) {
      showToast({ type: 'error', title: 'Inspection not saved', description: error instanceof Error ? error.message : 'Please try again.' })
    }
  }

  return <>
    <PageHeading eyebrow="Safety & compliance records" title="Inspections" actions={<Button variant="primary" onClick={() => { setEditing(null); setModalOpen(true) }}><Plus size={15}/>Schedule inspection</Button>} />
    <div className="mb-4 grid gap-3 sm:grid-cols-3">{[{ label: 'In progress', value: data.inspections.filter((item) => item.status === 'in-progress').length, tone: 'text-ops-accent-text' }, { label: 'Due today or overdue', value: data.inspections.filter((item) => item.dueDate <= today && item.status !== 'completed').length, tone: 'text-ops-warning' }, { label: 'Completed', value: data.inspections.filter((item) => item.status === 'completed').length, tone: 'text-ops-success' }].map((item) => <Card key={item.label} className="flex items-center gap-3 p-4"><span className={`grid h-9 w-9 place-items-center rounded-lg bg-ops-bg ${item.tone}`}><CalendarCheck size={16}/></span><div><p className="text-xs text-ops-muted">{item.label}</p><p className="text-xl font-semibold tabular-nums">{item.value}</p></div></Card>)}</div>
    <Card className="overflow-hidden"><div className="flex flex-col gap-2 border-b border-ops-line p-4 sm:flex-row"><label className="relative flex-1"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ops-muted"/><input aria-label="Search inspections" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search inspection, asset, or inspector" className="h-10 w-full rounded-lg border border-ops-line bg-ops-bg pl-9 pr-3 text-sm placeholder:text-ops-muted focus:border-ops-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ops-accent"/></label><Select aria-label="Filter inspections by status" className="sm:w-48" value={status} onValueChange={(value) => setStatus(value as typeof status)}><option value="all">All inspections</option><option value="draft">Draft</option><option value="in-progress">In progress</option><option value="completed">Completed</option></Select></div>
      {filtered.length ? <div className="grid gap-3 p-4 lg:grid-cols-2">{filtered.map((inspection) => { const asset = getAsset(data, inspection.assetId); const done = inspection.checklist.filter((item) => item.complete).length; const overdue = inspection.dueDate < today && inspection.status !== 'completed'; const canComplete = done === inspection.checklist.length && inspection.status !== 'completed'; return <article key={inspection.id} className="rounded-xl border border-ops-line p-4"><div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-ops-bg text-ops-accent-text"><ClipboardCheck size={16}/></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="text-sm font-semibold">{inspection.title}</h2><Badge tone={inspection.status}>{inspection.status}</Badge>{overdue && <Badge tone="critical">Overdue</Badge>}</div><p className="mt-1 text-xs text-ops-muted">{inspection.id} · {asset?.name ?? 'Site level'} · {inspection.inspector}</p></div></div><div className="mt-4"><div className="flex justify-between text-xs"><span className="text-ops-muted">Checklist</span><span className="tabular-nums">{done}/{inspection.checklist.length}</span></div><div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ops-bg"><div className="h-full rounded-full bg-blue-400" style={{ width: `${inspection.checklist.length ? done / inspection.checklist.length * 100 : 0}%` }}/></div></div>{inspection.findings && <p className="mt-3 rounded-lg bg-ops-warning-bg/50 p-2.5 text-xs leading-5 text-ops-muted"><span className="font-medium text-ops-warning">Finding · </span>{inspection.findings}</p>}<div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-ops-line pt-3"><span className="text-xs text-ops-muted">Due {dateLabel(inspection.dueDate)}</span><div className="flex gap-1">{asset && <Button variant="subtle" className="h-8 min-h-8" onClick={() => { selectAsset(asset.id, true); navigate('/site') }}><Crosshair size={13}/>Focus</Button>}<Button variant="subtle" className="h-8 min-h-8" onClick={() => { setEditing(inspection); setModalOpen(true) }}><Edit3 size={13}/>Edit</Button>{canComplete && <Button className="h-8 min-h-8 text-ops-success" variant="subtle" onClick={() => closeInspection(inspection)} disabled={done !== inspection.checklist.length}><Check size={14}/>Complete</Button>}</div></div></article> })}</div> : <div className="p-5"><EmptyState title="No inspections found" detail={query || status !== 'all' ? 'Adjust your search or status filter.' : 'Schedule an inspection to start a checklist.'} action={!data.inspections.length && <Button variant="primary" onClick={() => setModalOpen(true)}><Plus size={14}/>Schedule inspection</Button>} /></div>}
    </Card>
    <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? `Edit ${editing.id}` : 'Schedule inspection'} size="max-w-2xl"><InspectionForm inspection={editing ?? blankInspection()} onCancel={() => setModalOpen(false)} onSave={submitInspection}/></Modal>
  </>
}
