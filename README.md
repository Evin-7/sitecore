# SiteCore

SiteCore is a local-first industrial operations workspace with an interactive 3D site viewer. It brings asset records, zones, incidents, maintenance, inspections, activity, and reports into one application. All seeded and generated readings are local; there is no connection to real equipment or an external operations system.

## Technology stack

- React 19 and TypeScript 5.9, built with Vite 8
- Tailwind CSS 4 for the application interface
- Three.js 0.187, React Three Fiber 9, and Drei 10 for the 3D site
- React Router 7 for module navigation
- Zustand 5 for shared application state, Zod 4 for validation, and IndexedDB for local persistence
- Recharts 3 for analytics; Vitest and React Testing Library for automated tests

## Run locally

Requirements: Node.js 20.19+ (or 22.12+) and npm.

```bash
cd ~/Documents/operations-site-viewer
npm install
npm run dev
```

Open the URL printed by Vite, usually `http://localhost:5173`.

## Commands

```bash
npm run dev       # start Vite
npm run typecheck # TypeScript project checks
npm run lint      # ESLint
npm run lint:fast # Oxlint
npm test          # Vitest and React Testing Library
npm run build     # type-check and production build
npm run preview   # preview the production build
```

## Modules

- **Operations overview:** the 3D site and site health lead the page, followed by shared asset metrics, recent activity, and current work.
- **Site viewer (`/site`):** a dedicated full-viewport inspection workspace without the dashboard sidebar, with orbit/pan/zoom, selection, hover details, zone selection, search/focus, camera reset, perspective/isometric/top-down views, browser fullscreen, and scene layers. The inspector collapses on desktop and becomes an overlay or bottom sheet on smaller screens.
- **Operations overview:** a compact Site Monitoring preview that shares the same scene state and keeps its legend directly beneath the viewer.
- **Asset register:** search, category/status filters, sorting, create/edit/retire, utilisation, zone assignment, and camera focus.
- **Operations:** site activity, zone utilisation, vehicle records, and a pauseable local scenario with speed controls.
- **Alerts & incidents:** severity/status filters, operator incident entry, acknowledge/resolve/reopen actions, and related-asset focus.
- **Maintenance center:** schedule and edit work orders, prioritise, assign technicians, complete, delete, and review due/overdue tasks.
- **Inspections:** create checklists, update progress and findings, and complete an inspection after every checklist item is checked.
- **Analytics:** asset and incident distribution, zone utilisation, maintenance workflow, and a seven-day activity trend derived from the latest saved local record.
- **Reports:** operational summary plus date-filtered inventory, maintenance, incident, and activity reports; export CSV or print.
- **Settings:** dark/light theme, default camera, scene quality, unit preference, notification preference, JSON import/export, and reset.

## Architecture

```text
src/
├── components/          # Shared UI, layout, and 3D canvas
├── data/                # Initial local site records
├── features/            # Route-level modules and feature helpers
├── hooks/               # Simulation runtime lifecycle
├── lib/                 # Zod schemas, formatting, CSV helpers
├── services/            # IndexedDB repository and local simulation engine
├── stores/              # Shared Zustand domain state
└── types/               # Domain models
```

React Router handles the client-side modules. Dashboard routes share the AppShell; `/site` uses a separate viewport-filling layout. Zustand owns the shared domain state across both layouts. Zod validates form records, persisted data, and imports. A single versioned IndexedDB key stores editable records and settings. The local simulation engine is independent of UI components and uses deterministic movement/status rules with fixed timestamps per simulation cycle. Operator-created records use the current local time.

## Data, privacy, and limitations

- The included site, asset names, readings, incidents, and work orders are illustrative local records. No customer, integration, certification, or real deployment is claimed.
- User changes are stored in IndexedDB on this browser/device. They are not uploaded or synchronized across browsers or devices.
- JSON backups include the schema version and are validated, size-limited, and checked for duplicate IDs and broken asset/zone relationships before import.
- The 3D site is assembled from procedural low-polygon geometry. It is a site visualization, not a surveyed digital twin or a source of engineering measurements.
- The simulation is an operator-controlled local scenario. It never communicates with equipment or creates real telemetry.
- Reports support CSV export and browser printing. Native PDF generation, authentication, collaborative access, remote services, and live telemetry are not configured.
- WebGL is required for the 3D scene; a fallback message is shown if the browser cannot initialize it.
