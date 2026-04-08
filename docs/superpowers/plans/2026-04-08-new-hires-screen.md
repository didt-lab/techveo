# New Hires Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a standalone `/nuevo-ingreso` display page showing employees hired in the last 30 days, one per slide in an auto-rotating carousel.

**Architecture:** New domain function filters employees by `fecha_ingreso` within 30 days. New API route serves the data publicly. New page at `/nuevo-ingreso` with dedicated carousel and slide components reusing the birthday visual language.

**Tech Stack:** Next.js 15 App Router, React 18, TypeScript, Tailwind CSS, Framer Motion 11, TanStack Query 5, date-fns 3, Supabase

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `lib/domain/types.ts` | Add `NewHireEvent` and `NewHiresResponse` types |
| Modify | `lib/domain/events.ts` | Add `getNewHiresInWindow()` function |
| Modify | `components/display/CapsuleHeader.tsx` | Accept `"newhire"` type with custom text |
| Create | `app/api/nuevo-ingreso/route.ts` | Public API endpoint returning new hires |
| Create | `components/display/NewHireSlide.tsx` | Individual new hire slide component |
| Create | `components/display/NewHireCarousel.tsx` | Carousel wrapper for new hire slides |
| Create | `app/nuevo-ingreso/page.tsx` | Display page with polling, cache, visibility API |

---

### Task 1: Add types

**Files:**
- Modify: `lib/domain/types.ts`

- [ ] **Step 1: Add NewHireEvent and NewHiresResponse types**

Add at the end of `lib/domain/types.ts`:

```ts
export interface NewHireEvent {
  empleado: Empleado;
  fechaIngreso: string; // "8 de Abril de 2026" — formatted for display
}

export interface NewHiresResponse {
  nuevosIngresos: NewHireEvent[];
  fetchedAt: string;
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/domain/types.ts
git commit -m "feat: add NewHireEvent and NewHiresResponse types"
```

---

### Task 2: Add domain logic — `getNewHiresInWindow()`

**Files:**
- Modify: `lib/domain/events.ts`

- [ ] **Step 1: Add the getNewHiresInWindow function**

Add this function at the end of `lib/domain/events.ts`. It reuses the existing `parseDateString` helper already defined in the file.

```ts
import type { Empleado, BirthdayEvent, AnniversaryEvent, NewHireEvent } from "./types";
// ^ Update the existing import at the top of the file to include NewHireEvent

/**
 * Returns employees whose fecha_ingreso falls within the last 30 days.
 */
export function getNewHiresInWindow(
  empleados: Empleado[],
  referenceDate: Date = new Date()
): NewHireEvent[] {
  const refYear = getYear(referenceDate);
  const refMonth = getMonth(referenceDate) + 1;
  const refDay = getDate(referenceDate);

  // Build reference as days-since-epoch-approx for simple comparison
  const refDays = refYear * 365 + refMonth * 30 + refDay;

  const results: NewHireEvent[] = [];

  for (const emp of empleados) {
    const parsed = parseDateString(emp.fecha_ingreso);
    if (!parsed) continue;

    const empDays = parsed.year * 365 + parsed.month * 30 + parsed.day;
    const diff = refDays - empDays;

    if (diff >= 0 && diff <= 30) {
      results.push({
        empleado: emp,
        fechaIngreso: format(
          new Date(2000, parsed.month - 1, parsed.day),
          "d 'de' MMMM",
          { locale: es }
        ),
      });
    }
  }

  // Sort by fecha_ingreso descending (most recent first)
  results.sort((a, b) => {
    const pa = parseDateString(a.empleado.fecha_ingreso)!;
    const pb = parseDateString(b.empleado.fecha_ingreso)!;
    const daysA = pa.year * 365 + pa.month * 30 + pa.day;
    const daysB = pb.year * 365 + pb.month * 30 + pb.day;
    return daysB - daysA;
  });

  return results;
}
```

Note: The `format`, `getYear`, `getMonth`, `getDate` imports and `es` locale import already exist at the top of the file. Only `NewHireEvent` needs to be added to the type import.

- [ ] **Step 2: Verify build**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/domain/events.ts
git commit -m "feat: add getNewHiresInWindow domain function"
```

---

### Task 3: Extend CapsuleHeader to support "newhire" type

**Files:**
- Modify: `components/display/CapsuleHeader.tsx`

- [ ] **Step 1: Update CapsuleHeader to accept "newhire" type**

Replace the full contents of `components/display/CapsuleHeader.tsx` with:

```tsx
"use client";

export function CapsuleHeader({
  type,
}: {
  type: "birthday" | "anniversary" | "newhire";
}) {
  if (type === "birthday") {
    return (
      <div className="text-center mb-10 pt-8">
        <h2 className="text-6xl font-extrabold">
          <span className="text-purple-600 italic">&#161;Feliz</span>{" "}
          <span className="text-teal-500 italic">Cumple!</span>
        </h2>
        <p className="text-gray-400 text-lg mt-2"></p>
      </div>
    );
  }

  if (type === "anniversary") {
    return (
      <div className="text-center mb-10 pt-8">
        <h2 className="text-5xl font-extrabold">
          <span className="text-purple-600">&#161;Felicidades!</span>
        </h2>
        <p className="text-gray-400 text-lg mt-2">Aniversario de Servicio</p>
      </div>
    );
  }

  // newhire
  return (
    <div className="text-center mb-10 pt-8">
      <h2 className="text-5xl font-extrabold">
        <span className="text-teal-500">Nuevos Ingresos</span>
      </h2>
      <p className="text-gray-400 text-lg mt-2">¡Bienvenidos a la DIDT!</p>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
npx tsc --noEmit
```

Expected: no errors (existing usages pass `"birthday"` or `"anniversary"`, both still valid).

- [ ] **Step 3: Commit**

```bash
git add components/display/CapsuleHeader.tsx
git commit -m "feat: extend CapsuleHeader to support newhire type"
```

---

### Task 4: Create NewHireSlide component

**Files:**
- Create: `components/display/NewHireSlide.tsx`

- [ ] **Step 1: Create the slide component**

Create `components/display/NewHireSlide.tsx`:

```tsx
"use client";

import { motion } from "framer-motion";
import { InitialsAvatar } from "./InitialsAvatar";
import type { NewHireEvent } from "@/lib/domain/types";

export function NewHireSlide({ event }: { event: NewHireEvent }) {
  const empleado = event.empleado;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="absolute inset-0 flex items-center justify-center px-20 -mt-12"
    >
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="flex items-center gap-10"
      >
        {/* Circular photo */}
        {empleado.foto_url ? (
          <img
            src={empleado.foto_url}
            alt={empleado.nombre}
            className="w-36 h-36 rounded-full object-cover border-4 border-white shadow-lg flex-shrink-0"
          />
        ) : (
          <InitialsAvatar
            nombre={empleado.nombre}
            className="w-36 h-36 rounded-full border-4 border-white shadow-lg flex-shrink-0"
          />
        )}

        {/* Info */}
        <div className="flex flex-col items-start">
          <span className="bg-teal-500 text-white text-3xl font-semibold px-8 py-2.5 rounded-full shadow whitespace-nowrap">
            {empleado.nombre}
          </span>
          <p className="text-gray-700 text-4xl font-bold mt-4 ml-2">
            {event.fechaIngreso}
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add components/display/NewHireSlide.tsx
git commit -m "feat: create NewHireSlide display component"
```

---

### Task 5: Create NewHireCarousel component

**Files:**
- Create: `components/display/NewHireCarousel.tsx`

- [ ] **Step 1: Create the carousel component**

Create `components/display/NewHireCarousel.tsx`:

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { NewHireSlide } from "./NewHireSlide";
import { CapsuleHeader } from "./CapsuleHeader";
import type { NewHireEvent } from "@/lib/domain/types";

const SLIDE_MS = 8000;

export function NewHireCarousel({
  nuevosIngresos,
}: {
  nuevosIngresos: NewHireEvent[];
}) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const advance = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % nuevosIngresos.length);
  }, [nuevosIngresos.length]);

  useEffect(() => {
    if (nuevosIngresos.length <= 1) return;
    const interval = setInterval(advance, SLIDE_MS);
    return () => clearInterval(interval);
  }, [advance, nuevosIngresos.length]);

  useEffect(() => {
    if (currentIndex >= nuevosIngresos.length) {
      setCurrentIndex(0);
    }
  }, [nuevosIngresos.length, currentIndex]);

  if (nuevosIngresos.length === 0) return null;

  return (
    <div className="relative w-full h-full flex flex-col">
      <CapsuleHeader type="newhire" />

      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait">
          <NewHireSlide
            key={`newhire-${currentIndex}`}
            event={nuevosIngresos[currentIndex]}
          />
        </AnimatePresence>
      </div>

      {/* Decorative icon */}
      <div
        className="absolute bottom-4 right-8 opacity-70 pointer-events-none"
        style={{ fontSize: "11rem" }}
      >
        🤝
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add components/display/NewHireCarousel.tsx
git commit -m "feat: create NewHireCarousel display component"
```

---

### Task 6: Create API route `GET /api/nuevo-ingreso`

**Files:**
- Create: `app/api/nuevo-ingreso/route.ts`

- [ ] **Step 1: Create the API route**

Create `app/api/nuevo-ingreso/route.ts`:

```ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getNewHiresInWindow } from "@/lib/domain/events";
import type { Empleado, NewHiresResponse } from "@/lib/domain/types";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const revalidate = 300; // 5 min cache

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("empleados")
      .select("*");

    if (error) throw error;

    const now = new Date();

    const response: NewHiresResponse = {
      nuevosIngresos: getNewHiresInWindow(data as Empleado[], now),
      fetchedAt: now.toISOString(),
    };

    return NextResponse.json(response, {
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  } catch (error) {
    console.error("[/api/nuevo-ingreso] Error:", error);
    return NextResponse.json(
      { error: "Error al obtener nuevos ingresos" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Verify build**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add app/api/nuevo-ingreso/route.ts
git commit -m "feat: add GET /api/nuevo-ingreso endpoint"
```

---

### Task 7: Create display page at `/nuevo-ingreso`

**Files:**
- Create: `app/nuevo-ingreso/page.tsx`

- [ ] **Step 1: Create the page**

Create `app/nuevo-ingreso/page.tsx`:

```tsx
"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { NewHireCarousel } from "@/components/display/NewHireCarousel";
import { Clock } from "@/components/display/Clock";
import { EmptyState } from "@/components/display/EmptyState";
import type { NewHiresResponse } from "@/lib/domain/types";

const POLL_INTERVAL_MS = 5 * 60 * 1000;
const CACHE_KEY = "techveo:last-newhires";

function loadCache(): NewHiresResponse | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as NewHiresResponse) : null;
  } catch {
    return null;
  }
}

function saveCache(data: NewHiresResponse) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // localStorage unavailable in some kiosk setups
  }
}

async function fetchNewHires(): Promise<NewHiresResponse> {
  const res = await fetch("/api/nuevo-ingreso", { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export default function NuevoIngresoPage() {
  const { data } = useQuery<NewHiresResponse>({
    queryKey: ["nuevo-ingreso"],
    queryFn: fetchNewHires,
    refetchInterval: POLL_INTERVAL_MS,
  });

  // Save to cache on successful fetch
  useEffect(() => {
    if (data) saveCache(data);
  }, [data]);

  // Refetch on visibility change (TV waking from sleep)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchNewHires()
          .then(saveCache)
          .catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  // Daily 3:00 AM reload as memory leak backstop
  useEffect(() => {
    const now = new Date();
    const next3AM = new Date(now);
    next3AM.setHours(3, 0, 0, 0);
    if (next3AM <= now) next3AM.setDate(next3AM.getDate() + 1);
    const ms = next3AM.getTime() - now.getTime();
    const timeout = setTimeout(() => window.location.reload(), ms);
    return () => clearTimeout(timeout);
  }, []);

  const nuevosIngresos = data?.nuevosIngresos ?? [];
  const hasEvents = nuevosIngresos.length > 0;

  return (
    <main className="h-screen flex flex-col bg-gradient-to-br from-gray-100 to-gray-200">
      {/* Header */}
      <header className="flex items-center justify-between px-10 py-4 border-b border-gray-300">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">DIDT</h1>
          <p className="text-gray-400 text-sm">
            Dirección de Innovación y Desarrollo Tecnológico
          </p>
        </div>
        <Clock />
      </header>

      {/* Content */}
      <div className="flex-1 relative overflow-hidden">
        {hasEvents ? (
          <NewHireCarousel nuevosIngresos={nuevosIngresos} />
        ) : (
          <EmptyState />
        )}
      </div>

      {/* Footer */}
      <footer className="px-10 py-3 border-t border-gray-300 flex items-center justify-between">
        <span className="text-gray-400 text-xs">
          IMSS · Dirección de Innovación y Desarrollo Tecnológico
        </span>
        {data && (
          <span className="text-gray-400 text-xs">
            Actualizado:{" "}
            {new Date(data.fetchedAt).toLocaleTimeString("es-MX")}
          </span>
        )}
      </footer>
    </main>
  );
}
```

- [ ] **Step 2: Verify build and dev server**

```bash
npx tsc --noEmit
```

Then manually check `http://localhost:3000/nuevo-ingreso` loads without errors.

- [ ] **Step 3: Commit**

```bash
git add app/nuevo-ingreso/page.tsx
git commit -m "feat: add /nuevo-ingreso display page"
```
