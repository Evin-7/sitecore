import { Activity, ArrowRight, ArrowUpRight, Boxes, Building2, ShieldCheck, Truck } from 'lucide-react'
import { Link } from 'react-router'
import { SITE_NAME } from '../../data/site-data'
import { useAppStore } from '../../stores/app-store'

function SitePreview({ assetName, assetStatus, assetLocation }: { assetName: string; assetStatus: string; assetLocation: string }) {
  return <div className="relative isolate aspect-[1.32] overflow-hidden rounded-[22px] border border-white/10 bg-[#10171d] shadow-[0_32px_100px_-45px_rgba(0,0,0,.8)]">
    <svg viewBox="0 0 800 560" role="img" aria-label="Illustrated industrial site with warehouses, roads, and vehicles" className="absolute inset-0 h-full w-full">
      <defs>
        <linearGradient id="sitecore-preview-bg" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#18232b"/><stop offset="1" stopColor="#0d1217"/></linearGradient>
        <linearGradient id="sitecore-preview-roof" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#8999a2"/><stop offset="1" stopColor="#51616a"/></linearGradient>
        <linearGradient id="sitecore-preview-wall" x1="0" y1="0" x2="0.9" y2="1"><stop stopColor="#34434b"/><stop offset="1" stopColor="#202c33"/></linearGradient>
        <pattern id="sitecore-preview-grid" width="28" height="28" patternUnits="userSpaceOnUse" patternTransform="skewY(-28)"><path d="M 28 0 L 0 0 0 28" fill="none" stroke="#91a0a9" strokeOpacity=".06" strokeWidth="1"/></pattern>
        <filter id="sitecore-preview-shadow" x="-30%" y="-30%" width="170%" height="180%"><feDropShadow dx="0" dy="13" stdDeviation="12" floodColor="#000" floodOpacity=".48"/></filter>
      </defs>
      <rect width="800" height="560" fill="url(#sitecore-preview-bg)"/>
      <path d="M0 210 402 18 800 217 398 442Z" fill="url(#sitecore-preview-grid)"/>
      <path d="M56 337 398 145 748 323 405 520Z" fill="#1b252b" stroke="#45535a" strokeOpacity=".65"/>
      <path d="m72 354 334-190 321 163" fill="none" stroke="#7b8b91" strokeOpacity=".24" strokeWidth="1.5"/>
      <path d="M45 348 405 151 760 329" fill="none" stroke="#11181d" strokeWidth="36"/>
      <path d="M45 348 405 151 760 329" fill="none" stroke="#75858a" strokeOpacity=".55" strokeWidth="1.3" strokeDasharray="9 11"/>
      <path d="m169 408 146-83m188-109 122 61M114 310l96 48m323-184 108 54" fill="none" stroke="#69787e" strokeOpacity=".4" strokeWidth="2"/>
      <g filter="url(#sitecore-preview-shadow)">
        <path d="m251 182 145-82 151 77-145 84Z" fill="url(#sitecore-preview-roof)" stroke="#a4b1b4" strokeOpacity=".4"/>
        <path d="m251 182 151 79v100l-151-80Z" fill="#27363d" stroke="#56636a" strokeOpacity=".55"/>
        <path d="m402 261 145-84v98l-145 86Z" fill="url(#sitecore-preview-wall)" stroke="#58666c" strokeOpacity=".55"/>
        <path d="m279 197 121 63v72l-121-64Z" fill="#192329" stroke="#819097" strokeOpacity=".45"/>
        <path d="m298 208 13 7v48l-13-7Zm30 16 13 7v48l-13-7Zm30 16 13 7v48l-13-7Zm30 16 13 7v48l-13-7Z" fill="#596970" opacity=".75"/>
        <path d="m274 183 120-68 125 64-120 70Z" fill="none" stroke="#d1d9d8" strokeOpacity=".25"/>
      </g>
      <g filter="url(#sitecore-preview-shadow)">
        <path d="m489 323 83-47 96 48-83 48Z" fill="#788890" stroke="#aeb9bb" strokeOpacity=".32"/>
        <path d="m489 323 96 49v52l-96-49Z" fill="#34424a"/>
        <path d="m585 372 83-48v52l-83 48Z" fill="#25323a"/>
        <path d="m505 325 78-44m-66 53 78-45m-66 55 78-45m-66 55 78-45" stroke="#b4c0c1" strokeOpacity=".28"/>
      </g>
      <g>
        <path d="m125 287 62-36 72 37-62 36Z" fill="#697981"/><path d="m125 287 72 37v48l-72-37Z" fill="#35434a"/><path d="m197 324 62-36v48l-62 36Z" fill="#26343a"/>
        <path d="m136 292 61 31 50-29" fill="none" stroke="#a8b5b7" strokeOpacity=".35"/>
        <path d="m615 246 33-19 38 19-33 20Z" fill="#4373a8"/><path d="m615 246 38 20v17l-38-19Z" fill="#274b72"/><path d="m653 266 33-20v17l-33 20Z" fill="#203a53"/>
      </g>
      <g>
        <path d="m341 394 29-16 44 22-29 17Z" fill="#80a4c6"/><path d="m341 394 44 23v17l-44-23Z" fill="#426783"/><path d="m385 417 29-17v17l-29 17Z" fill="#304958"/><circle cx="355" cy="435" r="5" fill="#10161a"/><circle cx="399" cy="438" r="5" fill="#10161a"/>
        <path d="m469 289 25-14 38 20-25 14Z" fill="#caa35e"/><path d="m469 289 38 20v15l-38-20Z" fill="#866b3c"/><path d="m507 309 25-14v15l-25 14Z" fill="#67532f"/><circle cx="480" cy="324" r="4.5" fill="#10161a"/><circle cx="517" cy="326" r="4.5" fill="#10161a"/>
      </g>
      <g fill="none" stroke="#61717a" strokeWidth="2" opacity=".7"><path d="m102 397 72 37m444-270 65 33m-491 59 22 12m424 193 51-29"/><path d="m95 388 4 18m33-1 4 18m481-234 3 17m36 2 3 17m50 140 3 16"/></g>
      <g><circle cx="532" cy="231" r="14" fill="#12202a" stroke="#6ca5ff" strokeWidth="2"/><circle cx="532" cy="231" r="4" fill="#8ab7ff"/><circle cx="385" cy="409" r="14" fill="#12202a" stroke="#34d399" strokeWidth="2"/><circle cx="385" cy="409" r="4" fill="#6ee7b7"/></g>
      <path d="m0 468 123-70m550 78 127-70" stroke="#6ca5ff" strokeOpacity=".08" strokeWidth="80"/>
    </svg>
    <div className="absolute inset-x-0 top-0 flex items-center justify-between border-b border-white/10 bg-[#111920]/80 px-4 py-3 backdrop-blur sm:px-5">
      <div className="flex items-center gap-2.5"><span className="grid h-7 w-7 place-items-center rounded-md bg-blue-500/15 text-blue-300"><Building2 size={15}/></span><div><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-white/50">Site model</p><p className="text-xs font-medium text-white">Northline · Site 04</p></div></div>
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/15 bg-emerald-300/[.08] px-2.5 py-1 text-[10px] font-medium text-emerald-200"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400"/>CONNECTED</span>
    </div>
    <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-lg border border-white/10 bg-[#111920]/85 px-3 py-2 text-[11px] text-white/75 backdrop-blur sm:bottom-5 sm:left-5"><Activity size={13} className="text-blue-300"/>Shared workspace updates in real time</div>
    <div className="absolute right-4 top-[72px] hidden max-w-[190px] rounded-lg border border-white/10 bg-[#111920]/85 p-3 shadow-xl backdrop-blur sm:block"><div className="flex items-center gap-2 text-[11px] font-medium text-white/80"><span className={`h-2 w-2 shrink-0 rounded-full ${assetStatus === 'operational' || assetStatus === 'active' ? 'bg-emerald-400' : assetStatus === 'offline' ? 'bg-rose-400' : 'bg-amber-400'}`}/><span className="truncate">{assetName}</span></div><p className="mt-1.5 truncate pl-4 text-[10px] capitalize text-white/45">{assetStatus.replace('-', ' ')} · {assetLocation}</p></div>
  </div>
}

export function HomePage() {
  const data = useAppStore((state) => state.data)!
  const theme = useAppStore((state) => state.data?.settings.theme ?? 'dark')
  const operationalAssets = data.assets.filter((asset) => asset.status === 'operational' || asset.status === 'active').length
  const activeAlerts = data.incidents.filter((incident) => incident.status !== 'resolved').length
  const previewAsset = data.assets.find((asset) => asset.kind === 'vehicle' && (asset.status === 'operational' || asset.status === 'active')) ?? data.assets.find((asset) => asset.kind === 'vehicle') ?? data.assets[0]

  const metrics = [
    { label: 'Site assets', value: data.assets.length, icon: Boxes },
    { label: 'Operational', value: operationalAssets, icon: Activity },
    { label: 'Open alerts', value: activeAlerts, icon: ShieldCheck },
    { label: 'Zones', value: data.zones.length, icon: Building2 },
  ]

  return <div className="relative min-h-dvh overflow-hidden bg-ops-bg text-ops-text">
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[560px] bg-[radial-gradient(ellipse_at_70%_5%,rgba(58,111,177,.16),transparent_55%)]"/>
    <header className="relative z-10 mx-auto flex h-[82px] max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-12">
      <Link to="/" aria-label="SiteCore home" className="inline-flex rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ops-accent"><img src={theme === 'dark' ? '/sitecore-logo-dark.png' : '/sitecore-logo-light.png'} alt="SiteCore" className="h-11 w-36 object-contain object-left"/></Link>
      <div className="flex items-center gap-3 sm:gap-5"><span className="hidden items-center gap-2 text-xs text-ops-muted sm:flex"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400"/>Public workspace</span><Link to="/dashboard" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-ops-line bg-ops-panel px-3.5 text-sm font-medium text-ops-text transition hover:border-ops-accent/50 hover:bg-ops-panel/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ops-accent">Enter workspace<ArrowUpRight size={15}/></Link></div>
    </header>

    <main className="relative mx-auto max-w-[1440px] px-5 pb-10 pt-7 sm:px-8 sm:pt-12 lg:px-12 lg:pt-[72px]">
      <section className="grid items-center gap-12 lg:grid-cols-[.92fr_1.08fr] lg:gap-14 xl:gap-[88px]">
        <div className="max-w-[570px]">
          <div className="mb-6 inline-flex items-center gap-2.5 rounded-full border border-ops-line bg-ops-panel/75 px-3 py-1.5 text-[11px] font-medium tracking-[.08em] text-ops-muted"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400"/>{SITE_NAME.toUpperCase()}<span className="text-ops-line">/</span>PUBLIC DEMO</div>
          <h1 className="max-w-[620px] text-[clamp(3rem,6vw,5.25rem)] font-semibold leading-[.99] tracking-[-.055em] text-ops-text">Operations,<br/><span className="text-ops-accent-text">brought into focus.</span></h1>
          <p className="mt-6 max-w-[475px] text-base leading-7 text-ops-muted sm:text-lg sm:leading-8">Explore a connected 3D site model, operational assets, and incident activity in one shared workspace.</p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link to="/dashboard" className="group inline-flex min-h-12 items-center gap-3 rounded-lg bg-ops-primary px-5 text-sm font-semibold text-white shadow-[0_10px_28px_-13px_rgba(37,99,235,.85)] transition hover:-translate-y-0.5 hover:bg-ops-primary-hover focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-ops-accent">Enter SiteCore<ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5"/></Link>
            <Link to="/site" className="inline-flex min-h-12 items-center gap-2 rounded-lg px-4 text-sm font-medium text-ops-muted transition hover:bg-ops-panel hover:text-ops-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ops-accent">Open 3D viewer<ArrowUpRight size={15}/></Link>
          </div>
          <div className="mt-5 flex items-center gap-2 text-xs text-ops-muted"><ShieldCheck size={14} className="text-ops-success"/>No login required<span className="text-ops-line">·</span>shared public demo</div>

          <div className="mt-12 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-ops-line/80 pt-6 sm:grid-cols-4 lg:mt-[68px]">
            {metrics.map(({ label, value, icon: Icon }) => <div key={label} className="flex items-start gap-2.5"><Icon size={15} className="mt-1 shrink-0 text-ops-accent-text"/><div><p className="text-xl font-semibold tabular-nums tracking-tight">{value}</p><p className="mt-0.5 text-[11px] text-ops-muted">{label}</p></div></div>)}
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[720px] lg:mx-0 lg:max-w-none">
          <div aria-hidden="true" className="absolute -inset-8 -z-10 rounded-full bg-blue-500/[.07] blur-3xl"/>
          <SitePreview assetName={previewAsset?.name ?? 'Site asset'} assetStatus={previewAsset?.status ?? 'idle'} assetLocation={previewAsset?.location ?? 'Unassigned'} />
          <div className="mt-3 flex items-center justify-between gap-3 px-1 text-[10px] uppercase tracking-[.14em] text-ops-muted/80"><span>Operational site overview</span><span className="flex items-center gap-2"><span className="h-px w-7 bg-ops-line"/>SITECORE FIELD SYSTEMS</span></div>
        </div>
      </section>

      <section aria-label="Workspace capabilities" className="mt-14 grid divide-y divide-ops-line border-y border-ops-line sm:mt-20 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {[
          { icon: Building2, title: 'See the whole site', text: 'Explore facilities and operational zones in 3D.' },
          { icon: Truck, title: 'Track every asset', text: 'Inspect status, location, and maintenance records.' },
          { icon: Activity, title: 'Stay in sync', text: 'Shared workspace changes update across visitors.' },
        ].map(({ icon: Icon, title, text }) => <div key={title} className="flex items-start gap-4 py-5 sm:px-5 sm:py-6 first:sm:pl-0 last:sm:pr-0"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-ops-line bg-ops-panel text-ops-accent-text"><Icon size={16}/></span><div><h2 className="text-sm font-medium">{title}</h2><p className="mt-1 text-xs leading-5 text-ops-muted">{text}</p></div></div>)}
      </section>
    </main>

    <footer className="relative mx-auto flex max-w-[1440px] flex-col gap-3 px-5 py-6 text-[11px] text-ops-muted sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12"><span>© {new Date().getFullYear()} SiteCore · Northline Materials Terminal</span><span>Public demo workspace · Records are shared with all visitors</span></footer>
  </div>
}
