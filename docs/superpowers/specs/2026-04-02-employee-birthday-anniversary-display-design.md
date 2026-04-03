# Employee Birthday & Anniversary Display — Design Spec

## Overview

Public-screen web app that displays employee birthdays and work anniversaries on office TVs via Ablesign's webpage embedding feature. Runs as a passive full-screen carousel with no user interaction. Data is managed through a separate admin panel with CSV import and individual record entry.

**User-facing language:** Spanish (institutional context in a Spanish-speaking country).

## Tech Stack

- **Framework:** Next.js 15 (App Router), React 18, TypeScript 5 (strict mode)
- **Styling:** Tailwind CSS
- **Animations:** Framer Motion 11 (`AnimatePresence` for carousel transitions)
- **Database:** Supabase PostgreSQL
- **Auth:** Supabase Auth (single admin user)
- **Storage:** Supabase Storage (employee photos)
- **Client polling:** TanStack Query 5 with `refetchInterval`
- **CSV parsing:** PapaParse 5
- **Date logic:** date-fns 3
- **Deployment:** Netlify

## Data Model

Single `empleados` table in Supabase PostgreSQL:

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid (PK) | auto-generated |
| `matricula` | text (unique) | institutional employee ID |
| `nombre` | text | full name |
| `fecha_nacimiento` | date | birthday — used for birthday capsule |
| `fecha_ingreso` | date | hire date — used for anniversary capsule |
| `foto_url` | text (nullable) | Supabase Storage URL or external HR system URL |
| `created_at` | timestamptz | auto-generated |

### Photo Storage

- Supabase Storage bucket: `fotos-empleados`
- Files named `{matricula}.jpg`
- Public read access, authenticated write
- Photos uploaded via admin UI or referenced by external URL

## Event Logic

Two independent capsules with different time windows, computed at query time:

### Birthday Capsule

- **Window:** next 15 days from today
- **Display:** photo, full name, birthday date (e.g., "15 de Mayo")
- Computed by matching MM-DD of `fecha_nacimiento` against the next 15 calendar days

### Anniversary Capsule

- **Window:** current month
- **Display:** photo, full name, years of service (e.g., "8 años")
- Computed by matching MM of `fecha_ingreso` against the current month
- Years of service = current year - year of `fecha_ingreso`

A single employee can appear in both capsules if both events fall within their respective windows.

## Architecture

Three-layer separation: Display → API → Data.

```
Display (TV/Ablesign)     Admin Panel              Supabase
─────────────────────     ──────────────           ──────────────
app/page.tsx         ←──  app/admin/               PostgreSQL
  Carousel                ├─ login/                Auth (1 user)
  Birthday capsule        ├─ empleados/            Storage (photos)
  Anniversary capsule       ├─ nuevo
                            ├─ [id]/editar
                          ├─ importar/
                            ├─ cumpleanos
                            └─ aniversarios
                                    ↕
                            app/api/
                            ├─ events/
                            ├─ empleados/
                            └─ import/
```

### Display Layer (`app/page.tsx`)

- Full-screen client component, zero interaction controls
- Carousel cycles: all birthday slides → all anniversary slides → repeat
- 2 employees per slide, auto-advance every 8 seconds
- Framer Motion fade/slide transitions between slides
- Polling every 5 minutes via TanStack Query
- localStorage cache as fallback when network fails
- Page Visibility API: re-fetches data when page regains focus
- Automatic page reload at 3:00 AM as memory leak backstop
- Branded empty state when no events in either capsule
- Employee without photo: avatar placeholder with initials

### Admin Layer (`app/admin/`)

- Protected by Supabase Auth session — redirects to `/admin/login` if unauthenticated
- **Employee table:** searchable by name or matricula
- **New/Edit form:** all fields + photo upload to Supabase Storage
- **CSV import — birthdays:** upload page at `/admin/importar/cumpleanos`
- **CSV import — anniversaries:** upload page at `/admin/importar/aniversarios`

### API Layer (`app/api/`)

- `GET /api/events` — returns birthdays (next 15 days) and anniversaries (current month), public access
- `POST /api/empleados` — create employee, auth required
- `PUT /api/empleados/[id]` — update employee, auth required
- `DELETE /api/empleados/[id]` — delete employee, auth required
- `POST /api/import/cumpleanos` — process birthday CSV, auth required
- `POST /api/import/aniversarios` — process anniversary CSV, auth required

## CSV Import

### Birthday CSV Format

| Column | Example |
|--------|---------|
| `matricula` | `A12345` |
| `nombre` | `Maria Garcia Lopez` |
| `fecha_nacimiento` | `1990-05-15` |

### Anniversary CSV Format

| Column | Example |
|--------|---------|
| `matricula` | `A12345` |
| `nombre` | `Maria Garcia Lopez` |
| `fecha_ingreso` | `2018-03-01` |

### Import Rules

- **Upsert by matricula:** existing records are updated, new records are created
- Importing birthdays for someone who already has an anniversary (or vice versa) only updates the relevant field — never overwrites the other
- **Encoding detection:** handles Windows-1252 for Spanish characters (Maria, Angel, etc.)
- **Per-row validation:** empty matricula, invalid dates, duplicates within the CSV file
- Valid rows are processed even if other rows have errors
- **Post-import summary:** "X created, Y updated, Z errors" with error detail per row

## Authentication & Security

- Single admin user, created manually in Supabase Auth dashboard (email + password)
- Session managed via `@supabase/ssr` (httpOnly cookies)
- All `/admin/*` routes redirect to `/admin/login` when no active session
- API write routes (POST/PUT/DELETE) validate session before executing
- API read route (`GET /api/events`) is public — no auth required

### Row Level Security (RLS)

- `SELECT` on `empleados`: public (display needs it)
- `INSERT/UPDATE/DELETE` on `empleados`: authenticated users only
- Storage bucket `fotos-empleados`: public read, authenticated write

## Iframe / Ablesign Compatibility

The site will be embedded inside Ablesign's webpage viewer (iframe/webview):

- No `X-Frame-Options` restrictive headers
- Netlify headers configured with permissive `Content-Security-Policy`
- No scrollbars, no popups, no interactive elements on the display page
- Display page is fully passive — suitable for digital signage

### Netlify Configuration

```toml
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "ALLOWALL"
    Content-Security-Policy = "frame-ancestors *"
```

## Visual Design

### Carousel Behavior

- Full-screen, no visible controls
- Each slide: 2 employee cards side by side
- Auto-advance every 8 seconds
- Smooth fade/slide transition (Framer Motion)
- Cycle order: Birthday slides → Anniversary slides → repeat
- If only one capsule has events, only that capsule cycles
- If no events at all: branded "Sin eventos este periodo" screen

### Birthday Card

- Distinctive color scheme and icon (e.g., cake icon)
- Header: "Cumpleanos"
- Employee photo (or initials avatar)
- Full name
- Birthday date in Spanish format (e.g., "15 de Mayo")

### Anniversary Card

- Different color scheme and icon (e.g., trophy/star icon)
- Header: "Aniversarios de Servicio"
- Employee photo (or initials avatar)
- Full name
- Years of service (e.g., "8 anos de servicio")

## Robustness (24/7 Operation)

- TanStack Query polling every 5 minutes
- localStorage cache of last successful response
- Page Visibility API re-fetch on wake
- Automatic full page reload at 3:00 AM daily
- Never show errors on the display — fall back to cached data or empty state

---

*Spec created: 2026-04-02*
