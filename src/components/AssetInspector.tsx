import { Activity, ArrowUpRight, Box, CalendarDays, MapPin, Radio, ScanLine, Truck, Warehouse } from 'lucide-react'
import { STATUS_LABELS } from '../data/site-data'
import type { SiteAsset } from '../types/operations'

interface AssetInspectorProps {
  asset: SiteAsset | undefined
  onFocus: (assetId: string) => void
}

const assetIcon = (kind: SiteAsset['kind']) => {
  if (kind === 'vehicle') return Truck
  if (kind === 'warehouse' || kind === 'process-hall') return Warehouse
  if (kind === 'sensor') return Radio
  return Box
}

export function AssetInspector({ asset, onFocus }: AssetInspectorProps) {
  if (!asset) {
    return (
      <aside className="inspector-panel empty-inspector" aria-label="Asset inspector">
        <div className="inspector-heading"><div><p className="eyebrow">INSPECTOR</p><h2>Asset details</h2></div></div>
        <div className="empty-state">
          <span className="empty-state-icon"><ScanLine size={19} /></span>
          <strong>Select an asset</strong>
          <p>Choose a site object or an item from the asset list to inspect its status and telemetry.</p>
        </div>
      </aside>
    )
  }

  const Icon = assetIcon(asset.kind)

  return (
    <aside className="inspector-panel" aria-label="Asset inspector" aria-live="polite">
      <div className="inspector-heading">
        <div><p className="eyebrow">ASSET INSPECTOR</p><h2>Asset details</h2></div>
        <button className="icon-button inspector-focus" type="button" onClick={() => onFocus(asset.id)} aria-label={`Focus camera on ${asset.name}`} title="Focus camera">
          <ScanLine size={16} />
        </button>
      </div>

      <div className="asset-identity">
        <span className="asset-type-icon"><Icon size={18} strokeWidth={1.7} /></span>
        <div className="asset-identity-copy"><span>{asset.id}</span><h3>{asset.name}</h3><p>{asset.typeLabel}</p></div>
      </div>

      <div className={`status-banner status-banner--${asset.status}`}>
        <span className="status-dot" />
        <span>{STATUS_LABELS[asset.status]}</span>
        <span className="status-banner-note">Current state</span>
      </div>

      <div className="inspector-section">
        <p className="section-caption">LOCATION &amp; DESCRIPTION</p>
        <div className="detail-row"><MapPin size={15} /><span>{asset.location}</span></div>
        <p className="asset-description">{asset.detail}</p>
      </div>

      <div className="inspector-section telemetry-section">
        <p className="section-caption">LATEST TELEMETRY <span className="telemetry-live"><i /> SIMULATED</span></p>
        <div className="telemetry-reading"><Activity size={16} /><span>{asset.telemetry}</span><ArrowUpRight size={14} className="telemetry-arrow" /></div>
        <div className="signal-line" aria-hidden="true"><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /></div>
      </div>

      <div className="inspector-section last-service">
        <p className="section-caption">MAINTENANCE</p>
        <div className="detail-row"><CalendarDays size={15} /><span>Last service <strong>{asset.lastService}</strong></span></div>
      </div>

      <button className="focus-asset-button" type="button" onClick={() => onFocus(asset.id)}>
        <ScanLine size={15} /> Focus in 3D <span>⌘ F</span>
      </button>
    </aside>
  )
}
