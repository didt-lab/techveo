# Architecture Research

**Domain:** Digital signage / employee recognition display (kiosk-style, TV-mounted web app)
**Researched:** 2026-03-08
**Confidence:** HIGH (pattern established from MDN Web APIs, Next.js 15 official docs, domain conventions)

---

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        DISPLAY LAYER                                 │
│  (TV / monitor — browser in kiosk mode, no user interaction)        │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────┐    ┌──────────────────────────────────┐   │
│  │   Carousel View      │    │   Auto-Refresh Controller        │   │
│  │  (animated slides)   │    │  (polling + Page Visibility API) │   │
│  └──────────┬───────────┘    └───────────────┬──────────────────┘   │
│             │                                │                      │
│             └────────────────┬───────────────┘                      │
│                              │ fetch on interval                    │
├──────────────────────────────┼──────────────────────────────────────┤
│                        API LAYER                                     │
│  (Next.js Route Handlers — internal to the same app)                │
├──────────────────────────────┼──────────────────────────────────────┤
│  ┌───────────────┐   ┌───────┴────────┐   ┌────────────────────┐   │
│  │ GET /api/     │   │ POST /api/     │   │ GET /api/          │   │
│  │ events/week   │   │ import/upload  │   │ collaborators      │   │
│  └───────┬───────┘   └───────┬────────┘   └────────┬───────────┘   │
│          │                   │                     │                │
├──────────┼───────────────────┼─────────────────────┼────────────────┤
│                        DATA LAYER                                    │
│  ┌───────┴──────────────────────────────────────────┴──────────┐   │
│  │               Business Logic / Query Layer                   │   │
│  │  - "Who has event this week?" computation                    │   │
│  │  - Birthday/anniversary window calculation                   │   │
│  │  - CSV/Excel parsing + normalization                         │   │
│  └──────────────────────────────────────────────────────────────┘   │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │                  SQLite Database (via Drizzle)              │     │
│  │  collaborators | events | import_log                        │     │
│  └────────────────────────────────────────────────────────────┘     │
├─────────────────────────────────────────────────────────────────────┤
│                   IMPORT / ADMIN LAYER                               │
│  (minimal UI — file upload only, accessed from a regular browser)   │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  /admin  — Upload CSV/Excel page                            │    │
│  │           Preview parsed records before commit              │    │
│  │           Import history log                                │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Carousel View | Full-screen animated slide show of this-week's events. No controls. | Next.js Client Component, CSS animations / Framer Motion |
| Auto-Refresh Controller | Polls `/api/events/week` on a fixed interval; restores data after overnight idle; handles fetch errors silently | `useEffect` + `setInterval` / SWR with `refreshInterval` |
| GET /api/events/week | Returns only collaborators whose birthday or anniversary falls within the current calendar week | Next.js Route Handler |
| POST /api/import/upload | Accepts multipart form-data with CSV or .xlsx file; parses; validates; upserts into DB | Next.js Route Handler + xlsx / papaparse |
| Business Logic / Query Layer | All date math for "current week" window; deduplication between event types; age/years calculation | Pure TypeScript functions, no framework coupling |
| SQLite via Drizzle ORM | Persistent storage for collaborator records and event metadata | Drizzle ORM + better-sqlite3 |
| /admin page | Minimal file-upload form; shows last-import summary; not accessible from TV | Next.js Server Component + Server Action or Route Handler for upload |

---

## Recommended Project Structure

```
src/
├── app/
│   ├── page.tsx                  # Display route — the TV screen (full-screen carousel)
│   ├── layout.tsx                # Root layout — sets <html lang>, viewport, dark background
│   ├── admin/
│   │   └── page.tsx              # Admin upload UI (not displayed on TV)
│   └── api/
│       ├── events/
│       │   └── week/
│       │       └── route.ts      # GET — returns this-week's events
│       ├── collaborators/
│       │   └── route.ts          # GET — full list (for admin preview)
│       └── import/
│           └── upload/
│               └── route.ts      # POST — receives CSV/Excel file
├── components/
│   ├── display/
│   │   ├── Carousel.tsx          # Carousel orchestrator (auto-advance, looping)
│   │   ├── EventSlide.tsx        # Single slide: photo + name + years + type badge
│   │   ├── BirthdayBadge.tsx     # Visual indicator for birthday events
│   │   ├── AnniversaryBadge.tsx  # Visual indicator for anniversary events
│   │   └── EmptyState.tsx        # "No events this week" fallback slide
│   └── admin/
│       ├── UploadForm.tsx        # File input + submit
│       └── ImportPreview.tsx     # Parsed records table before confirming
├── lib/
│   ├── db/
│   │   ├── schema.ts             # Drizzle table definitions
│   │   ├── client.ts             # DB connection singleton (better-sqlite3)
│   │   └── migrations/           # Drizzle migration files
│   ├── domain/
│   │   ├── events.ts             # "Who has event this week?" — core business logic
│   │   ├── dates.ts              # Week-window calculation, anniversary math
│   │   └── types.ts              # Shared TypeScript types (Collaborator, EventRecord)
│   ├── import/
│   │   ├── parser.ts             # CSV + XLSX parsing → normalized records
│   │   └── validator.ts          # Field validation, duplicate detection
│   └── hr-api/
│       └── adapter.ts            # Future: HR system API client (stubbed initially)
├── hooks/
│   └── useEventRefresh.ts        # Auto-polling hook with Page Visibility awareness
└── public/
    └── photos/                   # Collaborator photos (served statically)
```

### Structure Rationale

- **app/**: Next.js App Router — the display route (`/`) and admin route (`/admin`) are co-located. Route Handlers live under `app/api/`.
- **components/display/ vs components/admin/**: Hard boundary prevents admin UI components from leaking into display layer and vice versa. Display components must never depend on admin components.
- **lib/domain/**: Business logic (date math, event filtering) is isolated from both the HTTP layer and the DB layer. This makes it trivially testable and makes the HR API adapter a drop-in replacement.
- **lib/hr-api/adapter.ts**: Created as a stub from day one. The app calls through this adapter regardless of whether data comes from SQLite or the live API. Swapping data source requires only this file to change.
- **hooks/**: Client-side display logic (auto-refresh) lives here, separate from server-side data logic.
- **public/photos/**: Static photo files. Avoids blob-in-DB complexity. File naming convention: `{collaborator_id}.jpg`.

---

## Architectural Patterns

### Pattern 1: Autonomous Display with Client-Side Polling

**What:** The display page (`/`) is a Client Component that polls an internal API endpoint on a fixed interval. It never navigates away, never requires user input, and recovers silently from fetch errors.

**When to use:** Any web app deployed to a TV/kiosk that must update its data without page reload. This is the standard pattern for digital signage.

**Trade-offs:** Simple to implement; polling adds minor server load (negligible at 1 screen polling every 5 minutes). Server-Sent Events (SSE) would push updates instead of pull, but polling is simpler and sufficient for this use case where data changes at most once per day.

**Example:**
```typescript
// hooks/useEventRefresh.ts
'use client'
import { useEffect, useState, useCallback } from 'react'
import type { EventRecord } from '@/lib/domain/types'

const REFRESH_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes

export function useEventRefresh() {
  const [events, setEvents] = useState<EventRecord[]>([])
  const [error, setError] = useState<boolean>(false)

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch('/api/events/week', { cache: 'no-store' })
      if (!res.ok) return // Keep showing current data on error
      const data = await res.json()
      setEvents(data)
      setError(false)
    } catch {
      setError(true) // Silent — keep displaying last known data
    }
  }, [])

  useEffect(() => {
    fetchEvents() // Initial load

    const interval = setInterval(fetchEvents, REFRESH_INTERVAL_MS)

    // Pause polling when tab/screen is hidden, resume on visibility
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchEvents() // Immediate refresh on wake
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [fetchEvents])

  return { events, error }
}
```

### Pattern 2: Provider-Agnostic Data Access via Adapter

**What:** All data access goes through a `DataProvider` interface. The SQLite implementation and the future HR API implementation both satisfy this interface. The Route Handlers call only the interface, never the concrete implementation.

**When to use:** When the data source is expected to change (CSV/SQLite today, HR API tomorrow). This is the correct approach here — the project explicitly calls for this transition.

**Trade-offs:** One extra indirection. Worth it when the replacement is planned and scoped.

**Example:**
```typescript
// lib/domain/types.ts
export interface DataProvider {
  getEventsForWeek(weekStart: Date): Promise<EventRecord[]>
  getCollaborators(): Promise<Collaborator[]>
  upsertCollaborators(records: Collaborator[]): Promise<void>
}

// lib/hr-api/adapter.ts — stub, to be implemented in future phase
export const hrApiProvider: DataProvider = {
  getEventsForWeek: async (weekStart) => {
    throw new Error('HR API not yet configured')
  },
  getCollaborators: async () => {
    throw new Error('HR API not yet configured')
  },
  upsertCollaborators: async () => {
    throw new Error('HR API is read-only')
  },
}

// app/api/events/week/route.ts
import { sqliteProvider } from '@/lib/db/provider'
import { getWeekStart } from '@/lib/domain/dates'

export async function GET() {
  const weekStart = getWeekStart(new Date())
  const events = await sqliteProvider.getEventsForWeek(weekStart)
  return Response.json(events)
}
```

### Pattern 3: Week-Window Event Computation at Query Time

**What:** The database stores raw dates (birthday, hire date). The "event this week" computation happens in the query layer (`lib/domain/events.ts`), not at import time and not at display time.

**When to use:** Always for date-relative business rules. Storing pre-computed "next event date" in the DB creates staleness bugs when queries cross year boundaries.

**Trade-offs:** Slightly more computation per request, but data is always fresh. With SQLite at <200 records, this is completely negligible.

**Example:**
```typescript
// lib/domain/dates.ts
export function getWeekWindow(referenceDate: Date): { start: Date; end: Date } {
  const day = referenceDate.getDay() // 0 = Sunday
  const monday = new Date(referenceDate)
  monday.setDate(referenceDate.getDate() - ((day + 6) % 7))
  monday.setHours(0, 0, 0, 0)

  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)

  return { start: monday, end: sunday }
}

// lib/domain/events.ts
export function hasEventThisWeek(
  dateMMDD: string, // stored as MM-DD
  window: { start: Date; end: Date }
): boolean {
  const year = window.start.getFullYear()
  const eventThisYear = new Date(`${year}-${dateMMDD}`)
  return eventThisYear >= window.start && eventThisYear <= window.end
}
```

---

## Data Flow

### Primary Flow: Display Refresh (Every 5 minutes)

```
TV Browser (every 5 min)
    │
    │  GET /api/events/week
    ▼
Route Handler
    │
    │  sqliteProvider.getEventsForWeek(weekStart)
    ▼
Business Logic (lib/domain/events.ts)
    │  - Compute current week window (Mon–Sun)
    │  - Filter collaborators by birthday MM-DD or hire MM-DD
    │  - Calculate years (age or tenure)
    ▼
Drizzle ORM → SQLite
    │
    │  Collaborator rows
    ▼
Business Logic (transform)
    │  - Map to EventRecord[]
    │  - Sort by event date
    ▼
JSON Response
    │
    ▼
Carousel Component
    │  - setEvents(data)
    │  - Animate through slides
    ▼
TV Screen
```

### Import Flow: CSV/Excel Upload

```
Admin Browser
    │
    │  POST /api/import/upload  (multipart/form-data)
    ▼
Route Handler
    │
    │  lib/import/parser.ts
    │  - Detect format (CSV vs XLSX)
    │  - Parse rows to raw records
    ▼
lib/import/validator.ts
    │  - Validate required fields (name, birth date, hire date)
    │  - Normalize date formats
    │  - Flag duplicates by employee ID
    ▼
sqliteProvider.upsertCollaborators()
    │  - INSERT OR REPLACE by employee_id
    ▼
Import result summary → JSON Response
    │
    ▼
Admin UI (ImportPreview)
    │  - Show success count, skipped, errors
    ▼
TV auto-refresh picks up changes within 5 minutes
```

### Future Flow: HR API Integration (Phase N)

```
Scheduled job or on-demand trigger
    │
    │  hrApiProvider.getCollaborators()
    ▼
HR System REST endpoint
    │  - Bearer token auth
    │  - Returns paginated collaborator list
    ▼
lib/import/validator.ts (same pipeline as CSV)
    │
    ▼
sqliteProvider.upsertCollaborators() (same as CSV import)
    │
    ▼
TV auto-refresh picks up changes
```

The HR API integration feeds into the same upsert pipeline as CSV import. The display layer does not change at all.

---

## Scaling Considerations

This app serves 1 screen, internal network, <200 collaborators. Scaling is not a concern. The considerations below exist only to prevent over-engineering.

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 1 screen, 200 records | Current design is correct. SQLite + Next.js on a single server. No external infrastructure needed. |
| 5-10 screens, same data | Same architecture. SQLite with multiple readers is fine. Add `WAL` mode (`PRAGMA journal_mode=WAL`). |
| 50+ screens, org-wide | Promote SQLite to PostgreSQL. Move file storage to object store. Otherwise no structural change. |

### Scaling Priorities

1. **First bottleneck (if it occurs):** Photo serving. Storing photos in `public/` on the server means they're served by Next.js. At 10+ screens, put photos behind a CDN or object store (S3-compatible). The photo URL field in the DB makes this a one-line config change.
2. **Second bottleneck (if it occurs):** DB write lock during import. Enable WAL mode at DB init time — zero effort and prevents any read/write contention.

---

## Anti-Patterns

### Anti-Pattern 1: Full Page Reload for Data Refresh

**What people do:** Use `window.location.reload()` or `<meta http-equiv="refresh">` to update the display.

**Why it's wrong:** Causes a visible flash/blank screen on every refresh. Carousel loses animation state. Looks broken on a TV.

**Do this instead:** Client-side polling via `fetch` into a `useState` — the carousel updates its data without any visual disruption.

### Anti-Pattern 2: Pre-computing "Next Event Date" at Import Time

**What people do:** Calculate the next occurrence of each birthday/anniversary at CSV import time and store that date in the DB.

**Why it's wrong:** A record imported in December with a "next event" set to January 2026 becomes stale after January 2026 passes. Requires either a scheduled re-computation job or produces silent staleness bugs.

**Do this instead:** Store raw MM-DD and hire date. Compute "is this week?" at query time. No staleness possible.

### Anti-Pattern 3: Storing Photos as Blobs in SQLite

**What people do:** Store `photo` as a BLOB column in SQLite.

**Why it's wrong:** Dramatically increases DB size; makes DB backups huge; every query that returns collaborator rows carries photo data; no HTTP caching for individual photos.

**Do this instead:** Store photos as files in `public/photos/{id}.jpg`. Store only the filename or relative URL in the DB. Next.js serves them with proper HTTP caching headers.

### Anti-Pattern 4: Hardcoding the Data Source

**What people do:** Call SQLite queries directly inside Route Handlers with no abstraction layer.

**Why it's wrong:** When the HR API integration phase arrives, every Route Handler must be modified. Data logic is scattered.

**Do this instead:** Route Handlers call only the `DataProvider` interface. The concrete provider (SQLite or HR API) is injected or resolved via a factory. The HR API phase only adds a new `hrApiProvider` implementation.

### Anti-Pattern 5: Embedding Business Logic in the Display Component

**What people do:** Calculate "years of tenure" or "is birthday this week?" inside the Carousel React component.

**Why it's wrong:** Date math is business logic, not presentation logic. Mixing them makes the API useless (it returns raw data that requires client-side computation), prevents testing without React, and duplicates logic if a second consumer is added.

**Do this instead:** The API endpoint returns ready-to-display `EventRecord` objects with all computed fields (`yearsOfTenure`, `eventType`, `eventLabel`). The Carousel renders only what it receives.

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Institutional HR API (future) | REST adapter in `lib/hr-api/adapter.ts`; periodic poll or manual trigger | Auth mechanism TBD (Bearer token assumed). Stubbed initially — zero code change to display layer when activated. |
| File system (photos) | Static files under `public/photos/`, served by Next.js | Naming convention: `{employee_id}.jpg`. Fallback: generic avatar SVG when photo file is absent. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Display Layer -> API Layer | HTTP GET `/api/events/week` (JSON) | Strict: display layer has NO direct DB access. All data comes through the API endpoint. |
| Admin Layer -> API Layer | HTTP POST `/api/import/upload` (multipart) | Admin page does not import the DB client directly. |
| API Layer -> Data Layer | TypeScript function calls through `DataProvider` interface | Route Handlers import from `lib/domain/` and `lib/db/`, never from `components/`. |
| Data Layer -> DB | Drizzle ORM query calls | No raw SQL strings outside of `lib/db/`. |
| Import -> Data Layer | `lib/import/parser.ts` → `lib/import/validator.ts` → `DataProvider.upsertCollaborators()` | Parser is format-agnostic; CSV and XLSX both produce the same `RawCollaboratorRecord` shape. |

---

## Suggested Build Order

Dependencies between components determine the correct implementation sequence:

```
1. DB Schema + Drizzle client         (foundation — everything else depends on this)
        ↓
2. lib/domain/ (types, dates, events)  (business logic — no dependencies on HTTP or React)
        ↓
3. SQLite DataProvider                 (implements DataProvider interface using Drizzle)
        ↓
4. GET /api/events/week Route Handler  (first API — proves the data pipeline works end-to-end)
        ↓
5. Carousel display page               (consumes the API — validates the display contract)
        ↓
6. POST /api/import/upload + parser    (unblocked once DB schema exists)
        ↓
7. Admin upload UI                     (consumes upload API — lower urgency, not on TV screen)
        ↓
8. HR API adapter stub                 (add interface stub, no implementation — future-proofing)
```

**Rationale for this order:**

- Steps 1–3 have no external dependencies and can be built and unit-tested in isolation before any HTTP or React work begins.
- Step 4 before Step 5: the carousel should consume a real API endpoint from day one, not mock data. This validates the data flow completely in the first working session.
- Step 6 can be done in parallel with Step 5 once the DB schema is stable.
- The HR API adapter stub (Step 8) costs almost nothing and signals the interface contract before any coordination with the HR system is needed.

---

## Sources

- Next.js 15 App Router — Route Handlers: https://nextjs.org/docs/app/api-reference/file-conventions/route (last updated 2026-02-27, version 16.1.6)
- Next.js 15 App Router — Data Fetching: https://nextjs.org/docs/app/getting-started/fetching-data (last updated 2026-02-27)
- MDN Web APIs — Page Visibility API: https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API (Baseline Widely available)
- MDN Web APIs — setInterval / recursive setTimeout: https://developer.mozilla.org/en-US/docs/Web/API/setInterval
- Domain conventions: digital signage polling architecture — established industry pattern (HIGH confidence, training data corroborated by above official sources)

---

*Architecture research for: DIDT Birthday & Anniversary Display — digital signage / employee recognition kiosk*
*Researched: 2026-03-08*
