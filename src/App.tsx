import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity, AlertTriangle, ArrowDownUp, Bell, Box, Building2, ChevronRight,
  CircleHelp, Clock3, Crosshair, Focus, Layers3, MapPinned, Moon, RotateCcw,
  Search, ShieldCheck, Sun, Truck, Wifi, X,
} from 'lucide-react'
import { AssetInspector } from './components/AssetInspector'
import { MetricCard } from './components/MetricCard'
import { SiteScene } from './components/SiteScene'
import { BASE_ASSETS, SITE_CODE, SITE_NAME, STATUS_LABELS } from './data/site-data'
import { useOperationsSimulation } from './hooks/useOperationsSimulation'
import type { AssetStatus, DashboardView, InspectionMode, LayerKey, LayerState, SiteAsset } from './types/operations'
import './App.css'

const INITIAL_LAYERS: LayerState = {
  buildings: true,
  roads: true,
  mobile: true,
  infrastructure: true,
  zones: true,
  labels: false,
}

const LAYER_OPTIONS: { key: LayerKey; label: string; count?: string }[] = [
  { key: 'buildings', label: 'Buildings', count: '03' },
  { key: 'roads', label: 'Road network' },
  { key: 'mobile', label: 'Vehicles & equipment', count: '03' },
  { key: 'infrastructure', label: 'Infrastructure', count: '04' },
  { key: 'zones', label: 'Operational zones', count: '04' },
  { key: 'labels', label: 'Asset identifiers' },
]

const FILTER_STATUSES: ('all' | AssetStatus)[] = ['all', 'operational', 'active', 'attention', 'maintenance', 'offline', 'standby']
type ThemeMode = 'dark' | 'light'

function assetIcon(kind: SiteAsset['kind']) {
  if (kind === 'vehicle') return Truck
  if (kind === 'warehouse' || kind === 'process-hall') return Building2
  return Box
}

function AssetRow({ asset, selected, onClick }: { asset: SiteAsset; selected: boolean; onClick: () => void }) {
  const Icon = assetIcon(asset.kind)
  return (
    <button type="button" className={`asset-row ${selected ? 'asset-row--selected' : ''}`} onClick={onClick} aria-pressed={selected}>
      <span className="asset-row-icon"><Icon size={15} strokeWidth={1.75} /></span>
      <span className="asset-row-copy"><span className="asset-row-name">{asset.name}</span><span className="asset-row-meta">{asset.id} <i /> {asset.typeLabel}</span></span>
      <span className={`mini-status mini-status--${asset.status}`} title={STATUS_LABELS[asset.status]} aria-label={STATUS_LABELS[asset.status]} />
    </button>
  )
}

function LayerToggle({ label, count, checked, onChange }: { label: string; count?: string; checked: boolean; onChange: () => void }) {
  return (
    <button type="button" className="layer-toggle" role="switch" aria-checked={checked} onClick={onChange}>
      <span className="layer-toggle-label">{label}{count && <small>{count}</small>}</span>
      <span className={`switch-track ${checked ? 'switch-track--on' : ''}`}><span /></span>
    </button>
  )
}

function App() {
  const { assets, alerts, cycle, cycleIndex, cycleCount } = useOperationsSimulation()
  const [theme, setTheme] = useState<ThemeMode>(() => window.localStorage.getItem('sitecore-theme') === 'light' ? 'light' : 'dark')
  const [view, setView] = useState<DashboardView>('overview')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | AssetStatus>('all')
  const [layers, setLayers] = useState<LayerState>(INITIAL_LAYERS)
  const [selectedId, setSelectedId] = useState<string | null>('BLD-02')
  const [mode, setMode] = useState<InspectionMode>('overview')
  const [resetKey, setResetKey] = useState(0)
  const [focusRequest, setFocusRequest] = useState<{ assetId: string; key: number; position: [number, number]; distance: number } | null>(null)
  const [helpOpen, setHelpOpen] = useState(false)
  const focusSequence = useRef(0)
  const searchInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    window.localStorage.setItem('sitecore-theme', theme)
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#fdfdff' : '#191b20')
  }, [theme])

  const selectedAsset = assets.find((asset) => asset.id === selectedId)
  const availableCount = assets.filter((asset) => !['offline', 'maintenance'].includes(asset.status)).length
  const filteredAssets = useMemo(() => {
    const normalizedQuery = search.trim().toLowerCase()
    return assets.filter((asset) => {
      const matchesQuery = !normalizedQuery || `${asset.name} ${asset.id} ${asset.typeLabel} ${asset.location}`.toLowerCase().includes(normalizedQuery)
      const matchesStatus = statusFilter === 'all' || asset.status === statusFilter
      return matchesQuery && matchesStatus
    })
  }, [assets, search, statusFilter])

  const requestFocus = useCallback((assetId: string) => {
    const asset = BASE_ASSETS.find((candidate) => candidate.id === assetId)
    if (!asset) return
    focusSequence.current += 1
    const distance = asset.kind === 'vehicle' || asset.kind === 'sensor' ? 10 : asset.footprint ? Math.max(...asset.footprint) * 1.45 : 14
    setFocusRequest({ assetId, key: focusSequence.current, position: asset.position, distance })
  }, [])

  const setSelectedAsset = useCallback((assetId: string | null) => {
    setSelectedId(assetId || null)
    if (assetId && mode === 'inspection') requestFocus(assetId)
  }, [mode, requestFocus])

  const toggleLayer = useCallback((key: LayerKey) => {
    setLayers((current) => ({ ...current, [key]: !current[key] }))
  }, [])

  const selectAlert = useCallback((assetId: string) => {
    setSearch('')
    setStatusFilter('all')
    setSelectedAsset(assetId)
    setView('assets')
  }, [setSelectedAsset])

  const switchMode = useCallback((next: InspectionMode) => {
    setMode(next)
    if (next === 'inspection' && selectedId) requestFocus(selectedId)
    if (next === 'overview') setResetKey((current) => current + 1)
  }, [requestFocus, selectedId])

  const resetCamera = useCallback(() => {
    setMode('overview')
    setFocusRequest(null)
    setResetKey((current) => current + 1)
  }, [])

  const focusSelected = useCallback((assetId: string) => {
    setSelectedId(assetId)
    requestFocus(assetId)
  }, [requestFocus])

  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        searchInput.current?.focus()
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'f' && selectedId) {
        event.preventDefault()
        focusSelected(selectedId)
      }
      if (event.key === 'Escape') {
        setHelpOpen(false)
        if (mode === 'inspection') switchMode('overview')
      }
    }
    window.addEventListener('keydown', onShortcut)
    return () => window.removeEventListener('keydown', onShortcut)
  }, [focusSelected, mode, selectedId, switchMode])

  const renderAssetList = () => (
    <div className="asset-list" aria-label="Assets">
      {filteredAssets.length ? filteredAssets.map((asset) => <AssetRow key={asset.id} asset={asset} selected={asset.id === selectedId} onClick={() => setSelectedAsset(asset.id)} />) : (
        <div className="list-empty"><Search size={16} /><span>No assets match those filters.</span><button type="button" onClick={() => { setSearch(''); setStatusFilter('all') }}>Clear filters</button></div>
      )}
    </div>
  )

  const renderAlerts = () => alerts.length ? alerts.map((alert) => {
    const asset = assets.find((candidate) => candidate.id === alert.assetId)
    return (
      <button type="button" key={alert.id} className="alert-row" onClick={() => selectAlert(alert.assetId)}>
        <span className={`alert-mark alert-mark--${alert.severity}`}><AlertTriangle size={14} /></span>
        <span className="alert-row-copy"><strong>{alert.title}</strong><span>{alert.id} · {asset?.id} · {alert.time}</span></span>
        <ChevronRight size={14} className="alert-chevron" />
      </button>
    )
  }) : <div className="all-clear"><ShieldCheck size={18} /><span>All monitored conditions are clear in this replay cycle.</span></div>

  return (
    <div className="app-shell" data-theme={theme}>
      <header className="topbar">
        <a className="brand-lockup" href="#top" aria-label="SiteCore Operations Site Viewer home">
          <span className="brand-logo" aria-hidden="true" />
          <span className="brand-divider" />
          <span className="brand-product">OPERATIONS SITE VIEWER</span>
        </a>
        <div className="topbar-right">
          <span className="demo-badge"><i /> LOCAL SIMULATION</span>
          <span className="topbar-divider" />
          <span className="shift-label"><Clock3 size={14} /> {cycle.label}</span>
          <button
            className="theme-toggle"
            type="button"
            onClick={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            aria-pressed={theme === 'light'}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button className={`help-button ${helpOpen ? 'help-button--active' : ''}`} type="button" onClick={() => setHelpOpen((open) => !open)} aria-expanded={helpOpen} aria-controls="camera-help">
            <CircleHelp size={17} />
          </button>
          {helpOpen && <div className="help-popover" id="camera-help" role="dialog" aria-label="3D camera controls"><strong>VIEW CONTROLS</strong><span>Drag to orbit</span><span>Right drag or two-finger drag to pan</span><span>Scroll or pinch to zoom</span><span>⌘ / Ctrl + F focuses selected asset</span><button type="button" onClick={() => setHelpOpen(false)}>Got it</button></div>}
        </div>
      </header>

      <main className="page-content">
        <div className="page-heading" id="top">
          <div className="heading-copy">
            <div className="breadcrumb"><span>FACILITIES</span><ChevronRight size={13} /><span>{SITE_CODE}</span></div>
            <h1>{SITE_NAME}</h1>
            <p>Spatial overview <span /> Site model revision 04 · All times local</p>
          </div>
          <div className={`site-status ${alerts.length ? 'site-status--attention' : ''}`}><span className="site-status-icon"><Activity size={16} /></span><span><strong>{alerts.length ? 'Attention required' : 'Operational'}</strong><small>Simulated state feed</small></span></div>
        </div>

        <section className="metrics-grid" aria-label="Site overview statistics">
          <MetricCard label="Available assets" value={`${availableCount} / ${assets.length}`} detail="Across all site sectors" icon={Box} onClick={() => setView('assets')} active={view === 'assets'} />
          <MetricCard label="Active alerts" value={String(alerts.length).padStart(2, '0')} detail="Requires operator review" icon={Bell} tone={alerts.length ? 'warning' : 'neutral'} onClick={() => setView('alerts')} active={view === 'alerts'} />
          <MetricCard label="Operational zones" value="04" detail="Site areas monitored" icon={MapPinned} onClick={() => toggleLayer('zones')} active={layers.zones} />
        </section>

        <section className="dashboard-grid" aria-label="Interactive site dashboard">
          <aside className="sidebar-panel">
            <div className="panel-title-row"><div><p className="eyebrow">WORKSPACE</p><h2>Site console</h2></div><span className="connection-mark" title="Local simulation"><Wifi size={14} /></span></div>

            <nav className="side-nav" aria-label="Site views">
              <button type="button" onClick={() => setView('overview')} className={view === 'overview' ? 'side-nav-item side-nav-item--active' : 'side-nav-item'} aria-current={view === 'overview' ? 'page' : undefined}><Activity size={15} />Overview<span>01</span></button>
              <button type="button" onClick={() => setView('assets')} className={view === 'assets' ? 'side-nav-item side-nav-item--active' : 'side-nav-item'} aria-current={view === 'assets' ? 'page' : undefined}><Box size={15} />Assets<span>{String(assets.length).padStart(2, '0')}</span></button>
              <button type="button" onClick={() => setView('alerts')} className={view === 'alerts' ? 'side-nav-item side-nav-item--active' : 'side-nav-item'} aria-current={view === 'alerts' ? 'page' : undefined}><Bell size={15} />Alerts<span className={alerts.length ? 'nav-count nav-count--alert' : ''}>{String(alerts.length).padStart(2, '0')}</span></button>
            </nav>

            <div className="sidebar-separator" />

            <div className="sidebar-scroll">
              <label className="search-field">
                <Search size={15} />
                <input ref={searchInput} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find an asset…" aria-label="Search assets by name, ID, type, or location" />
                {search && <button type="button" onClick={() => setSearch('')} aria-label="Clear search"><X size={13} /></button>}
                {!search && <kbd>⌘ K</kbd>}
              </label>

              {view !== 'alerts' && <div className="filter-row"><span>STATUS</span><label className="select-wrap"><ArrowDownUp size={12} /><select value={statusFilter} aria-label="Filter assets by status" onChange={(event) => setStatusFilter(event.target.value as 'all' | AssetStatus)}>{FILTER_STATUSES.map((status) => <option key={status} value={status}>{status === 'all' ? 'All statuses' : STATUS_LABELS[status]}</option>)}</select></label></div>}

              {view === 'overview' && search.trim() === '' && statusFilter === 'all' && <>
                <div className="sidebar-section-heading"><span><Layers3 size={14} />Scene layers</span><small>{Object.values(layers).filter(Boolean).length} visible</small></div>
                <div className="layer-list">{LAYER_OPTIONS.map(({ key, label, count }) => <LayerToggle key={key} label={label} count={count} checked={layers[key]} onChange={() => toggleLayer(key)} />)}</div>
                <div className="sidebar-section-heading alerts-heading"><span><AlertTriangle size={14} />Priority alerts</span><button type="button" onClick={() => setView('alerts')}>View all</button></div>
                <div className="sidebar-alerts">{renderAlerts()}</div>
              </>}

              {(view === 'assets' || (view === 'overview' && (search.trim() !== '' || statusFilter !== 'all'))) && <>
                <div className="sidebar-section-heading asset-list-heading"><span><Box size={14} />Asset register</span><small>{filteredAssets.length} results</small></div>
                {renderAssetList()}
              </>}

              {view === 'alerts' && <>
                <div className="sidebar-section-heading alert-list-heading"><span><Bell size={14} />Open alerts</span><small>{alerts.length} open</small></div>
                <div className="alerts-list">{renderAlerts()}</div>
                <p className="alert-footnote">Alerts shown here are generated from the current local replay cycle.</p>
              </>}
            </div>

            <div className="sidebar-footer"><span className="avatar-dot">N</span><span><strong>North district</strong><small>{assets.length} registered assets</small></span><span className="footer-privacy">LOCAL</span></div>
          </aside>

          <section className="viewport-panel" aria-label="Three-dimensional site viewport">
            <div className="viewport-toolbar">
              <div className="viewport-title"><span className="viewport-status-dot" /><div><strong>Site model</strong><small>REV 04 <i /> 3D VIEW</small></div></div>
              <div className="viewport-tools">
                <div className="mode-switch" role="group" aria-label="Camera mode">
                  <button type="button" className={mode === 'overview' ? 'mode-button mode-button--active' : 'mode-button'} onClick={() => switchMode('overview')} aria-pressed={mode === 'overview'}><MapPinned size={13} />Overview</button>
                  <button type="button" className={mode === 'inspection' ? 'mode-button mode-button--active' : 'mode-button'} onClick={() => switchMode('inspection')} aria-pressed={mode === 'inspection'}><Focus size={13} />Inspect</button>
                </div>
                <span className="viewport-toolbar-divider" />
                <button type="button" className="icon-button reset-button" onClick={resetCamera} aria-label="Reset camera view" title="Reset camera view"><RotateCcw size={15} /></button>
              </div>
            </div>

            <div className="scene-wrap" role="region" aria-label="3D site model. Drag to rotate, right drag or two-finger drag to pan, and scroll to zoom.">
              <SiteScene assets={assets} selectedId={selectedId} layers={layers} resetKey={resetKey} focusRequest={focusRequest} onSelect={setSelectedAsset} />
              <div className="scene-overlay scene-overlay--top-left"><span>SECTOR C</span><span><i />MODEL READY</span></div>
              <div className="scene-overlay scene-overlay--top-right"><Crosshair size={13} /> PERSPECTIVE VIEW</div>
              <div className="scene-legend"><span className="legend-heading">STATUS KEY</span><span><i className="legend-dot legend-dot--operational" />Operational</span><span><i className="legend-dot legend-dot--attention" />Attention</span><span><i className="legend-dot legend-dot--offline" />Offline</span></div>
              <div className="scene-help"><span className="mouse-glyph">↔</span>Drag to orbit <i /> Scroll to zoom <i /> Right drag to pan</div>
              {mode === 'inspection' && <div className="inspection-indicator"><Focus size={13} /> INSPECTION MODE</div>}
              <div className="scene-scale" aria-hidden="true"><span /><small>10 m</small></div>
            </div>

            <div className="viewport-footer"><span><span className="footer-coordinate">LOCAL GRID · 1 M UNITS</span></span><span>MODEL REV 04 <i /> {cycle.label} <i /> CYCLE {cycleIndex + 1}/{cycleCount}</span></div>
          </section>

          <AssetInspector asset={selectedAsset} onFocus={focusSelected} />
        </section>

        <footer className="app-footer"><span>OPERATIONS SITE VIEWER <i /> DEMONSTRATION BUILD</span><span><span className="footer-update-dot" /> Status replay advances every 16 seconds <i /> {cycle.time} local</span></footer>
      </main>
    </div>
  )
}

export default App
