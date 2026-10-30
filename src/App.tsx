import { lazy, Suspense, useEffect } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { Activity, AlertTriangle, LoaderCircle } from 'lucide-react'
import { AppShell } from './components/layout/AppShell'
import { ViewerLayout } from './components/layout/ViewerLayout'
import { Button, Card } from './components/ui'
import { useAppStore } from './stores/app-store'
import { useSimulationRuntime } from './hooks/useSimulationRuntime'

const DashboardPage = lazy(() => import('./features/dashboard/DashboardPage').then((module) => ({ default: module.DashboardPage })))
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
  return <div className="grid min-h-[50vh] place-items-center"><div className="flex items-center gap-3 text-sm text-ops-muted"><LoaderCircle size={18} className="animate-spin text-ops-accent-text" />Loading workspace…</div></div>
}

function RouteError() {
  return <div className="grid min-h-[70vh] place-items-center p-5"><Card className="max-w-md p-6 text-center"><AlertTriangle className="mx-auto text-ops-danger" /><h1 className="mt-3 text-lg font-semibold">This view could not be opened</h1><p className="mt-2 text-sm text-ops-muted">Your local data remains available. Reload the page or return to the overview.</p><Button className="mt-4" onClick={() => window.location.assign('/')}>Return to overview</Button></Card></div>
}

const router = createBrowserRouter([
  {
    element: <AppShell />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <Suspense fallback={<RouteLoading />}><DashboardPage /></Suspense> },
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
  {
    path: 'site',
    element: <ViewerLayout />,
    errorElement: <RouteError />,
    children: [{ index: true, element: <Suspense fallback={<RouteLoading />}><SitePage /></Suspense> }],
  },
])

function WorkspaceLoading() {
  return <div className="grid min-h-dvh place-items-center bg-ops-bg text-ops-text"><div className="text-center"><Activity className="mx-auto mb-3 h-6 w-6 animate-pulse text-ops-accent-text"/><p className="text-sm text-ops-muted">Opening SiteCore workspace…</p></div></div>
}

export default function App() {
  const hydrated = useAppStore((state) => state.hydrated)
  const hydrate = useAppStore((state) => state.hydrate)
  const theme = useAppStore((state) => state.data?.settings.theme)
  useEffect(() => { void hydrate() }, [hydrate])
  useEffect(() => { if (theme) document.documentElement.dataset.theme = theme }, [theme])
  useSimulationRuntime()
  if (!hydrated) return <WorkspaceLoading />
  return <RouterProvider router={router} />
}
