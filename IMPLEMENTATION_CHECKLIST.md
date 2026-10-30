# SiteCore implementation checklist

## Existing functionality to preserve

- [x] React 19 + Vite 8 + React Three Fiber 9 + Drei 10
- [x] Interactive orbit, pan, zoom, asset selection, focus, and camera reset
- [x] Asset search/status filtering, scene layers, alerts, dark/light themes
- [x] Local procedural site model and honest local simulation labeling

## Current refactor

- [x] Feature routes and shared application shell
- [x] Typed domain schemas and normalized local records
- [x] Zustand store backed by versioned IndexedDB persistence
- [x] Asset CRUD and shared 3D selection
- [x] Operations simulation controls and event history
- [x] Deterministic vehicle routes, equipment telemetry, asset status transitions, and local simulation alerts
- [x] Alert acknowledge/resolve/reopen workflows
- [x] Maintenance and inspection workflows
- [x] Analytics from shared records, including zone utilisation and a seven-day recorded activity/incident trend
- [x] Date-filtered reports, operational summary, and CSV/print export
- [x] Settings, validated import/export, reset, theme/camera/quality preferences
- [x] 3D view modes, fullscreen, zone interaction, hover details, responsive controls
- [x] Laptop-width viewer/inspector pairing and tablet/mobile inspector, layers, and zones tabs
- [x] Separate `/site` full-screen layout without the dashboard sidebar; shared site state is reused
- [x] Light/dark semantic color tokens for primary actions, navigation, links, status badges, disabled, hover, and focus states
- [x] Dashboard preview card ends after the 3D scene and status legend instead of stretching to its neighboring column
- [x] Detailed loading bays, yard markings, fencing, pallets, vehicles, and selected-asset highlighting
- [x] Tailwind utility styling for conventional UI
- [x] Runtime route error boundary, loading/empty/error states, accessible dialogs/forms
- [x] Automated tests, lint, production build, and IndexedDB persistence verification (14 tests pass; build passes with a non-blocking 3D bundle-size notice)
- [x] Browser walkthrough: dashboard, asset search/focus, inspector-to-editor navigation, and dark/light themes
- [x] Responsive viewport review at 390px mobile, 768px tablet, 1280px laptop, and 1440px desktop
- [x] Production route and console check; the local browser renders the 3D scene without page errors
- [x] Contrast checks in light and dark themes; primary and semantic status pairs exceed WCAG AA text contrast
- [x] Route walkthrough confirms the dashboard sidebar remains on all dashboard modules and is absent on `/site`
- [x] README architecture, behavior, commands, and known limitations

## Architecture decisions

- Use React Router declarative routes for the standalone SPA; no server loaders are needed.
- Use Zustand for the cross-feature local domain state and selective subscriptions.
- Use Zod at form, persisted-state, and import boundaries.
- Use a single IndexedDB-backed repository for editable domain data; keep theme and small display preferences in the same persisted settings record.
- Keep simulation deterministic, pauseable, and clearly labeled as local data.
- Anchor analytics activity trends to the latest saved local record, so chart dates remain reproducible and truthful to the stored data.
- Do not add TanStack Query until a remote service exists.
- Keep the industrial 3D viewport intentionally dark across dashboard themes for scene contrast.

## Not authorized in this task

- No GitHub push, deployment, or portfolio changes.
