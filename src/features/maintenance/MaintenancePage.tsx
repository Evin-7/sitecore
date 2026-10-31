import { useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { CalendarClock, Check, ClipboardList, Crosshair, Edit3, Plus, Search, Trash2, Wrench } from 'lucide-react'
import { Badge, Button, Card, EmptyState, Field, Modal, PageHeading, Select, TextArea, TextInput } from '../../components/ui'
import { MaintenanceTaskSchema } from '../../lib/schemas'
import { dateLabel, getAsset } from '../../lib/format'
import { useAppStore } from '../../stores/app-store'
import type { MaintenanceTask, WorkPriority, WorkStatus } from '../../types/operations'

const priorities: WorkPriority[] = ['critical', 'high', 'normal', 'low']
const workStatuses: WorkStatus[] = ['scheduled', 'in-progress', 'completed', 'cancelled']

function setWorkOrderStatus(task: MaintenanceTask, status: WorkStatus): MaintenanceTask {
  return { ...task, status, completedAt: status === 'completed' ? new Date().toISOString() : null }
}

function WorkOrderForm({ task, onCancel, onSave }: { task: MaintenanceTask | null; onCancel: () => void; onSave: (task: MaintenanceTask) => Promise<void> }) {
  const data = useAppStore((state) => state.data)!
  const [draft, setDraft] = useState<MaintenanceTask>(() => task ?? { id: `WO-${Date.now().toString(36).toUpperCase()}`, title: '', assetId: null, priority: 'normal', status: 'scheduled', dueDate: new Date().toISOString().slice(0, 10), assignee: '', notes: '', createdAt: new Date().toISOString(), completedAt: null })
  const [error, setError] = useState('')
  const set = <K extends keyof MaintenanceTask>(key: K, value: MaintenanceTask[K]) => setDraft((current) => ({ ...current, [key]: value }))
  const submit = (event: FormEvent) => {
    event.preventDefault()
    const parsed = MaintenanceTaskSchema.safeParse(draft)
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? 'Check the work order.'); return }
    void onSave(parsed.data as MaintenanceTask)
  }
  return <form onSubmit={submit} className="grid gap-4">{error && <p role="alert" className="text-xs text-ops-danger">{error}</p>}<Field label="Work order title"><TextInput required value={draft.title} maxLength={100} onChange={(event) => set('title', event.target.value)} placeholder="Inspect transfer pump assembly" /></Field><div className="grid gap-3 sm:grid-cols-2"><Field label="Related asset"><Select value={draft.assetId ?? ''} onValueChange={(value) => set('assetId', value || null)}><option value="">Site-level work</option>{data.assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.name} · {asset.id}</option>)}</Select></Field><Field label="Priority"><Select value={draft.priority} onValueChange={(value) => set('priority', value as WorkPriority)}>{priorities.map((value) => <option key={value} value={value}>{value}</option>)}</Select></Field></div><div className="grid gap-3 sm:grid-cols-2"><Field label="Due date"><TextInput type="date" required value={draft.dueDate} onChange={(event) => set('dueDate', event.target.value)} /></Field><Field label="Assigned technician"><TextInput required maxLength={80} value={draft.assignee} onChange={(event) => set('assignee', event.target.value)} placeholder="Technician name" /></Field></div><Field label="Status"><Select value={draft.status} onValueChange={(value) => { const status = value as WorkStatus; setDraft((current) => setWorkOrderStatus(current, status)) }}>{workStatuses.map((value) => <option key={value} value={value}>{value}</option>)}</Select></Field><Field label="Work notes"><TextArea maxLength={400} value={draft.notes} onChange={(event) => set('notes', event.target.value)} placeholder="Scope, checks, and materials" /></Field><div className="flex justify-end gap-2"><Button type="button" onClick={onCancel}>Cancel</Button><Button variant="primary" type="submit">Save work order</Button></div></form>
}

export function MaintenancePage() {
  const data = useAppStore((state) => state.data)!
  const saveMaintenance = useAppStore((state) => state.saveMaintenance)
  const deleteMaintenance = useAppStore((state) => state.deleteMaintenance)
  const selectAsset = useAppStore((state) => state.selectAsset)
  const showToast = useAppStore((state) => state.showToast)
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | WorkStatus>('all')
  const [editing, setEditing] = useState<MaintenanceTask | null>(null)
  const [modal, setModal] = useState<'create' | 'edit' | 'delete' | null>(null)
  const [today] = useState(() => new Date().toISOString().slice(0, 10))
  const tasks = useMemo(() => [...data.maintenanceTasks].filter((task) => {
    const asset = getAsset(data, task.assetId)
    return (filter === 'all' || task.status === filter) && (!query.trim() || [task.title, task.id, task.assignee, asset?.name ?? ''].some((item) => item.toLowerCase().includes(query.toLowerCase().trim())))
  }).sort((a, b) => a.dueDate.localeCompare(b.dueDate)), [data, filter, query])
  const complete = (task: MaintenanceTask) => void saveMaintenance(setWorkOrderStatus(task, 'completed'))
  const submitWorkOrder = async (task: MaintenanceTask) => {
    try {
      await saveMaintenance(task)
      setModal(null)
      showToast({ type: 'success', title: editing ? 'Work order updated' : 'Work order created', description: task.title })
    } catch (error) {
      showToast({ type: 'error', title: 'Work order not saved', description: error instanceof Error ? error.message : 'Please try again.' })
    }
  }
  const removeWorkOrder = async () => {
    if (!editing) return
    try {
      await deleteMaintenance(editing.id)
      setModal(null)
      showToast({ type: 'success', title: 'Work order deleted', description: editing.title })
    } catch (error) {
      showToast({ type: 'error', title: 'Work order not deleted', description: error instanceof Error ? error.message : 'Please try again.' })
    }
  }

  return <>
    <PageHeading eyebrow="Service schedule & work orders" title="Maintenance center" actions={<Button variant="primary" onClick={() => { setEditing(null); setModal('create') }}><Plus size={15}/>Create work order</Button>} />
    <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[
      { label: 'Open work orders', value: data.maintenanceTasks.filter((task) => task.status === 'scheduled' || task.status === 'in-progress').length, icon: ClipboardList, color: 'text-ops-accent-text' },
      { label: 'Due today', value: data.maintenanceTasks.filter((task) => task.dueDate === today && task.status !== 'completed' && task.status !== 'cancelled').length, icon: CalendarClock, color: 'text-ops-warning' },
      { label: 'Overdue', value: data.maintenanceTasks.filter((task) => task.dueDate < today && task.status !== 'completed' && task.status !== 'cancelled').length, icon: Wrench, color: 'text-ops-danger' },
      { label: 'Completed', value: data.maintenanceTasks.filter((task) => task.status === 'completed').length, icon: Check, color: 'text-ops-success' },
    ].map(({ label, value, icon: Icon, color }) => <Card key={label} className="flex items-center gap-3 p-4"><span className={`grid h-9 w-9 place-items-center rounded-lg bg-ops-bg ${color}`}><Icon size={16}/></span><div><p className="text-xs text-ops-muted">{label}</p><p className="text-xl font-semibold tabular-nums">{value}</p></div></Card>)}</div>
    <Card className="overflow-hidden"><div className="flex flex-col gap-3 border-b border-ops-line p-4 sm:flex-row sm:items-center"><label className="relative flex-1"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ops-muted"/><input aria-label="Search work orders" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search work order, asset, or technician" className="h-10 w-full rounded-lg border border-ops-line bg-ops-bg pl-9 pr-3 text-sm placeholder:text-ops-muted focus:border-ops-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ops-accent"/></label><Select aria-label="Filter work orders by status" value={filter} onValueChange={(value) => setFilter(value as typeof filter)} className="sm:w-48"><option value="all">All work orders</option>{workStatuses.map((status) => <option value={status} key={status}>{status}</option>)}</Select><span className="text-xs text-ops-muted">{tasks.length} records</span></div>
      {tasks.length ? <div className="divide-y divide-ops-line">{tasks.map((task) => { const asset = getAsset(data, task.assetId); const overdue = task.dueDate < today && task.status !== 'completed' && task.status !== 'cancelled'; return <div key={task.id} className="grid gap-3 p-4 transition-colors hover:bg-ops-bg/45 lg:grid-cols-[minmax(0,1fr)_140px_150px_160px]"><div className="flex min-w-0 items-start gap-3"><span className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg ${overdue ? 'bg-ops-danger-bg text-ops-danger' : 'bg-ops-bg text-ops-muted'}`}><Wrench size={16}/></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-medium">{task.title}</p><Badge tone={task.priority === 'normal' ? 'idle' : task.priority}>{task.priority}</Badge>{overdue && <Badge tone="critical">Overdue</Badge>}</div><p className="mt-1 text-xs text-ops-muted">{task.id} · {asset ? `${asset.name} · ${asset.id}` : 'Site-level work'}</p><p className="mt-1 text-xs text-ops-muted">{task.notes || 'No work notes'}</p></div></div><div><p className="text-xs uppercase tracking-wide text-ops-muted">Due date</p><p className={`mt-1 text-xs font-medium ${overdue ? 'text-ops-danger' : ''}`}>{dateLabel(task.dueDate)}</p><p className="mt-1 text-xs text-ops-muted">Assigned to {task.assignee}</p></div><div><Badge tone={task.status}>{task.status}</Badge>{task.completedAt && <p className="mt-1 text-xs text-ops-muted">Closed {dateLabel(task.completedAt)}</p>}</div><div className="flex flex-wrap items-center gap-1 lg:justify-end">{asset && <Button variant="subtle" className="h-8 min-h-8 w-8 p-0" title="Focus related asset" aria-label={`Focus ${asset.name}`} onClick={() => { selectAsset(asset.id, true); navigate('/site') }}><Crosshair size={14}/></Button>}<Button variant="subtle" className="h-8 min-h-8 w-8 p-0" aria-label={`Edit ${task.id}`} title="Edit work order" onClick={() => { setEditing(task); setModal('edit') }}><Edit3 size={14}/></Button>{task.status !== 'completed' && task.status !== 'cancelled' && <Button variant="subtle" className="h-8 min-h-8 w-8 p-0 text-ops-success" aria-label={`Complete ${task.id}`} title="Mark complete" onClick={() => complete(task)}><Check size={15}/></Button>}<Button variant="subtle" className="h-8 min-h-8 w-8 p-0 text-ops-danger" aria-label={`Delete ${task.id}`} title="Delete work order" onClick={() => { setEditing(task); setModal('delete') }}><Trash2 size={14}/></Button></div></div> })}</div> : <div className="p-5"><EmptyState title="No work orders match" detail={query ? 'Try another search term or status filter.' : 'Create a work order to start planning maintenance.'} action={!data.maintenanceTasks.length && <Button variant="primary" onClick={() => setModal('create')}><Plus size={14}/>Create work order</Button>} /></div>}
    </Card>
    <Modal open={modal === 'create' || modal === 'edit'} onClose={() => setModal(null)} title={editing ? `Edit ${editing.id}` : 'Create work order'}><WorkOrderForm task={modal === 'edit' ? editing : null} onCancel={() => setModal(null)} onSave={submitWorkOrder}/></Modal>
    <Modal open={modal === 'delete'} onClose={() => setModal(null)} title="Delete work order" footer={<><Button onClick={() => setModal(null)}>Cancel</Button><Button variant="danger" onClick={() => void removeWorkOrder()}>Delete work order</Button></>}><p className="text-sm leading-6 text-ops-muted">Delete <span className="font-medium text-ops-text">{editing?.title}</span> from the maintenance schedule? This action cannot be undone.</p></Modal>
  </>
}
