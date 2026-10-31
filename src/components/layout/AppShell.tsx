import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, ScrollRestoration, useLocation } from 'react-router'
import { Activity, AlertTriangle, BarChart3, Bell, Boxes, Building2, CheckCircle2, ClipboardCheck, ClipboardList, Gauge, Menu, Moon, PanelLeftClose, PanelLeftOpen, Settings2, Sun, X } from 'lucide-react'
import { Button } from '../ui'
import { cn } from '../../lib/cn'
import { SITE_NAME } from '../../data/site-data'
import { useAppStore } from '../../stores/app-store'

const links = [
  { to: '/dashboard', label: 'Overview', icon: Gauge, end: true },
  { to: '/site', label: 'Site viewer', icon: Building2 },
  { to: '/assets', label: 'Asset register', icon: Boxes },
  { to: '/operations', label: 'Operations', icon: Activity },
  { to: '/alerts', label: 'Alerts & incidents', icon: Bell, badge: true },
  { to: '/maintenance', label: 'Maintenance', icon: ClipboardList },
  { to: '/inspections', label: 'Inspections', icon: ClipboardCheck },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/reports', label: 'Reports', icon: ClipboardList },
  { to: '/settings', label: 'Settings', icon: Settings2 },
]

const pageTitles: Record<string, string> = {
  '/dashboard': 'Operations overview', '/site': 'Site monitoring', '/assets': 'Asset management', '/operations': 'Operations',
  '/alerts': 'Incident management', '/maintenance': 'Maintenance center', '/inspections': 'Inspections',
  '/analytics': 'Site analytics', '/reports': 'Reports', '/settings': 'Site settings',
}

function Sidebar({ onNavigate, mobile = false, collapsed = false, onToggleCollapse }: { onNavigate?: () => void; mobile?: boolean; collapsed?: boolean; onToggleCollapse?: () => void }) {
  const data = useAppStore((state) => state.data)
  const openAlerts = data?.incidents.filter((item) => item.status !== 'resolved').length ?? 0
  const theme = data?.settings.theme ?? 'dark'
  const compact = collapsed && !mobile
  return <aside className={cn('flex h-full shrink-0 flex-col border-r border-ops-line bg-ops-panel transition-[width] duration-200', mobile ? 'w-full' : compact ? 'w-[84px]' : 'w-[248px]')}>
    <div className={cn('flex h-[68px] shrink-0 items-center border-b border-ops-line', compact ? 'justify-between gap-1 px-2' : 'justify-between px-5')}>
      <NavLink to="/" onClick={onNavigate} aria-label="SiteCore home" className="inline-flex min-w-0 items-center">
        {compact ? <img src="/favicon.svg" alt="SiteCore" className="h-8 w-8 shrink-0 rounded-md" /> : <img src={theme === 'dark' ? '/sitecore-logo-dark.png' : '/sitecore-logo-light.png'} alt="SiteCore" className="h-11 w-36 object-contain object-left" />}
      </NavLink>
      {mobile ? <Button variant="subtle" className="h-8 min-h-8 w-8 p-0" onClick={onNavigate} aria-label="Close navigation"><X size={17} /></Button> : <Button variant="subtle" className="h-8 min-h-8 w-8 shrink-0 p-0" onClick={onToggleCollapse} aria-expanded={!compact} aria-label={compact ? 'Expand sidebar' : 'Collapse sidebar'} title={compact ? 'Expand sidebar' : 'Collapse sidebar'}>{compact ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}</Button>}
    </div>
    <div className={cn('pt-5', compact ? 'px-2' : 'px-4')}>
      {compact ? <div title={`Active site: ${SITE_NAME}`} className="grid h-12 place-items-center rounded-lg border border-ops-line bg-ops-bg text-ops-accent-text"><Building2 size={18}/></div> : <div className="rounded-lg border border-ops-line bg-ops-bg px-3 py-3"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[.14em] text-ops-muted">Active site</p><p className="mt-1.5 text-sm font-semibold text-ops-text">{SITE_NAME}</p></div><span aria-hidden="true" className="h-2 w-2 rounded-full bg-emerald-400 ring-4 ring-ops-success/10" /></div><p className="mt-1 text-xs text-ops-muted">North district · Site 04</p></div>}
    </div>
    <nav aria-label="Main navigation" className={cn('flex-1 space-y-1 overflow-y-auto py-5', compact ? 'px-2' : 'px-3')}>
      {links.map(({ to, label, icon: Icon, end, badge }) => <NavLink key={to} to={to} end={end} onClick={onNavigate} aria-label={label} title={compact ? label : undefined} className={({ isActive }) => cn('group relative flex min-h-10 items-center rounded-lg text-[13px] transition-colors', compact ? 'justify-center px-0' : 'gap-3 px-3', isActive ? 'bg-ops-accent-bg font-medium text-ops-accent-text' : 'text-ops-muted hover:bg-ops-bg hover:text-ops-text')}><Icon size={16} strokeWidth={1.75} /><span className={compact ? 'sr-only' : 'flex-1'}>{label}</span>{badge && openAlerts > 0 && !compact && <span className="rounded-full bg-ops-danger-bg px-2 py-0.5 text-xs font-semibold tabular-nums text-ops-danger">{openAlerts}</span>}{badge && openAlerts > 0 && compact && <span aria-hidden="true" className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-ops-danger-bg px-1 text-[9px] font-semibold leading-none tabular-nums text-ops-danger">{openAlerts}</span>}</NavLink>)}
    </nav>
  </aside>
}

export function AppShell() {
  const location = useLocation()
  const [mobileNav, setMobileNav] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const data = useAppStore((state) => state.data)
  const error = useAppStore((state) => state.error)
  const toast = useAppStore((state) => state.toast)
  const notice = useAppStore((state) => state.notice)
  const setError = useAppStore((state) => state.setError)
  const dismissToast = useAppStore((state) => state.dismissToast)
  const dismissNotice = useAppStore((state) => state.dismissNotice)
  const updateSettings = useAppStore((state) => state.updateSettings)
  const running = data?.simulation.running ?? false
  const title = pageTitles[location.pathname] ?? 'SiteCore'
  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(dismissNotice, 7000)
    return () => window.clearTimeout(timer)
  }, [notice, dismissNotice])
  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => dismissToast(toast.id), 5000)
    return () => window.clearTimeout(timer)
  }, [toast, dismissToast])
  useEffect(() => {
    if (!error) return
    const timer = window.setTimeout(() => setError(null), 7000)
    return () => window.clearTimeout(timer)
  }, [error, setError])
  const visibleToast = toast ?? (error ? { id: 'store-error', type: 'error' as const, title: 'Action could not be saved', description: error } : null)
  return <div className="min-h-dvh bg-ops-bg text-ops-text">
    <div className="fixed inset-y-0 left-0 z-30 hidden lg:block"><Sidebar collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed((collapsed) => !collapsed)} /></div>
    {mobileNav && <div className="fixed inset-0 z-50 lg:hidden"><button aria-label="Close navigation overlay" className="absolute inset-0 bg-black/60" onClick={() => setMobileNav(false)} /><div className="absolute inset-y-0 left-0 shadow-2xl"><Sidebar mobile onNavigate={() => setMobileNav(false)} /></div></div>}
    <div className={cn('min-h-dvh transition-[padding] duration-200', sidebarCollapsed ? 'lg:pl-[84px]' : 'lg:pl-[248px]')}>
      <header className="sticky top-0 z-20 flex h-[68px] items-center justify-between border-b border-ops-line bg-ops-bg/95 px-4 backdrop-blur sm:px-6 lg:px-8"><div className="flex min-w-0 items-center gap-3"><Button variant="subtle" className="h-9 min-h-9 w-9 p-0 lg:hidden" onClick={() => setMobileNav(true)} aria-label="Open navigation"><Menu size={18} /></Button><div className="min-w-0"><div className="flex items-center gap-2 text-xs text-ops-muted"><span>SiteCore</span><span>/</span><span className="truncate text-ops-text">{title}</span></div><h1 className="truncate text-sm font-semibold text-ops-text sm:text-base">{title}</h1></div></div><div className="flex items-center gap-1 sm:gap-2"><span className={cn('hidden items-center gap-2 rounded-full border px-2.5 py-1.5 text-xs sm:inline-flex', running ? 'border-ops-warning/25 bg-ops-warning-bg/50 text-ops-warning' : 'border-ops-line text-ops-muted')}><span className={cn('h-1.5 w-1.5 rounded-full', running ? 'animate-pulse bg-amber-400' : 'bg-ops-success')} />{running ? 'Simulation running' : 'Public shared data'}</span><Button variant="subtle" className="h-9 min-h-9 w-9 p-0" onClick={() => void updateSettings({ theme: data?.settings.theme === 'light' ? 'dark' : 'light' })} aria-label={`Switch to ${data?.settings.theme === 'light' ? 'dark' : 'light'} theme`}>{data?.settings.theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}</Button></div></header>
      <main className="mx-auto w-full max-w-[1640px] p-4 sm:p-6 lg:p-8"><Outlet /></main>
    </div>
    {visibleToast && <div key={visibleToast.id} role={visibleToast.type === 'error' ? 'alert' : 'status'} aria-live={visibleToast.type === 'error' ? 'assertive' : 'polite'} className={`sitecore-toast-in fixed bottom-4 right-4 z-[70] flex w-[calc(100vw-2rem)] max-w-sm items-start gap-3 rounded-xl border bg-ops-panel p-4 shadow-2xl ${visibleToast.type === 'success' ? 'border-ops-success/30' : 'border-ops-danger/30'}`}>
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${visibleToast.type === 'success' ? 'bg-ops-success-bg text-ops-success' : 'bg-ops-danger-bg text-ops-danger'}`}>{visibleToast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}</span>
      <div className="min-w-0 flex-1 pt-0.5"><p className="text-sm font-semibold text-ops-text">{visibleToast.title}</p>{visibleToast.description && <p className="mt-1 break-words text-xs leading-5 text-ops-muted">{visibleToast.description}</p>}</div>
      <button className="-mr-1 -mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-md text-ops-muted transition-colors hover:bg-ops-bg hover:text-ops-text" onClick={() => visibleToast.id === 'store-error' ? setError(null) : dismissToast(visibleToast.id)} aria-label="Dismiss notification"><X size={15} /></button>
    </div>}
    {notice && <div role="status" className="fixed bottom-24 left-4 z-50 flex max-w-sm items-start gap-3 rounded-lg border border-ops-warning/25 bg-ops-panel p-4 shadow-xl sm:bottom-4"><AlertTriangle size={17} className="mt-0.5 shrink-0 text-ops-warning" /><div className="min-w-0"><p className="text-sm font-medium">{notice.title}</p><p className="mt-1 line-clamp-2 text-xs text-ops-muted">{notice.description}</p><Link to="/alerts" onClick={dismissNotice} className="mt-2 inline-block text-xs font-medium text-ops-accent-text">Review incidents</Link></div><button className="ml-auto text-ops-muted hover:text-ops-text" onClick={dismissNotice} aria-label="Dismiss notification"><X size={15} /></button></div>}
    <ScrollRestoration />
  </div>
}
