import { lazy, Suspense, useEffect } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { AlertTriangle, LoaderCircle, RefreshCw } from 'lucide-react'
import { AppShell } from './components/layout/AppShell'
import { Button, Card } from './components/ui'
import { useAppStore } from './stores/app-store'
import { useSimulationRuntime } from './hooks/useSimulationRuntime'
import { CloudSetupScreen, SharedDataMigrationScreen } from './features/workspace/WorkspaceScreens'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import { subscribeToSharedSiteData } from './services/site-repository'

const DashboardPage = lazy(() => import('./features/dashboard/DashboardPage').then((module) => ({ default: module.DashboardPage })))
const HomePage = lazy(() => import('./features/home/HomePage').then((module) => ({ default: module.HomePage })))
const SitePage = lazy(() => import('./features/site/SitePage').then((module) => ({ default: module.SitePage })))
const AssetsPage = lazy(() => import('./features/assets/AssetsPage').then((module) => ({ default: module.AssetsPage })))
const OperationsPage = lazy(() => import('./features/operations/OperationsPage').then((module) => ({ default: module.OperationsPage })))
const AlertsPage = lazy(() => import('./features/alerts/AlertsPage').then((module) => ({ default: module.AlertsPage })))
const MaintenancePage = lazy(() => import('./features/maintenance/MaintenancePage').then((module) => ({ default: module.MaintenancePage })))
const InspectionsPage = lazy(() => import('./features/inspections/InspectionsPage').then((module) => ({ default: module.InspectionsPage })))
const AnalyticsPage = lazy(() => import('./features/analytics/AnalyticsPage').then((module) => ({ default: module.AnalyticsPage })))
const ReportsPage = lazy(() => import('./features/reports/ReportsPage').then((module) => ({ default: module.ReportsPage })))
const SettingsPage = lazy(() => import('./features/settings/SettingsPage').then((module) => ({ default: module.SettingsPage })))

function RouteLoading() {
  return <div className="fixed inset-0 z-[80] grid place-items-center bg-ops-bg"><div role="status" aria-label="Loading"><LoaderCircle size={20} aria-hidden="true" className="animate-spin text-ops-accent-text" /></div></div>
}

function RouteError() {
  return <div className="grid min-h-[70vh] place-items-center p-5"><Card className="max-w-md p-6 text-center"><AlertTriangle className="mx-auto text-ops-danger" /><h1 className="mt-3 text-lg font-semibold">This view could not be opened</h1><p className="mt-2 text-sm text-ops-muted">Your saved workspace remains available. Reload the page or return to the overview.</p><Button className="mt-4" onClick={() => window.location.assign('/dashboard')}>Return to overview</Button></Card></div>
}

function WorkspaceUnavailable({ error, onRetry }: { error: string | null; onRetry: () => void }) {
  return <div className="grid min-h-dvh place-items-center bg-ops-bg p-4 sm:p-6"><Card className="w-full max-w-lg p-6 sm:p-8"><AlertTriangle className="text-ops-danger"/><h1 className="mt-3 text-lg font-semibold">Shared workspace could not be opened</h1><p className="mt-2 text-sm leading-6 text-ops-muted">{error ?? 'Check your connection and cloud database setup, then try again.'}</p><Button variant="primary" className="mt-5" onClick={onRetry}><RefreshCw size={15}/>Retry</Button></Card></div>
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <Suspense fallback={<RouteLoading />}><HomePage /></Suspense>,
    errorElement: <RouteError />,
  },
  {
    element: <AppShell />,
    errorElement: <RouteError />,
    children: [
      { path: 'dashboard', element: <Suspense fallback={<RouteLoading />}><DashboardPage /></Suspense> },
      { path: 'site', element: <Suspense fallback={<RouteLoading />}><SitePage /></Suspense> },
      { path: 'assets', element: <Suspense fallback={<RouteLoading />}><AssetsPage /></Suspense> },
      { path: 'operations', element: <Suspense fallback={<RouteLoading />}><OperationsPage /></Suspense> },
      { path: 'alerts', element: <Suspense fallback={<RouteLoading />}><AlertsPage /></Suspense> },
      { path: 'maintenance', element: <Suspense fallback={<RouteLoading />}><MaintenancePage /></Suspense> },
      { path: 'inspections', element: <Suspense fallback={<RouteLoading />}><InspectionsPage /></Suspense> },
      { path: 'analytics', element: <Suspense fallback={<RouteLoading />}><AnalyticsPage /></Suspense> },
      { path: 'reports', element: <Suspense fallback={<RouteLoading />}><ReportsPage /></Suspense> },
      { path: 'settings', element: <Suspense fallback={<RouteLoading />}><SettingsPage /></Suspense> },
      { path: '*', element: <Suspense fallback={<RouteLoading />}><RouteError /></Suspense> },
    ],
  },
])

function WorkspaceLoading() {
  return <div className="fixed inset-0 z-[80] grid place-items-center bg-ops-bg text-ops-text"><div role="status" aria-label="Loading"><LoaderCircle className="h-6 w-6 animate-spin text-ops-accent-text" aria-hidden="true" /></div></div>
}

export default function App() {
  const hydrated = useAppStore((state) => state.hydrated)
  const data = useAppStore((state) => state.data)
  const storeError = useAppStore((state) => state.error)
  const hydrate = useAppStore((state) => state.hydrate)
  const receiveRemoteWorkspace = useAppStore((state) => state.receiveRemoteWorkspace)
  const migrationRequired = useAppStore((state) => state.migrationRequired)
  const migrationHasSharedData = useAppStore((state) => state.migrationHasSharedData)
  const sharedWorkspace = useAppStore((state) => state.sharedWorkspace)
  const theme = useAppStore((state) => state.data?.settings.theme)

  useEffect(() => {
    if (!supabase) return
    void hydrate()
  }, [hydrate])
  useEffect(() => {
    if (!supabase || !hydrated || !sharedWorkspace || migrationRequired) return
    return subscribeToSharedSiteData(receiveRemoteWorkspace)
  }, [hydrated, sharedWorkspace, migrationRequired, receiveRemoteWorkspace])
  useEffect(() => { if (theme) document.documentElement.dataset.theme = theme }, [theme])
  useSimulationRuntime()
  if (!isSupabaseConfigured) return <CloudSetupScreen />
  if (!hydrated) return <WorkspaceLoading />
  if (migrationRequired) return <SharedDataMigrationScreen
    hasSharedData={migrationHasSharedData}
    onPublish={() => void hydrate('publish')}
    onUseShared={() => void hydrate('use-shared')}
  />
  if (!data) return <WorkspaceUnavailable error={storeError} onRetry={() => void hydrate()} />
  return <RouterProvider router={router} />
}
