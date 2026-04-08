# New Hires Screen — Design Spec

## Overview

A standalone display screen at `/nuevo-ingreso` showing employees who joined within the last 30 days. Designed for a separate TV/Ablesign iframe, following the same visual language as the birthday display.

## Data Model

### New type: `NewHireEvent`

```ts
export interface NewHireEvent {
  empleado: Empleado;
  fechaIngreso: string; // "8 de Abril de 2026" — formatted for display
}
```

### New response type: `NewHiresResponse`

```ts
export interface NewHiresResponse {
  nuevosIngresos: NewHireEvent[];
  fetchedAt: string;
}
```

### Query logic

- Filter employees where `fecha_ingreso` falls within the last 30 days from today.
- Parse `fecha_ingreso` string manually (split on `-`) — never use `new Date("YYYY-MM-DD")`.
- Sort by `fecha_ingreso` descending (most recent first).
- No new database columns required — uses existing `fecha_ingreso` field.

## API

### `GET /api/nuevo-ingreso`

- **Auth:** Public (no auth required, same as `/api/events`).
- **Returns:** `NewHiresResponse` with employees whose `fecha_ingreso` is within last 30 days.
- **Cache:** `revalidate = 300` (5 min, same as events).
- **Uses:** Supabase service role client (same pattern as `/api/events`).

## Display Page — `/nuevo-ingreso`

### Page structure

Same layout as `app/page.tsx`:

- **Header:** DIDT title + subtitle + `Clock` component
- **Content:** Carousel of new hire slides, or `EmptyState` if none
- **Footer:** IMSS line + "Actualizado" timestamp

### Infrastructure (same as main display)

- TanStack Query polling every 5 minutes
- Page Visibility API refetch on wake
- localStorage cache (`techveo:last-newhires`)
- Daily 3:00 AM page reload

## Slide Design — `NewHireSlide`

One employee per slide, visual style adapted from birthday slides.

### Layout

- **Header (fixed):** `CapsuleHeader` with text "Nuevos Ingresos"
- **Content (centered, horizontal):**
  - Circular photo (144px, `rounded-full`, white border + shadow) — same as birthday `EmployeeCard`
  - To the right of the photo:
    - Name in teal pill (`bg-teal-500`, white text, `rounded-full`) — same style as birthday cards
    - Below the name: formatted hire date (e.g., "8 de Abril de 2026") in gray
- **Decorative icon (fixed):** 🤝 in bottom-right corner, large + semi-transparent (mirrors 🎉 in birthday screen)

### Animations

- Fade in + slide up (`opacity: 0, y: 30` → `opacity: 1, y: 0`) — same as `EmployeeCard`
- `AnimatePresence mode="wait"` for slide transitions

### Timing

- 8 seconds per slide
- Carousel loops continuously

## Carousel

### `NewHireCarousel`

Dedicated carousel component (simpler than main `Carousel` since it only handles one slide type):

- Takes `NewHireEvent[]`
- Builds one slide per employee
- Auto-advances every 8 seconds
- Uses `AnimatePresence` for transitions

## Components to reuse

- `Clock` — header clock
- `CapsuleHeader` — section header (may need to accept custom text/color)
- `EmptyState` — no-data fallback
- `InitialsAvatar` — fallback when no photo

## Components to create

- `NewHireSlide` — individual new hire slide
- `NewHireCarousel` — carousel wrapper
- `app/nuevo-ingreso/page.tsx` — page component

## Domain logic

### `getNewHiresInWindow()` in `lib/domain/events.ts`

```ts
function getNewHiresInWindow(
  empleados: Empleado[],
  referenceDate: Date = new Date()
): NewHireEvent[]
```

- Filters employees whose `fecha_ingreso` is within last 30 days
- Formats date for display using `date-fns` format with `es` locale
- Sorts by `fecha_ingreso` descending (most recent first)
