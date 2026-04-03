# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DIDT Birthday & Anniversary Display — a public-screen web app that shows employee birthdays and work anniversaries on a TV/monitor in the DIDT office. Runs unattended 24/7 as an animated carousel embedded via Ablesign's webpage viewer. Data is managed through an admin panel with CSV import and individual employee entry.

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

- **Display** (`app/page.tsx`, `components/display/`): Full-screen carousel, client-side polling every 5 min, Page Visibility API for wake-on-visibility. Zero direct DB access. Embedded in Ablesign iframe.
- **API** (`app/api/`): Next.js Route Handlers:
  - `GET /api/events` — public, returns birthdays (next 15 days) + anniversaries (current month)
  - `POST /api/empleados` — create employee (auth required)
  - `PUT /api/empleados/[id]` — update employee (auth required)
  - `DELETE /api/empleados/[id]` — delete employee (auth required)
  - `POST /api/import/cumpleanos` — birthday CSV import (auth required)
  - `POST /api/import/aniversarios` — anniversary CSV import (auth required)
- **Admin** (`app/admin/`): Protected by Supabase Auth. Employee table, new/edit form, CSV import pages.
- **Supabase clients:** `lib/supabase/client.ts` (browser), `lib/supabase/server.ts` (server/SSR).
- **Photos:** Supabase Storage bucket `fotos-empleados`. Public read, authenticated write.

## Event Display Logic

Two independent capsules, computed at query time:

- **Cumpleaños:** Employees whose birthday MM-DD falls within the next 15 days from today.
- **Aniversarios:** Employees whose hire month matches the current month (not hire day). Years of service = current year - hire year.

Carousel: all birthday slides → all anniversary slides → repeat. 2 employees per slide, 8 seconds per slide.

## Critical Domain Rules

- **Date storage:** Dates stored as `YYYY-MM-DD` strings in Supabase. Never use `new Date("YYYY-MM-DD")` — it parses as UTC midnight, which shifts to the previous day in UTC-5/UTC-6.
- **Event computation:** Parse date strings manually (split on `-`). Calculate events at query time from raw dates. Never pre-compute.
- **Memory leaks:** Every `useEffect` with `setInterval` must return cleanup. Add a scheduled daily 3:00 AM page reload as backstop.
- **Error handling on display:** Never show errors on TV screen. Keep last-known-good data in localStorage cache. Show branded empty state when no events this period.

## Project Management

This project uses the GSD (Get Shit Done) workflow via `/gsd:*` slash commands. Planning state lives in `.planning/`.

The language for user-facing content is **Spanish** (institutional context in a Spanish-speaking country). Code, comments, and documentation are in English.

## Supabase Setup

See `docs/supabase-setup.md` for full setup instructions including table creation, RLS policies, storage bucket, and admin user creation.
