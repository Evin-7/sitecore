# SiteCore

SiteCore is a cloud-backed industrial operations demo with an interactive 3D site viewer. It uses one shared workspace: every visitor sees the same assets, zones, incidents, maintenance, inspections, events, and settings, and every visitor can edit them without signing in.

**Public edit warning:** workspace data is public and writable by anyone. A visitor can change or reset records. Do not store personal, confidential, or real operational data here. The database keeps the last 20 revisions for manual recovery, but this is not access control.

The site records and equipment readings are illustrative. The controlled scenario runs in the browser; no real equipment, sensor gateway, or external operations system is connected.

## Technology

- React 19 and TypeScript 5.9, built with Vite 8
- Tailwind CSS 4
- Three.js 0.187, React Three Fiber 9, and Drei 10 for the 3D site
- React Router 7, Zustand 5, and Zod 4
- Supabase Postgres, Row Level Security, and Realtime
- Recharts 3 for analytics; Vitest and React Testing Library for tests

## Set up Supabase

1. Create a Supabase project.
2. Run [`supabase/migrations/202610310002_public_shared_workspace.sql`](supabase/migrations/202610310002_public_shared_workspace.sql) in the Supabase SQL Editor. It creates a singleton public workspace, limits public writes to that row, disallows deleting it, keeps 20 prior snapshots, and enables Realtime.
3. Copy the project URL and **publishable key** from the Supabase project settings. Do not put a secret or service-role key in the browser.
4. Enable Realtime for `site_shared_workspaces` if it is not already active. The migration adds the table to the `supabase_realtime` publication when available.

The table is deliberately public: its RLS policy grants the unauthenticated `anon` role read, insert-once, and update access to the single `northline` row. It does not grant row deletion. The same policy makes all edits visible to all visitors. The previous per-account migration is retained as history and is not used by this version.

## Run locally

Requirements: Node.js 20.19+ (or 22.12+) and npm.

```bash
cd ~/Documents/operations-site-viewer
npm install
cp .env.example .env.local
```

Set these values in `.env.local`:

```dotenv
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_…
```

Then start the app:

```bash
npm run dev
```

Open the URL printed by Vite, usually `http://localhost:5173`. The first visitor initializes the shared workspace with the sample data. Visitors with old browser-only data see an explicit prompt before that data is published to everyone.

## Vercel configuration

Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` to the SiteCore Vercel project for each environment you use. Production is configured for the current live deployment; add the same values to Preview or Development only if you use those environments. Redeploy after changing environment variables. These values are public browser configuration; the database intentionally allows public edits. Never add a Supabase secret/service-role key to a `VITE_` variable.

## Data behavior

- All visitors read and edit the same Postgres JSON workspace. Edits are validated in the app, revision-checked, and broadcast to other open browsers through Realtime.
- There is no sign-in or account system. This is intentional for the public demo and means there is no private workspace or editor identity.
- Public writes are restricted to one fixed row; anonymous clients cannot delete the row. A trigger retains the latest 20 previous versions in a table that is not exposed to public clients. Restore an old snapshot from the Supabase SQL Editor if a visitor damages the data.
- Existing IndexedDB data is never silently published. The app asks before publishing it to every visitor or discarding it in favor of the shared workspace.
- Version checks detect overlapping edits. If another browser saves first, SiteCore loads the newest snapshot and retries the change once rather than silently replacing newer data.
- Simulation animation runs locally to avoid writing the full workspace each second. Scenario changes are shared when the simulation is paused or another workspace action is saved; it resumes paused after reload.
- There is no offline write queue. Loading and editing require a working Supabase connection.
- JSON backup export and validated import are available in Settings. The “Restore initial workspace” action is public and resets the shared data for everyone.
- The 3D site is procedural low-polygon geometry, not a surveyed digital twin. Telemetry remains operator-entered or simulated until a real equipment integration is added.

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

- **Operations overview:** site visualization, health metrics, recent activity, and current work.
- **Site viewer (`/site`):** full-viewport inspection with orbit, pan, zoom, selection, search, camera views, layers, and browser fullscreen.
- **Asset register:** search, filters, sorting, create/edit/retire, utilization, zone assignment, and camera focus.
- **Operations:** activity, zone utilization, vehicle records, and a pauseable deterministic scenario.
- **Alerts & incidents:** severity/status filters, incident entry, acknowledge/resolve/reopen actions, and asset focus.
- **Maintenance:** work-order scheduling, editing, priority, assignments, completion, deletion, and due-date tracking.
- **Inspections:** checklists, progress, findings, and completion.
- **Analytics and reports:** live shared metrics, date-filtered reports, CSV export, and printing.
- **Settings:** theme and viewer preferences, workspace JSON import/export, and global reset.

## Source layout

```text
src/
├── components/          # Shared UI, layout, and 3D canvas
├── data/                # Initial site records
├── features/            # Route-level modules and workspace screens
├── hooks/               # Simulation runtime lifecycle
├── lib/                 # Supabase client, schemas, formatting, CSV helpers
├── services/            # Shared cloud repository and simulation engine
├── stores/              # Shared Zustand domain state
└── types/               # Domain models
supabase/migrations/     # Workspace schema, RLS, revision history, Realtime
```
