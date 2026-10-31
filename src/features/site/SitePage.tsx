import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Activity, AlertTriangle, ArrowLeft, Box, Crosshair, Edit3, Expand, Layers3, LocateFixed, MapPinned, Minimize2, Moon, PanelRightClose, PanelRightOpen, RotateCcw, Search, Sun, X } from 'lucide-react'
import { SiteScene } from '../../components/SiteScene'
import { Badge, Button, SectionTitle, Select } from '../../components/ui'
import { formatDimensions, formatLength, getZoneName } from '../../lib/format'
import { SITE_NAME } from '../../data/site-data'
import { useAppStore } from '../../stores/app-store'
import { STATUS_LABELS } from '../../types/operations'
import type { SceneLayers, SceneView } from '../../types/operations'

const layerNames: { key: keyof SceneLayers; label: string }[] = [
  { key: 'buildings', label: 'Buildings' }, { key: 'roads', label: 'Road network' }, { key: 'mobile', label: 'Vehicles & mobile assets' },
  { key: 'infrastructure', label: 'Site infrastructure' }, { key: 'zones', label: 'Operational zones' }, { key: 'labels', label: 'Asset identifiers' },
]
const views: { value: SceneView; label: string }[] = [{ value: 'perspective', label: 'Perspective' }, { value: 'isometric', label: 'Isometric' }, { value: 'top-down', label: 'Top-down' }]

function initialInspectorOpen() {
  return typeof window === 'undefined' || typeof window.matchMedia !== 'function' || window.matchMedia('(min-width: 1024px)').matches
}

export function SitePage() {
  const data = useAppStore((state) => state.data)!
  const layers = useAppStore((state) => state.layers)
  const selectedAssetId = useAppStore((state) => state.selectedAssetId)
  const selectedZoneId = useAppStore((state) => state.selectedZoneId)
  const resetKey = useAppStore((state) => state.cameraResetKey)
  const focusRequest = useAppStore((state) => state.focusRequest)
  const selectAsset = useAppStore((state) => state.selectAsset)
  const selectZone = useAppStore((state) => state.selectZone)
  const toggleLayer = useAppStore((state) => state.toggleLayer)
  const resetCamera = useAppStore((state) => state.resetCamera)
  const updateSettings = useAppStore((state) => state.updateSettings)
  const navigate = useNavigate()
  const selectedAsset = data.assets.find((asset) => asset.id === selectedAssetId) ?? null
  const selectedZone = data.zones.find((zone) => zone.id === selectedZoneId) ?? null
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [fullscreenError, setFullscreenError] = useState<string | null>(null)
  const [inspectorOpen, setInspectorOpen] = useState(initialInspectorOpen)
  const [sceneMode, setSceneMode] = useState<'overview' | 'inspection'>('overview')
  const [panelTab, setPanelTab] = useState<'record' | 'layers' | 'zones'>('record')
  const viewerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const view = data.settings.defaultCamera
  const matches = useMemo(() => query.trim() ? data.assets.filter((asset) => `${asset.name} ${asset.id} ${asset.location}`.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 5) : [], [data.assets, query])
  const activeIncidents = useMemo(() => selectedAsset ? data.incidents.filter((incident) => incident.assetId === selectedAsset.id && incident.status !== 'resolved').sort((a, b) => b.createdAt.localeCompare(a.createdAt)) : [], [data.incidents, selectedAsset])
  const maintenanceHistory = useMemo(() => selectedAsset ? data.maintenanceTasks.filter((task) => task.assetId === selectedAsset.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 3) : [], [data.maintenanceTasks, selectedAsset])

  useEffect(() => {
    const sync = () => setFullscreen(document.fullscreenElement === viewerRef.current)
    document.addEventListener('fullscreenchange', sync)
    return () => document.removeEventListener('fullscreenchange', sync)
  }, [])

  const toggleFullscreen = useCallback(async () => {
    const viewer = viewerRef.current
    if (!viewer) return
    try {
      if (document.fullscreenElement === viewer) await document.exitFullscreen()
      else if (!document.fullscreenElement) await viewer.requestFullscreen()
      setFullscreenError(null)
    } catch {
      setFullscreenError('Full screen is unavailable in this browser. The viewer remains usable in this window.')
    }
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSearchOpen(false)
        setInspectorOpen(false)
        if (document.fullscreenElement === viewerRef.current) void document.exitFullscreen()
        return
      }
      const target = event.target
      const editingText = target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
      if (editingText) return
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        inputRef.current?.focus()
      } else if (event.key.toLowerCase() === 'f') {
        event.preventDefault()
        void toggleFullscreen()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [toggleFullscreen])

  const focusAsset = (id: string) => {
    setSceneMode('inspection')
    setPanelTab('record')
    setInspectorOpen(true)
    selectAsset(id, true)
    setQuery('')
    setSearchOpen(false)
  }
  const showOverview = () => {
    setSceneMode('overview')
    selectAsset(null)
    selectZone(null)
    void updateSettings({ defaultCamera: 'isometric' })
    resetCamera()
  }
  const showInspection = () => { if (selectedAsset) focusAsset(selectedAsset.id) }
  const showPanel = (tab: 'record' | 'layers' | 'zones') => {
    setPanelTab(tab)
    setInspectorOpen(true)
  }

  return <div ref={viewerRef} className="flex h-full min-h-0 flex-col overflow-hidden bg-ops-bg">
    <header className="z-30 shrink-0 border-b border-ops-line bg-ops-panel">
      <div className="flex min-h-[62px] flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2 sm:px-4 xl:flex-nowrap">
        <div className="flex min-w-0 items-center gap-2.5">
          <img src={data.settings.theme === 'dark' ? '/sitecore-logo-dark.png' : '/sitecore-logo-light.png'} alt="SiteCore" className="h-9 w-28 shrink-0 object-contain object-left" />
          <span className="hidden h-8 w-px bg-ops-line sm:block" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{SITE_NAME}</p>
            {data.simulation.running && <div className="mt-0.5 flex items-center gap-1.5 text-xs text-ops-muted"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ops-warning" />Simulation running</div>}
          </div>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1.5 xl:order-3">
          <Link to="/dashboard" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-ops-line px-2.5 text-xs font-medium text-ops-text transition-colors hover:bg-ops-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ops-accent sm:px-3 sm:text-sm"><ArrowLeft size={15} /><span>Dashboard</span></Link>
          <Button variant="subtle" className="h-9 min-h-9 w-9 p-0" onClick={() => void updateSettings({ theme: data.settings.theme === 'light' ? 'dark' : 'light' })} aria-label={`Switch to ${data.settings.theme === 'light' ? 'dark' : 'light'} theme`} title={`Switch to ${data.settings.theme === 'light' ? 'dark' : 'light'} theme`}>{data.settings.theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}</Button>
          <Button variant="subtle" className="h-9 min-h-9 w-9 p-0" onClick={() => setInspectorOpen((open) => !open)} aria-expanded={inspectorOpen} aria-controls="site-inspector" aria-label={inspectorOpen ? 'Hide inspector' : 'Show inspector'} title={inspectorOpen ? 'Hide inspector' : 'Show inspector'}>{inspectorOpen ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}</Button>
          <Button variant="subtle" className="h-9 min-h-9 w-9 p-0" onClick={() => void toggleFullscreen()} aria-label={fullscreen ? 'Exit full screen' : 'Enter full screen'} title={fullscreen ? 'Exit full screen (F)' : 'Enter full screen (F)'}>{fullscreen ? <Minimize2 size={16} /> : <Expand size={16} />}</Button>
        </div>

        <div className="order-3 flex w-full min-w-0 flex-wrap items-center gap-2 xl:order-2 xl:w-auto xl:flex-1">
          <div className="relative min-w-[180px] flex-1 xl:max-w-[260px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ops-muted" />
            <input ref={inputRef} value={query} onFocus={() => setSearchOpen(true)} onChange={(event) => { setQuery(event.target.value); setSearchOpen(true) }} onKeyDown={(event) => { if (event.key === 'Escape') { event.stopPropagation(); setQuery(''); setSearchOpen(false) } if (event.key === 'Enter' && matches[0]) focusAsset(matches[0].id) }} placeholder="Find an asset to focus" aria-label="Search site assets" aria-expanded={searchOpen && matches.length > 0} aria-controls="site-asset-search-results" className="h-9 w-full rounded-lg border border-ops-line bg-ops-bg pl-9 pr-8 text-sm text-ops-text placeholder:text-ops-muted focus:border-ops-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ops-accent" />
            {query && <button type="button" onClick={() => { setQuery(''); setSearchOpen(false); inputRef.current?.focus() }} aria-label="Clear asset search" className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-ops-muted hover:text-ops-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ops-accent"><X size={14} /></button>}
            {searchOpen && matches.length > 0 && <div id="site-asset-search-results" role="listbox" aria-label="Matching site assets" className="absolute inset-x-0 top-full z-40 mt-1 overflow-hidden rounded-lg border border-ops-line bg-ops-panel shadow-xl">{matches.map((asset) => <button key={asset.id} type="button" role="option" aria-selected={asset.id === selectedAssetId} className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-ops-bg focus-visible:bg-ops-bg focus-visible:outline-2 focus-visible:outline-ops-accent" onClick={() => focusAsset(asset.id)}><Box size={14} className="text-ops-muted" /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{asset.name}</span><span className="text-xs text-ops-muted">{asset.id} · {asset.location}</span></span></button>)}</div>}
          </div>

          <div role="group" aria-label="Scene mode" className="inline-flex shrink-0 rounded-lg border border-ops-line bg-ops-bg p-0.5">
            <button type="button" aria-pressed={sceneMode === 'overview'} onClick={showOverview} className={`inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ops-accent ${sceneMode === 'overview' ? 'bg-ops-accent-bg text-ops-accent-text' : 'text-ops-muted hover:text-ops-text'}`}><Layers3 size={13} />Overview</button>
            <button type="button" aria-pressed={sceneMode === 'inspection' && Boolean(selectedAsset)} disabled={!selectedAsset} onClick={showInspection} className={`inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:bg-transparent disabled:text-ops-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ops-accent ${sceneMode === 'inspection' && selectedAsset ? 'bg-ops-accent-bg text-ops-accent-text' : 'text-ops-muted hover:text-ops-text'}`}><Crosshair size={13} />Inspect</button>
          </div>

          <Select id="camera-view" aria-label="Camera view" startIcon={<LocateFixed size={14} />} value={view} onValueChange={(value) => void updateSettings({ defaultCamera: value as SceneView })} className="h-9 min-h-9 w-[164px] min-w-[164px] max-w-[164px] shrink-0 gap-2 px-2.5 text-[11px]">{views.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</Select>
          <Button variant="secondary" className="h-9 min-h-9 w-9 shrink-0 p-0" title="Reset camera" aria-label="Reset camera" onClick={resetCamera}><RotateCcw size={15} /></Button>
          <Button variant="secondary" className={`h-9 min-h-9 shrink-0 px-2.5 text-xs ${panelTab === 'layers' && inspectorOpen ? 'border-ops-accent/50 bg-ops-accent-bg text-ops-accent-text' : ''}`} onClick={() => showPanel('layers')} aria-pressed={panelTab === 'layers' && inspectorOpen}><Layers3 size={14} /><span className="hidden sm:inline">Layers</span></Button>
          <Button variant="secondary" className={`h-9 min-h-9 shrink-0 px-2.5 text-xs ${panelTab === 'zones' && inspectorOpen ? 'border-ops-accent/50 bg-ops-accent-bg text-ops-accent-text' : ''}`} onClick={() => showPanel('zones')} aria-pressed={panelTab === 'zones' && inspectorOpen}><MapPinned size={14} /><span className="hidden sm:inline">Zones</span></Button>
        </div>
      </div>
    </header>

    <main className="relative flex min-h-0 min-w-0 flex-1">
      <div className="relative min-h-0 min-w-0 flex-1 bg-[#151b20]">
        <SiteScene assets={data.assets} selectedId={selectedAssetId} selectedZoneId={selectedZoneId} zones={data.zones} layers={layers} resetKey={resetKey} focusRequest={focusRequest} view={view} quality={data.settings.sceneQuality} onSelect={(id) => { if (id) { setSceneMode('inspection'); setPanelTab('record'); setInspectorOpen(true) } selectAsset(id || null) }} onSelectZone={(id) => { if (id) { setSceneMode('inspection'); setPanelTab('record'); setInspectorOpen(true) } selectZone(id) }} />
        {selectedAsset && <div className="absolute left-3 top-3 max-w-[calc(100%-24px)] rounded-lg border border-white/10 bg-[#10161c]/95 p-3 shadow-lg sm:left-4 sm:top-4"><div className="flex items-start gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-white/5 text-blue-200"><Box size={15} /></span><div className="min-w-0"><p className="truncate text-sm font-semibold text-white">{selectedAsset.name}</p><p className="mt-0.5 text-xs text-white/75">{selectedAsset.id} · {selectedAsset.typeLabel}</p></div><Badge tone={selectedAsset.status} className="ml-2 shrink-0">{STATUS_LABELS[selectedAsset.status]}</Badge><button type="button" onClick={() => selectAsset(null)} aria-label="Clear selected asset" className="ml-1 rounded text-white/70 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"><X size={13} /></button></div></div>}
        <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-white/10 bg-[#10161c]/90 px-3 py-2 text-xs text-white/90 shadow-lg sm:bottom-4 sm:left-4 sm:right-auto sm:gap-x-5 sm:px-4"><span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-400" />Operational</span><span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-amber-400" />Attention</span><span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-rose-400" />Offline</span><span className="hidden text-white/70 md:inline">Orbit · pan · zoom</span></div>
        {fullscreenError && <div role="alert" className="absolute right-3 top-3 max-w-xs rounded-lg border border-white/15 bg-[#10161c]/95 px-3 py-2 text-xs text-white shadow-lg">{fullscreenError}</div>}
      </div>

      {inspectorOpen && <aside id="site-inspector" aria-label="Site inspector" className="absolute inset-x-2 bottom-2 z-20 flex max-h-[46%] min-h-0 flex-col overflow-hidden rounded-xl border border-ops-line bg-ops-panel shadow-2xl md:inset-y-2 md:left-auto md:right-2 md:w-[360px] md:max-h-none lg:static lg:inset-auto lg:z-auto lg:w-[340px] lg:shrink-0 lg:rounded-none lg:border-y-0 lg:border-r-0 lg:border-l lg:shadow-none xl:w-[360px]">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-ops-line px-4 py-3"><h2 className="text-sm font-semibold">Site inspector</h2><button type="button" className="rounded-md p-1.5 text-ops-muted hover:bg-ops-bg hover:text-ops-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ops-accent lg:hidden" onClick={() => setInspectorOpen(false)} aria-label="Close inspector"><X size={16} /></button></div>
        <div role="tablist" aria-label="Inspector panels" className="grid shrink-0 grid-cols-3 gap-1 border-b border-ops-line p-2">
          {([{ key: 'record', label: 'Inspector' }, { key: 'layers', label: 'Layers' }, { key: 'zones', label: 'Zones' }] as const).map(({ key, label }) => <button key={key} id={`site-tab-${key}`} type="button" role="tab" aria-selected={panelTab === key} aria-controls={`site-panel-${key}`} onClick={() => setPanelTab(key)} className={`min-h-9 rounded-md px-2 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ops-accent ${panelTab === key ? 'bg-ops-accent-bg text-ops-accent-text' : 'text-ops-muted hover:bg-ops-bg hover:text-ops-text'}`}>{label}</button>)}
        </div>

        <div id="site-panel-record" role="tabpanel" aria-labelledby="site-tab-record" hidden={panelTab !== 'record'} className="min-h-0 flex-1 overflow-y-auto p-4">
          <SectionTitle title="Selected record" />
          {selectedAsset ? <div>
            <div className="flex items-start gap-2"><div className="min-w-0 flex-1"><p className="text-base font-semibold">{selectedAsset.name}</p><p className="mt-1 text-sm text-ops-muted">{selectedAsset.id} · {selectedAsset.typeLabel}</p></div><Activity size={17} className="mt-1 shrink-0 text-ops-muted" /></div>
            <div className="mt-3 flex flex-wrap gap-2"><Badge tone={selectedAsset.status}>{STATUS_LABELS[selectedAsset.status]}</Badge><Badge tone="idle">{selectedAsset.utilization}% utilised</Badge></div>
            <dl className="mt-4 grid gap-3 border-t border-ops-line pt-4 text-xs">
              <div><dt className="text-ops-muted">Zone</dt><dd className="mt-1 font-medium">{getZoneName(data, selectedAsset.zoneId)}</dd></div>
              <div><dt className="text-ops-muted">Location</dt><dd className="mt-1 font-medium">{selectedAsset.location}</dd></div>
              {selectedAsset.footprint && <div><dt className="text-ops-muted">Footprint</dt><dd className="mt-1 font-medium">{formatDimensions(selectedAsset.footprint, data.settings.units)}{selectedAsset.height ? ` · ${formatLength(selectedAsset.height, data.settings.units)} high` : ''}</dd></div>}
              <div><dt className="text-ops-muted">Asset details</dt><dd className="mt-1 leading-5">{selectedAsset.detail}</dd></div>
            </dl>
            <div className="mt-4 rounded-lg border border-ops-line bg-ops-bg/60 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-semibold text-ops-text">Recorded telemetry</p><p className="text-xs text-ops-muted">{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(selectedAsset.telemetryUpdatedAt ?? selectedAsset.createdAt))}</p></div><p className="mt-2 text-sm leading-5 text-ops-text">{selectedAsset.telemetry.split(' · ').map((reading, index) => <span key={`${reading}-${index}`} className="mr-2 inline-flex rounded-md border border-ops-line bg-ops-panel px-2 py-1 text-xs text-ops-text">{reading}</span>)}</p><p className="mt-2 text-xs text-ops-muted">Operator-entered or simulated · no live equipment connection</p></div>
            <div className="mt-4 border-t border-ops-line pt-3"><div className="flex items-center justify-between gap-2"><p className="text-xs font-semibold uppercase tracking-[.1em] text-ops-muted">Active alerts</p><Link to="/alerts" className="text-xs font-medium text-ops-accent-text hover:text-ops-accent-strong">Alert history</Link></div>
              {activeIncidents.length ? <div className="mt-2 space-y-2">{activeIncidents.slice(0, 3).map((incident) => <Link key={incident.id} to="/alerts" className="flex items-start gap-2 rounded-lg border border-ops-line p-2.5 transition-colors hover:bg-ops-bg"><AlertTriangle size={14} className="mt-0.5 shrink-0 text-ops-warning" /><span className="min-w-0 flex-1"><span className="block text-xs font-medium leading-4">{incident.title}</span><span className="mt-1 block text-xs text-ops-muted">{incident.id} · {incident.status}</span></span><Badge tone={incident.severity}>{incident.severity}</Badge></Link>)}</div> : <p className="mt-2 text-sm text-ops-muted">No active alerts linked to this asset.</p>}
            </div>
            <div className="mt-4 border-t border-ops-line pt-3"><p className="text-xs font-semibold uppercase tracking-[.1em] text-ops-muted">Maintenance history</p>
              {maintenanceHistory.length ? <div className="mt-2 space-y-2">{maintenanceHistory.map((task) => <div key={task.id} className="flex items-start justify-between gap-3 text-sm"><span className="min-w-0"><span className="block truncate font-medium">{task.title}</span><span className="mt-1 block text-xs text-ops-muted">{task.id} · due {task.dueDate}</span></span><Badge tone={task.status}>{task.status}</Badge></div>)}</div> : <p className="mt-2 text-sm text-ops-muted">No work orders are linked to this asset.</p>}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2"><Button className="col-span-2 min-h-10" onClick={() => focusAsset(selectedAsset.id)}><Crosshair size={14} />Focus in 3D</Button><Button className="min-h-9 text-xs" onClick={() => navigate('/assets', { state: { editAssetId: selectedAsset.id } })}><Edit3 size={14} />Edit asset</Button><Link to="/assets" className="inline-flex min-h-9 items-center justify-center rounded-lg border border-ops-line px-3 text-xs font-medium hover:bg-ops-bg">Asset register</Link></div>
          </div> : selectedZone ? <div>
            <p className="text-base font-semibold">{selectedZone.name}</p><p className="mt-1 text-xs text-ops-muted">{selectedZone.code} · {selectedZone.capacity} planned positions</p><p className="mt-3 text-xs leading-5 text-ops-muted">{selectedZone.description}</p>
            <div className="mt-4 border-t border-ops-line pt-3"><p className="text-xs font-semibold uppercase tracking-[.12em] text-ops-muted">Assets in zone</p><div className="mt-2 space-y-1">{data.assets.filter((asset) => asset.zoneId === selectedZone.id).map((asset) => <button key={asset.id} type="button" onClick={() => focusAsset(asset.id)} className="flex w-full items-center justify-between gap-3 rounded-md px-2 py-2 text-left text-xs hover:bg-ops-bg"><span className="truncate">{asset.name}</span><Badge tone={asset.status}>{STATUS_LABELS[asset.status]}</Badge></button>)}</div></div>
          </div> : <div className="grid min-h-28 place-items-center rounded-lg border border-dashed border-ops-line p-4"><p className="text-sm font-medium text-ops-muted">No record selected</p></div>}
        </div>

        <div id="site-panel-layers" role="tabpanel" aria-labelledby="site-tab-layers" hidden={panelTab !== 'layers'} className="min-h-0 flex-1 overflow-y-auto p-4"><SectionTitle title="Scene layers" detail={`${Object.values(layers).filter(Boolean).length} of 6 visible`} action={<Layers3 size={15} className="text-ops-muted" />} /><div className="space-y-1">{layerNames.map(({ key, label }) => <button key={key} type="button" role="switch" aria-checked={layers[key]} onClick={() => toggleLayer(key)} className="flex min-h-10 w-full items-center justify-between rounded-md px-2 text-sm text-ops-muted hover:bg-ops-bg hover:text-ops-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ops-accent"><span>{label}</span><span className={`relative h-4 w-7 rounded-full transition-colors ${layers[key] ? 'bg-blue-600' : 'bg-ops-line'}`}><span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-transform ${layers[key] ? 'left-3.5' : 'left-0.5'}`} /></span></button>)}</div></div>

        <div id="site-panel-zones" role="tabpanel" aria-labelledby="site-tab-zones" hidden={panelTab !== 'zones'} className="min-h-0 flex-1 overflow-y-auto p-4"><SectionTitle title="Operational zones" /><div className="grid grid-cols-2 gap-2">{data.zones.map((zone) => { const count = data.assets.filter((asset) => asset.zoneId === zone.id).length; const active = selectedZone?.id === zone.id; return <button key={zone.id} type="button" onClick={() => { selectZone(zone.id); setPanelTab('record'); setSceneMode('inspection') }} aria-pressed={active} className={`rounded-lg border p-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ops-accent ${active ? 'border-ops-accent/45 bg-ops-accent-bg' : 'border-ops-line hover:bg-ops-bg'}`}><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: zone.color }} /><span className="truncate text-xs font-medium">{zone.name}</span></span><span className="mt-1.5 block pl-4 text-xs text-ops-muted">{count} assets · {zone.code}</span></button> })}</div></div>
      </aside>}
    </main>
  </div>
}
