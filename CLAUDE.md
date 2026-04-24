# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DIDT Birthday & Anniversary Display — a public-screen web app that shows employee birthdays and work anniversaries on a TV/monitor in the DIDT office. Runs unattended 24/7 as an animated carousel embedded via Ablesign's webpage viewer. Data is managed through an admin panel with CSV import and individual employee entry.

## Commands

```bash
npm run dev      # Start dev server (uses --webpack, not Turbopack)
npm run build    # Production build
npm run lint     # ESLint check
```

No test suite exists in this project.

## Environment Variables

Copy `.env.example` to `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` — server-only, never expose to client

## Tech Stack

- **Framework:** Next.js 15 (App Router) with React 18, TypeScript 5 (strict mode)
- **Styling:** Tailwind CSS
- **Animations:** Framer Motion 11 (`AnimatePresence` for carousel)
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth (single admin user, `@supabase/ssr`)
- **Storage:** Supabase Storage (employee photos, bucket `fotos-empleados`)
- **Date logic:** date-fns 3 — never use `new Date(dateOnlyString)` for business logic (timezone offset bugs)
- **CSV parsing:** PapaParse 5
- **Client polling:** TanStack Query 5 with `refetchInterval`

## Architecture

Three-layer separation: Display Layer → API Layer → Supabase.

**Display pages** (`components/display/`): Full-screen carousels, client-side polling every 5 min, Page Visibility API for wake-on-visibility. Zero direct DB access. Embedded in Ablesign iframes.

- `app/page.tsx` — birthdays + anniversaries combined (`/api/events`)
- `app/aniversarios/page.tsx` — anniversaries only (`/api/events`)
- `app/nuevo-ingreso/page.tsx` — new hires this month (`/api/nuevo-ingreso`)

**API** (`app/api/`): Next.js Route Handlers:
- `GET /api/events` — public, returns birthdays (next 15 days) + milestone anniversaries (current month). Uses `SUPABASE_SERVICE_ROLE_KEY` directly (no auth needed for display).
- `GET /api/nuevo-ingreso` — public, returns employees hired in the current month+year
- `POST /api/empleados` — create employee (auth required)
- `PUT /api/empleados/[id]` — update employee (auth required)
- `DELETE /api/empleados/[id]` — delete employee (auth required)
- `POST /api/import/cumpleanos` — birthday CSV import (auth required)
- `POST /api/import/aniversarios` — anniversary CSV import (auth required)
- `POST /api/import/empleados` — general employee CSV import (auth required)
- `POST /api/import/exclusiones` — hide employees from display via CSV (auth required)

**Admin** (`app/admin/`): Protected by Supabase Auth middleware (`middleware.ts` matches `/admin/:path*`). Employee table, new/edit form, CSV import pages.

**Supabase clients:** `lib/supabase/client.ts` (browser), `lib/supabase/server.ts` (server/SSR).

**Domain logic:** `lib/domain/` — types, event computation functions, CSV parsers. No business logic in route handlers or components.

## Event Display Logic

Three independent capsules, computed at query time from raw `YYYY-MM-DD` strings:

- **Cumpleaños:** `getBirthdaysInWindow` — employees whose birthday MM-DD falls within the next 15 days. Filtered by `mostrar_cumpleanos = true`.
- **Aniversarios:** `getAnniversariesInMonth` — employees whose hire month matches the current month AND whose years of service hit a milestone (5, 10, 15, 20, 25). Filtered by `mostrar_aniversario = true`.
- **Nuevos Ingresos:** `getNewHiresInMonth` — employees whose `fecha_ingreso` is in the current month AND year (exact year match, not just month). No flag filter.

Carousel: 2 employees per slide, 8 seconds per slide.

## Exclusions System

`mostrar_cumpleanos` and `mostrar_aniversario` boolean columns on `empleados` control visibility per screen. Import via `POST /api/import/exclusiones` with CSV columns: `MATRÍCULA, NOMBRE, TEMA, MES`. TEMA values: `Cumpleaños` → sets `mostrar_cumpleanos = false`; `Antigüedad` → sets `mostrar_aniversario = false`. Column headers are normalized (lowercased, accents stripped) before parsing.

## CSV Formats

All CSV parsers (in `lib/domain/csv-parser.ts`) accept dates in either `YYYY-MM-DD` or `DD/MM/YYYY`. Headers are normalized (lowercased, trimmed, accents stripped for employee/exclusion imports).

- **Birthday CSV:** columns `matricula, nombre, fecha_nacimiento, ingreso`
- **Anniversary CSV:** columns `matricula, nombre, fecha_ingreso`
- **Employee CSV:** columns `matricula, nombre, fecha_nacimiento, fecha_ingreso`
- **Exclusion CSV:** columns `MATRÍCULA, NOMBRE, TEMA, MES`

## Critical Domain Rules

- **Date storage:** Dates stored as `YYYY-MM-DD` strings in Supabase. Never use `new Date("YYYY-MM-DD")` — it parses as UTC midnight, which shifts to the previous day in UTC-5/UTC-6.
- **Event computation:** Parse date strings manually using `split("-")`. Calculate events at query time from raw dates. Never pre-compute or store computed event state.
- **Memory leaks:** Every `useEffect` with `setInterval` must return cleanup. All display pages include a scheduled daily 3:00 AM `window.location.reload()` as a memory leak backstop.
- **Error handling on display:** Never show errors on TV screen. Keep last-known-good data in localStorage cache (key prefix `techveo:`). Show branded empty state when no events this period.

## Deployment

Deployed on Netlify. Config in `netlify.toml`:
- Plugin: `@netlify/plugin-nextjs`
- Custom headers on all routes: `X-Frame-Options: ALLOWALL` and `Content-Security-Policy: frame-ancestors *` — required for Ablesign iframe embedding.

## Project Management

This project uses the GSD (Get Shit Done) workflow via `/gsd:*` slash commands. Planning state lives in `.planning/`.

The language for user-facing content is **Spanish** (institutional context in a Spanish-speaking country). Code, comments, and documentation are in English.

## Supabase Setup

See `docs/supabase-setup.md` for table creation SQL, RLS policies, storage bucket, and admin user setup. Note: the initial table SQL in that doc predates the `mostrar_cumpleanos` and `mostrar_aniversario` columns — add them manually if setting up from scratch:

```sql
ALTER TABLE empleados
  ADD COLUMN mostrar_cumpleanos BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN mostrar_aniversario BOOLEAN NOT NULL DEFAULT true;
```
