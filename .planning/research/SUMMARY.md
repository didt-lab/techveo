# Project Research Summary

**Project:** DIDT Birthday & Anniversary Display
**Domain:** Digital signage / employee recognition kiosk (internal office TV screen)
**Researched:** 2026-03-08
**Confidence:** MEDIUM-HIGH

## Executive Summary

This is a self-hosted digital signage SPA that displays employee birthdays and work anniversaries on a TV screen inside an institutional IT department (DIDT). The display runs unattended 24/7 on the local network, requires no user interaction, and must update its content automatically each week. The recommended approach uses Next.js 15 with an App Router, SQLite via Drizzle ORM for persistent storage, Framer Motion for carousel animations, and a provider-agnostic data layer that accepts CSV/Excel import today and is designed to plug into a future HR REST API without touching the display code. The app splits cleanly into three layers: a full-screen animated display served to the TV, a minimal admin upload page for HR staff, and a lightweight REST API sitting between them.

The critical architecture decision is to build the data layer behind a `DataProvider` interface from day one. Both the CSV import path and the future HR API path implement the same interface, meaning the display component is insulated from data source changes entirely. Photos must be served as static files — never as database blobs — and all date math must work in local calendar coordinates (not UTC) to avoid timezone-offset errors that are invisible in development but break production in UTC-5/UTC-6 environments.

The top risks are date handling correctness and long-running browser stability. Date bugs (timezone offset, leap year Feb 29, year-boundary week windows, Excel serial number fields) are silent — the display will show wrong names or skip names entirely with no error visible. Memory leaks from uncleaned animation intervals will crash the display after days of continuous operation. Both require explicit unit tests and a scheduled daily page reload as a backstop. These are not difficult problems, but they are easy to overlook during development when testing windows are short.

---

## Key Findings

### Recommended Stack

The stack is React 18 + Vite 5 + TypeScript 5 for the SPA scaffold, with Next.js 15 App Router preferred once a persistent backend (SQLite) is included. The architecture research came back with a concrete Next.js-based project structure including Route Handlers, which aligns with the need for a server-side import endpoint and a persistent database. The two approaches (pure Vite SPA vs. Next.js) are not in conflict: the STACK.md research covers the pure-SPA variant while ARCHITECTURE.md converges on Next.js for the server component. **The roadmap should adopt the Next.js architecture** as it provides the API routes needed for CSV import, SQLite access, and the future HR API adapter — all without adding any new infrastructure.

**Core technologies:**
- Next.js 15 (App Router): framework — provides display page, admin page, and Route Handlers in one app with no separate API server
- React 18: UI layer — concurrent rendering improves animated carousel smoothness; largest Framer Motion ecosystem
- TypeScript 5 (strict mode): type safety — catches `undefined` photo references and date shape mismatches before they appear on screen
- Tailwind CSS 3.4: styling — utility classes ideal for full-screen TV layouts; `h-screen`, dark backgrounds, responsive grid
- Framer Motion 11: animations — `AnimatePresence` handles carousel slide enter/exit declaratively; gold standard for React animations
- SQLite via Drizzle ORM: persistence — zero-infrastructure, file-based, sufficient for <200 records; single WAL-mode pragma handles concurrent reads
- date-fns 3: date arithmetic — tree-shakeable, immutable, covers `isThisWeek()` and `differenceInYears()` without moment.js
- TanStack Query 5: client-side polling — `refetchInterval` drives the 5-minute display refresh; query layer is ready for HR API swap
- PapaParse 5 + SheetJS 0.18.5: file parsing — industry standard CSV/Excel parsing; pin SheetJS to 0.18.5 (npm community edition was intentionally broken in later versions)

**Versions to verify before scaffolding:** React 18 vs 19 (React 19 stable released Dec 2024), Tailwind v3 vs v4 (v4 changed config model), SheetJS safe npm version, Swiper 11.x React import paths.

### Expected Features

Research confirms this product type has clear table stakes. Any display missing the core carousel, automatic refresh, or graceful empty state will feel broken or amateur immediately. The differentiators that matter most for institutional buy-in are branded visual identity (DIDT logo and colors) and the exact-day highlight (visual emphasis when today IS the event date). These are low-cost and high-visibility.

**Must have (v1 launch):**
- Current-week celebration roster with auto-filter — core purpose; the display is worthless without it
- Animated carousel with photo, full name, event type label, years count — a static list looks like a spreadsheet on a TV
- Event type visual distinction (birthday vs. anniversary) — viewers must immediately understand what is being celebrated
- Automatic self-refresh — the screen must update across midnight and week rollover without anyone touching it
- CSV/Excel data import — only viable data entry path before HR API is available
- Graceful empty-state — intentional branded screen when no events exist this week
- Branded visual identity (DIDT logo, institutional colors) — a generic display will not earn trust or engagement
- Photo fallback with initials avatar — missing photos must never show a broken image icon on a public screen

**Should have (v1.x, post-validation):**
- Exact-day highlight — visual emphasis when today IS the birthday/anniversary; high perceived value, low implementation cost
- Import error report — clear summary after CSV upload (records imported, skipped, reasons)
- Event window configurability — allow admin to adjust the visibility window from the default Mon-Sun ISO week

**Defer (v2+):**
- HR API integration — highest long-term value but blocked on institutional coordination; design the adapter interface in v1, implement when the endpoint is available
- Upcoming events sidebar — "next week" preview adds layout complexity; defer until current-week display is proven
- Multi-department support — defer until there is actual demand beyond DIDT

**Anti-features to reject if requested:**
- Interactive admin CRUD for individual records (re-import the CSV instead)
- Email/Slack/Teams notification channel (the TV screen is the notification)
- Real-time push from HR system (scheduled polling at hourly/nightly cadence is sufficient)
- Milestone-only anniversaries (PROJECT.md explicitly decided every year is celebrated)

### Architecture Approach

The architecture follows a strict three-layer separation: Display Layer (TV browser, full-screen animated carousel, client-side polling), API Layer (Next.js Route Handlers: `GET /api/events/week`, `POST /api/import/upload`, `GET /api/collaborators`), and Data Layer (business logic in pure TypeScript functions + SQLite via Drizzle ORM). The display layer has zero direct database access — all data flows through the API. Business logic (date math, event filtering, years calculation) lives in `lib/domain/` with no HTTP or React dependencies, making it independently testable. The HR API adapter is stubbed in `lib/hr-api/adapter.ts` from day one, implementing the same `DataProvider` interface as the SQLite provider. When the HR API endpoint becomes available, only this file changes.

**Major components:**
1. Carousel View (`app/page.tsx` + `components/display/`) — full-screen animated slides, no controls, auto-advances through this week's events
2. Auto-Refresh Controller (`hooks/useEventRefresh.ts`) — polls `/api/events/week` on 5-minute interval; uses Page Visibility API to resume on screen wake; fails silently, keeps last known data
3. Route Handlers (`app/api/`) — GET events/week (filtered + computed), POST import/upload (parse + validate + upsert), GET collaborators (admin preview)
4. Business Logic / Query Layer (`lib/domain/`) — pure TypeScript: week-window calculation, birthday/anniversary match, years-of-tenure calculation; never called from client components directly
5. SQLite DataProvider (`lib/db/`) — Drizzle ORM, `INSERT OR REPLACE` upsert strategy, WAL mode; stores raw MM-DD dates, not pre-computed next-event dates
6. Admin Upload UI (`app/admin/`) — file input form, import preview, import history; not displayed on TV

**Suggested build order (dependency-driven):**
1. DB schema + Drizzle client
2. `lib/domain/` (types, date math, event filtering)
3. SQLite DataProvider
4. `GET /api/events/week` Route Handler
5. Carousel display page
6. `POST /api/import/upload` + parser/validator
7. Admin upload UI
8. HR API adapter stub

### Critical Pitfalls

1. **Timezone-offset date shifting** — `new Date("1990-02-15")` parses as UTC midnight; in UTC-6 (Central America), this becomes February 14. Store all dates as `{year, month, day}` plain objects and compare calendar components directly. Never use `new Date(dateOnlyString)` for business logic. This bug is invisible in development (UTC servers) but breaks production silently.

2. **Excel date serial numbers in CSV export** — HR staff using Windows Excel may produce CSVs where date cells appear as 5-digit numbers (e.g., `44927`) instead of ISO strings. The import parser must detect values in the 40000–60000 range and convert them via the Excel epoch (1899-12-30 with the historical off-by-one). Without this, collaborators are imported with wrong or missing birthdates.

3. **CSV encoding — Spanish characters** — Excel on Windows defaults to Windows-1252 encoding, not UTF-8. Names like `María García` and `Ángel Núñez` import as garbled characters. The import layer must attempt encoding detection and offer a Windows-1252 fallback. Surface parsed previews before confirming import so encoding problems are immediately visible.

4. **Memory leak from uncleaned animation intervals** — The display runs 24/7. Every `setInterval` inside a `useEffect` that lacks a cleanup function accumulates stale callbacks. After days of operation the browser stutters, memory grows, and eventually the display crashes. Every `useEffect` with an interval must return `() => clearInterval(id)`. Supplement with a scheduled daily page reload at 3:00 AM as a hard reset.

5. **No graceful fallback on empty or failed data** — A blank screen or JavaScript error during the weekly rollover looks broken to the whole office. Always maintain a last-known-good data snapshot (localStorage cache). Design the empty state: when no events exist this week, show a branded holding screen. Implement silent retry — never propagate errors to the display surface.

---

## Implications for Roadmap

Based on research, the build order is dictated primarily by data dependencies (nothing works without the data layer) and the 24/7 stability requirements (the display must be resilient from day one, not patched later).

### Phase 1: Foundation — Data Model and Business Logic

**Rationale:** The database schema and pure TypeScript domain logic have zero external dependencies and can be built and unit-tested before any HTTP or React work. All subsequent phases depend on these being correct. This is also where the most dangerous pitfalls live — getting the date logic wrong here poisons every downstream phase. Establish correctness at the root.

**Delivers:** Drizzle schema (collaborators, events, import_log tables), `DataProvider` interface, SQLite provider implementation, date math functions (week-window, anniversary match, years calculation), HR API adapter stub.

**Addresses:** Current-week event filter (core logic), years count computation, `DataProvider` interface that enables future HR API swap.

**Avoids:** Pre-computing next-event dates at import time (staleness bug), timezone-offset date shifting (use `{year, month, day}` objects from the start), Feb 29 leap year edge case (covered in unit tests).

**Research flag:** Standard patterns — no additional research phase needed. SQLite + Drizzle + date-fns patterns are well-documented.

---

### Phase 2: Data Import — CSV/Excel Pipeline and Admin UI

**Rationale:** The display has no value until data exists. The import pipeline (parser → validator → upsert) is the only data entry path in v1. It must be correct before the display is built, so the carousel can be tested with real employee data immediately.

**Delivers:** `POST /api/import/upload` Route Handler, PapaParse/SheetJS parser, field validator (required fields, date normalization, duplicate detection by employee ID), upsert into SQLite, import result summary, admin upload UI (`/admin`), photo file storage convention.

**Addresses:** CSV/Excel import, duplicate/conflict handling on re-import, import error report, photo file serving (not blobs), `GET /api/collaborators` for admin preview.

**Avoids:** Excel serial number date bug (parse values in 40000–60000 range via Excel epoch), CSV encoding corruption (detect Windows-1252 for Spanish names, surface preview before confirming), photos-as-database-blobs (store filenames only, serve from `public/photos/`).

**Research flag:** May need light research on SheetJS 0.18.5 API surface and current npm availability before coding. The encoding detection pattern is well-documented but integration testing with real Windows-Excel-exported files is essential.

---

### Phase 3: Display — Carousel and Auto-Refresh

**Rationale:** With the data pipeline working end-to-end (Phase 1 + 2), the display layer can be built against real data from day one. This phase delivers the TV-facing screen that constitutes the entire user-visible product.

**Delivers:** `GET /api/events/week` Route Handler, `useEventRefresh` polling hook (5-minute interval, Page Visibility API wake-on-visibility, silent error handling, localStorage last-known-good cache), Carousel component with Framer Motion `AnimatePresence`, EventSlide component (photo + initials fallback avatar + name + years + event type badge), BirthdayBadge + AnniversaryBadge visual distinction, EmptyState component, branded visual identity (DIDT logo + institutional colors via Tailwind config), DIDT kiosk deployment config (Chromium kiosk flags, nginx static serving).

**Addresses:** Animated carousel, automatic self-refresh, graceful empty-state, event type visual distinction, employee photo with fallback avatar, branded visual identity, full name with accented character support.

**Avoids:** Full page reload for data refresh (use client-side fetch + setState), memory leak from uncleaned intervals (cleanup in useEffect), blank screen during refresh (fade transition, keep old data until new data confirmed), pre-computing business logic in the carousel component (API delivers ready-to-render EventRecord objects).

**Research flag:** Standard patterns — Framer Motion `AnimatePresence` and TanStack Query `refetchInterval` are well-documented for this exact use case. Verify Swiper 11 React import paths if Swiper is chosen over a custom Framer Motion carousel.

---

### Phase 4: Polish — Exact-Day Highlight, UX Hardening, Stability Verification

**Rationale:** Once the core display is running in the office and generating engagement, targeted polish features close the gap between "functional" and "feels institutional and celebrated." Stability verification (memory soak test, week-boundary edge cases) must be done before declaring the display production-ready.

**Delivers:** Exact-day highlight (distinct visual state for "today IS the event date" vs. "event is this week"), transition animation theming (configurable subtle-vs-festive), event window configurability (admin-adjustable VISIBILITY_WINDOW_DAYS constant or config), 24-hour soak test (browser memory monitoring), full "Looks Done But Isn't" checklist from PITFALLS.md, scheduled daily 3:00 AM page reload.

**Addresses:** Exact-day highlight, event window configurability, transition animation theming, long-running stability.

**Avoids:** Year count displayed as "0 years" for first-anniversary hire (display "1st year" contextually), slide duration too short (use 8–12 second default), carousel memory leak accumulation (daily reload backstop confirmed working), week-boundary display inconsistencies (December 31 / January 1 edge cases unit-tested).

**Research flag:** No additional research needed. These are low-complexity features on a proven foundation.

---

### Phase 5: HR API Integration (Future — when endpoint is available)

**Rationale:** This phase is blocked on institutional coordination with the HR system owner. The adapter interface is already in place from Phase 1. When the endpoint is available, only `lib/hr-api/adapter.ts` needs to be implemented — the display layer does not change at all.

**Delivers:** `hrApiProvider` implementation of `DataProvider` interface, scheduled sync job (nightly or hourly), Bearer token auth handling, server-side API response caching (to avoid hammering HR system from the display tab), fallback to SQLite cache when HR API is unavailable.

**Addresses:** HR API integration, eliminating manual re-import, data currency.

**Avoids:** Polling HR API directly from the TV browser (go through the backend proxy), trusting HR API date format without validation (HR systems often return DD/MM/YYYY or serial numbers — run through the same validator as CSV import), exposing HR API credentials in client-side code.

**Research flag:** Needs `/gsd:research-phase` when the HR API endpoint and auth mechanism are specified. Auth pattern (Bearer token, OAuth, API key), date format, pagination, and rate limits are all unknowns until the institutional API is documented.

---

### Phase Ordering Rationale

- **Data model before display:** The carousel renders what the API returns; the API queries the database; the database schema defines what can be stored. This dependency chain mandates Phases 1 and 2 precede Phase 3.
- **Import before display testing:** Testing the carousel with mocked static data creates a false sense of correctness. Building the import pipeline first means Phase 3 is tested with real production-format data immediately.
- **Polish after validation:** Exact-day highlights and animation theming have near-zero value if the underlying data or display logic has bugs. Phase 4 polish only lands well on a solid Phase 3 foundation.
- **HR API last:** It is institutionally blocked and architecturally isolated. The stub in Phase 1 ensures it does not block any other phase.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 5 (HR API Integration):** Blocked until the HR system API is documented. Auth mechanism, date format, pagination, and rate limiting are all unknowns. Run `/gsd:research-phase` when the endpoint specification is available.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Foundation):** SQLite + Drizzle + TypeScript domain modeling is well-documented. Standard patterns apply.
- **Phase 2 (Data Import):** PapaParse and SheetJS APIs are well-documented. The encoding detection and serial-number detection patterns are established. Verify SheetJS npm version before scaffolding.
- **Phase 3 (Display):** Next.js App Router client polling + Framer Motion carousel is a well-documented pattern. Verify Swiper import paths if used.
- **Phase 4 (Polish):** Low-complexity features on a working foundation. No research needed.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM-HIGH | Core React/Next.js/Vite/Tailwind choices are HIGH confidence (production-stable, widely adopted). SheetJS npm version status and React 18 vs 19 recommendation need live verification before scaffolding. |
| Features | MEDIUM-HIGH | Table stakes and anti-features are HIGH confidence (established digital signage / HR recognition domain patterns). Competitor feature details are MEDIUM confidence (based on training data, not live product verification). |
| Architecture | HIGH | Architecture research was backed by official Next.js 15 and MDN documentation. The three-layer separation, `DataProvider` interface pattern, and client-side polling pattern are established and well-sourced. |
| Pitfalls | HIGH | Date/timezone pitfalls verified via MDN official documentation. Excel serial number format, Windows-1252 encoding behavior, and React interval cleanup patterns are well-documented. Memory leak pattern is domain-verified. |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **React 18 vs React 19:** React 19 was stable as of December 2024. Research was conducted with a React 18 recommendation. Verify current React team recommendation before scaffolding — if React 19 is the new baseline, Framer Motion 11 peer dependency must be confirmed.
- **SheetJS npm version:** The community edition breakage situation may have changed since training data cutoff. Verify `npm info xlsx` before `npm install` — do not blindly use the latest version.
- **Tailwind v3 vs v4:** Tailwind v4 (2025) changed the config model significantly. If the team is comfortable with the new CSS-based config, v4 may be the right choice for a project starting now. Confirm before scaffolding.
- **Swiper 11 React import paths:** Import paths changed between Swiper 8, 9, and 11. If Swiper is used for the carousel engine, verify `swiper/react` import syntax before writing carousel code.
- **HR API endpoint specification:** Completely unknown — auth mechanism, response format, date format, pagination, rate limits. All are blockers for Phase 5. No assumptions should be encoded in Phase 1-4 code beyond the `DataProvider` interface stub.
- **DIDT institutional color/logo assets:** Need to be provided before Phase 3 begins. The branded visual identity cannot be implemented without these assets.

---

## Sources

### Primary (HIGH confidence)
- Next.js 15 App Router official documentation — Route Handlers, Data Fetching (verified 2026-02-27, version 16.1.6)
- MDN Web APIs — JavaScript Date parsing behavior, timezone UTC split (verified 2026-03-08)
- MDN Web APIs — Page Visibility API (Baseline Widely Available)
- MDN Web APIs — setInterval / recursive setTimeout

### Secondary (MEDIUM confidence)
- Training knowledge through August 2025 — React 18, Vite 5, Framer Motion 11, TanStack Query 5, date-fns 3, Drizzle ORM, Zustand, PapaParse ecosystems
- Excel date serial number epoch behavior — widely documented known issue (Excel 1900 off-by-one bug)
- Windows-1252 vs UTF-8 in Excel CSV exports — Microsoft documented behavior for Excel on Windows
- React useEffect cleanup pattern for intervals — React official documentation

### Tertiary (LOW confidence — needs live verification)
- SheetJS community edition npm status — intentional breakage reported across GitHub issues; current safe version needs live verification
- Competitor feature analysis (Enplug, Rise Vision, BirthdayBot) — based on training data, not live product pages; confidence LOW on specific feature details
- React 18 vs React 19 recommendation — React 19 stable Dec 2024 may change the baseline recommendation

---
*Research completed: 2026-03-08*
*Ready for roadmap: yes*
