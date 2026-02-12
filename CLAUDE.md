# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ZENGO v1.5 is an offline-first Progressive Web App (PWA) for inventory cycle counting, built for Office Depot Costa Rica. It uses vanilla JavaScript with no build tools or package manager — all dependencies load via CDN. The UI language is Spanish (es-CR locale).

## How to Run

Open `index.html` directly in a modern browser. No build step, no `npm install`, no dev server required. The Service Worker (`sw.js`) registers automatically on page load.

**Demo credentials (hardcoded in LoginView.js):**
- `admin@zengo.com` / `123` → Admin dashboard
- `jefe@zengo.com` / `123` → Supervisor panel
- `auxiliar@zengo.com` / `123` → Worker interface

## Architecture

**MVC pattern with offline-first sync:**

```
User Input (View) → Controller → Model (Dexie local DB + sync_queue) → SyncManager → Supabase cloud
```

All modules are attached to `window` scope (no module bundler). Script load order in `index.html` matters: config → models → controllers → views → app.js.

### Models (`js/models/`)
- **AuthModel** — Credential validation (Supabase with Dexie fallback), role mapping (1=ADMIN, 2=JEFE, 3=AUXILIAR), 30s user cache
- **InventoryModel** — XLSX file parsing via SheetJS, dynamic column mapping, product import to both Dexie and Supabase
- **LocationModel** — Location history tracking per UPC

### Controllers (`js/controllers/`)
- **AuthController** — Login/logout, session persistence via localStorage, role-based view routing
- **SyncManager** — Offline queue processor, 30s sync interval, max 5 retries per operation
- **AdminController** — NetSuite Excel import, user CRUD, data export
- **CycleController** — Count registration, finding/discrepancy reports, task progress updates
- **ScannerController** — Barcode scanning via getUserMedia API, product lookup by UPC/SKU/description

### Views (`js/views/`)
- **LoginView** — Auth UI with demo user buttons
- **AdminView** — Dashboard, NetSuite upload, consultation, shrinkage analysis, audit, user management
- **JefeView** — Command center, task assignment by category, findings review, cycle review
- **AuxiliarView** — Cycle counting interface, barcode scanning, progress tracking
- **Components** — Reusable UI factories: `modal()`, `metricCard()`, `badge()`, `progressBar()`

### Config (`js/config/`)
- **supabase.js** — Supabase client initialization with `MockClient` fallback for offline mode
- **dexie-db.js** — IndexedDB schema (v4) with 7 tables: `productos`, `tareas`, `hallazgos`, `conteos`, `ubicaciones`, `sync_queue`, `usuarios`

### App initialization (`js/app.js`)
1. Opens Dexie DB connection
2. Syncs users from Supabase via `AuthModel.init()`
3. Hides loading screen
4. Restores session or shows login
5. Sets up online/offline connection monitor
6. Starts SyncManager 30s sync interval

## Database Schema (Dexie v4)

```
productos:   ++id, upc, sku, descripcion, categoria, existencia, precio, tipo, estatus
tareas:      id, categoria, auxiliar_id, estado, fecha_asignacion
hallazgos:   ++id, upc, auxiliar_id, tarea_id, estado, timestamp
conteos:     ++id, upc, cantidad, ubicacion, auxiliar_id, tarea_id, timestamp
ubicaciones: ++id, upc, ubicacion, timestamp
sync_queue:  ++id, tabla, accion, datos, timestamp
usuarios:    id, email, nombre, apellido, role_id, activo, fecha_creacion
```

Schema changes require incrementing the version number in `dexie-db.js` and adding migration logic.

## CSS Architecture

Modular CSS files loaded in order: `base.css` → `layout.css` → `components.css` → `tables.css` → `main.css` → role-specific (`jefe.css`, `auxiliar.css`). Design uses glassmorphism (backdrop-filter blur, semi-transparent surfaces) on a dark background.

**Theme colors per role:** Admin `#C8102E` (red), Jefe `#7C3AED` (purple), Auxiliar `#2563EB` (blue).

## Key Patterns

- **Offline-first:** All writes go to Dexie first, then queue in `sync_queue` for cloud sync. `MockClient` in supabase.js provides a thenable chain when offline so callers don't need to handle connection state.
- **No framework:** All DOM manipulation is manual. Views return HTML strings, controllers wire up event handlers.
- **PWA:** Service Worker caches all local assets (cache-first). API calls use network-first strategy.
- **Currency formatting:** Use `ZENGO.formatCurrency()` which formats as CRC (Costa Rican Colón).

## Making Changes

- **New feature:** Add controller in `js/controllers/`, view in `js/views/`, add `<script>` tags to `index.html` in correct load order.
- **Database schema change:** Bump version in `dexie-db.js`, add upgrade logic for existing data.
- **Sync a new table:** Add queue entries via `SyncManager.addToQueue(tabla, accion, datos)`.
- **Service Worker cache:** Update the asset list in `sw.js` when adding new files.
