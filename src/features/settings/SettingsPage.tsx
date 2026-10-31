import { useRef, useState } from 'react'
import { Download, FileUp, Moon, RotateCcw, Sun, Trash2 } from 'lucide-react'
import { Badge, Button, Card, Field, Modal, PageHeading, SectionTitle, Select } from '../../components/ui'
import { useAppStore } from '../../stores/app-store'
import type { SceneQuality, SceneView } from '../../types/operations'

function downloadJson(value: unknown) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `sitecore-workspace-${new Date().toISOString().slice(0, 10)}.json`
  link.click()
  URL.revokeObjectURL(url)
}

export function SettingsPage() {
  const data = useAppStore((state) => state.data)!
  const updateSettings = useAppStore((state) => state.updateSettings)
  const exportData = useAppStore((state) => state.exportData)
  const importData = useAppStore((state) => state.importData)
  const resetAllData = useAppStore((state) => state.resetAllData)
  const setError = useAppStore((state) => state.setError)
  const input = useRef<HTMLInputElement>(null)
  const [resetOpen, setResetOpen] = useState(false)
  const [importing, setImporting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const settings = data.settings

  const importFile = async (file?: File) => {
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setError('Import file is larger than 5 MB.'); return }
    setImporting(true)
    try {
      const parsed: unknown = JSON.parse(await file.text())
      await importData(parsed)
      setMessage('Workspace data imported and validated successfully.')
      window.setTimeout(() => setMessage(null), 5000)
    } catch (error) {
      setError(error instanceof Error ? `Import failed: ${error.message}` : 'Import failed. Check the selected JSON file.')
    } finally {
      setImporting(false)
      if (input.current) input.current.value = ''
    }
  }

  return <>
    <PageHeading eyebrow="Shared demo configuration" title="Site settings" actions={<Badge tone="idle">Shared live data</Badge>} />
    {message && <p role="status" className="mb-4 rounded-lg border border-ops-success/20 bg-ops-success-bg/50 px-4 py-3 text-sm text-ops-success">{message}</p>}
    <div className="grid gap-4 xl:grid-cols-2">
      <Card className="p-5"><SectionTitle title="Appearance & viewer"/><div className="divide-y divide-ops-line">
        <div className="flex items-center justify-between gap-4 py-4 first:pt-0"><div><p className="text-sm font-medium">Color theme</p><p className="mt-1 text-xs text-ops-muted">Use the dark or light workspace appearance.</p></div><div className="flex rounded-lg border border-ops-line bg-ops-bg p-1"><button onClick={() => void updateSettings({ theme: 'dark' })} aria-pressed={settings.theme === 'dark'} className={`flex items-center gap-2 rounded-md px-3 py-2 text-xs ${settings.theme === 'dark' ? 'bg-ops-panel text-ops-text shadow-sm' : 'text-ops-muted'}`}><Moon size={14}/>Dark</button><button onClick={() => void updateSettings({ theme: 'light' })} aria-pressed={settings.theme === 'light'} className={`flex items-center gap-2 rounded-md px-3 py-2 text-xs ${settings.theme === 'light' ? 'bg-ops-panel text-ops-text shadow-sm' : 'text-ops-muted'}`}><Sun size={14}/>Light</button></div></div>
        <div className="grid gap-3 py-4 sm:grid-cols-2"><Field label="Default camera view"><Select value={settings.defaultCamera} onValueChange={(value) => void updateSettings({ defaultCamera: value as SceneView })}><option value="perspective">Perspective</option><option value="isometric">Isometric</option><option value="top-down">Top-down</option></Select></Field><Field label="Scene quality"><Select value={settings.sceneQuality} onValueChange={(value) => void updateSettings({ sceneQuality: value as SceneQuality })}><option value="low">Low · reduce GPU load</option><option value="balanced">Balanced</option><option value="high">High · stronger shadows</option></Select></Field></div>
        <div className="grid gap-3 py-4 sm:grid-cols-2"><Field label="Measurement units"><Select value={settings.units} onValueChange={(value) => void updateSettings({ units: value as 'metric' | 'imperial' })}><option value="metric">Metric</option><option value="imperial">Imperial</option></Select></Field><div className="flex items-center justify-between gap-3 rounded-lg border border-ops-line px-3 py-2.5"><div><p className="text-xs font-medium">In-app alerts</p><p className="mt-0.5 text-xs text-ops-muted">New incident notifications</p></div><button role="switch" aria-checked={settings.notificationsEnabled} aria-label="Enable in-app incident notifications" onClick={() => void updateSettings({ notificationsEnabled: !settings.notificationsEnabled })} className={`relative h-5 w-9 rounded-full transition-colors ${settings.notificationsEnabled ? 'bg-blue-500' : 'bg-ops-line'}`}><span className={`absolute top-1 h-3 w-3 rounded-full bg-white transition-transform ${settings.notificationsEnabled ? 'left-5' : 'left-1'}`}/></button></div></div>
      </div></Card>
      <Card className="p-5"><SectionTitle title="Workspace data management"/><div className="space-y-3">
        <div className="flex flex-col gap-3 rounded-lg border border-ops-line p-4 sm:flex-row sm:items-center"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-ops-accent-bg text-ops-accent-text"><Download size={16}/></span><div className="flex-1"><p className="text-sm font-medium">Export workspace</p><p className="mt-1 text-xs text-ops-muted">Download all assets, zones, incidents, work orders, inspections, events, and settings as validated JSON.</p></div><Button onClick={() => { const content = exportData(); if (content) downloadJson(content) }}><Download size={14}/>Export JSON</Button></div>
        <div className="flex flex-col gap-3 rounded-lg border border-ops-line p-4 sm:flex-row sm:items-center"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-ops-success-bg text-ops-success"><FileUp size={16}/></span><div className="flex-1"><p className="text-sm font-medium">Import workspace</p><p className="mt-1 text-xs text-ops-muted">Import a SiteCore JSON backup up to 5 MB. Data is validated before it replaces the current workspace.</p></div><Button disabled={importing} onClick={() => input.current?.click()}><FileUp size={14}/>{importing ? 'Validating…' : 'Choose JSON file'}</Button><input ref={input} className="hidden" type="file" accept="application/json,.json" aria-label="Select SiteCore data JSON" onChange={(event) => void importFile(event.target.files?.[0])}/></div>
        <div className="flex flex-col gap-3 rounded-lg border border-ops-danger/20 bg-ops-danger-bg/25 p-4 sm:flex-row sm:items-center"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-ops-danger-bg text-ops-danger"><Trash2 size={16}/></span><div className="flex-1"><p className="text-sm font-medium">Restore initial workspace</p><p className="mt-1 text-xs text-ops-muted">Replace the public demo records every visitor sees with the original SiteCore data.</p></div><Button variant="danger" onClick={() => setResetOpen(true)}><RotateCcw size={14}/>Reset data</Button></div>
      </div></Card>
      <Card className="p-5 xl:col-span-2"><SectionTitle title="Storage & data scope"/><div className="grid gap-4 md:grid-cols-3"><div><p className="text-xs text-ops-muted">Storage</p><p className="mt-1 text-sm font-medium">Supabase Postgres</p><p className="mt-1 text-xs leading-5 text-ops-muted">Changes sync to every open browser in real time.</p></div><div><p className="text-xs text-ops-muted">Current records</p><p className="mt-1 text-sm font-medium">{data.assets.length} assets · {data.incidents.length} incidents</p><p className="mt-1 text-xs leading-5 text-ops-muted">{data.maintenanceTasks.length} work orders · {data.inspections.length} inspections · {data.events.length} events</p></div><div><p className="text-xs text-ops-muted">External integrations</p><p className="mt-1 text-sm font-medium">None connected</p><p className="mt-1 text-xs leading-5 text-ops-muted">Readings are operator-entered or simulated; no equipment integration is connected.</p></div></div></Card>
    </div>
    <Modal open={resetOpen} onClose={() => setResetOpen(false)} title="Restore initial workspace" footer={<><Button onClick={() => setResetOpen(false)}>Cancel</Button><Button variant="danger" onClick={() => { void resetAllData().then(() => { setResetOpen(false); setMessage('Initial SiteCore workspace restored for everyone.') }) }}>Reset workspace</Button></>}><p className="text-sm leading-6 text-ops-muted">This replaces the shared assets, incidents, work orders, inspections, and settings for every visitor. Recent revisions are kept in the database for recovery.</p></Modal>
  </>
}
