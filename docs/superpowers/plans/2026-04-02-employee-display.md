# Employee Birthday & Anniversary Display — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the existing SQLite-based prototype with a Supabase-powered system featuring a dual-capsule carousel display, admin panel with auth, CSV import, and employee CRUD.

**Architecture:** Next.js 15 App Router with Supabase for DB/Auth/Storage. Display page is a full-screen passive carousel embedded in Ablesign. Admin panel is protected by Supabase Auth. All event logic computed at query time.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, Framer Motion 11, Supabase (PostgreSQL + Auth + Storage), TanStack Query 5, PapaParse 5, date-fns 3, deployed on Netlify.

---

## File Structure

```
app/
  layout.tsx                         — root layout (keep, modify for QueryProvider)
  globals.css                        — global styles (keep, minor tweaks)
  page.tsx                           — display carousel (rewrite)
  admin/
    layout.tsx                       — admin layout with auth guard
    login/
      page.tsx                       — login form
    page.tsx                         — employee table (dashboard)
    empleados/
      nuevo/
        page.tsx                     — new employee form
      [id]/
        editar/
          page.tsx                   — edit employee form
    importar/
      cumpleanos/
        page.tsx                     — birthday CSV import
      aniversarios/
        page.tsx                     — anniversary CSV import
  api/
    events/
      route.ts                       — GET public events (rewrite)
    empleados/
      route.ts                       — POST create employee
      [id]/
        route.ts                     — PUT update, DELETE employee
    import/
      cumpleanos/
        route.ts                     — POST birthday CSV
      aniversarios/
        route.ts                     — POST anniversary CSV
components/
  display/
    Carousel.tsx                     — main carousel controller
    Slide.tsx                        — 2-person slide layout
    EmployeeCard.tsx                 — single employee card (birthday or anniversary variant)
    CapsuleHeader.tsx                — capsule title bar ("Cumpleaños" / "Aniversarios")
    EmptyState.tsx                   — no events screen (rewrite)
    Clock.tsx                        — clock widget (keep as-is)
    InitialsAvatar.tsx               — fallback avatar with initials
  admin/
    EmployeeTable.tsx                — searchable employee list
    EmployeeForm.tsx                 — reusable form for new/edit
    CsvUploader.tsx                  — reusable CSV upload + result display
    ImportResult.tsx                 — import summary component
lib/
  supabase/
    client.ts                        — browser Supabase client
    server.ts                        — server Supabase client (cookies)
    middleware.ts                     — auth session refresh
  domain/
    types.ts                         — shared TypeScript types (rewrite)
    events.ts                        — birthday/anniversary query logic (rewrite)
    csv-parser.ts                    — CSV parsing + validation
  providers/
    QueryProvider.tsx                 — TanStack Query provider wrapper
middleware.ts                        — Next.js middleware (auth redirect)
netlify.toml                         — Netlify config (update)
.env.example                         — env vars (update)
```

---

## Task 1: Clean up old code and update dependencies

**Files:**
- Delete: `lib/db/client.ts`, `lib/db/schema.ts`, `lib/db/migrate.ts`, `drizzle.config.ts`, `drizzle/`
- Delete: `lib/domain/types.ts`, `lib/domain/events.ts`
- Delete: `components/display/BirthdayCard.tsx`, `components/display/EmptyState.tsx`
- Delete: `app/page.tsx`, `app/admin/page.tsx`, `app/api/events/route.ts`
- Modify: `package.json`
- Modify: `.env.example`
- Modify: `netlify.toml`

- [ ] **Step 1: Remove old SQLite/Drizzle dependencies and files**

```bash
rm -f drizzle.config.ts
rm -rf drizzle/
rm -f lib/db/client.ts lib/db/schema.ts lib/db/migrate.ts
rmdir lib/db 2>/dev/null || true
rm -f lib/domain/types.ts lib/domain/events.ts
rm -f components/display/BirthdayCard.tsx components/display/EmptyState.tsx
rm -f app/page.tsx app/admin/page.tsx app/api/events/route.ts
```

- [ ] **Step 2: Uninstall old packages, install new ones**

```bash
npm uninstall better-sqlite3 drizzle-orm drizzle-kit @types/better-sqlite3
npm install @supabase/supabase-js @supabase/ssr
```

- [ ] **Step 3: Update `.env.example`**

Replace contents of `.env.example` with:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

- [ ] **Step 4: Update `netlify.toml`**

Replace contents of `netlify.toml` with:

```toml
[build]
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"

[build.environment]
  NODE_VERSION = "20"

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "ALLOWALL"
    Content-Security-Policy = "frame-ancestors *"
```

- [ ] **Step 5: Update `package.json` scripts**

Remove the `db:*` scripts from `package.json`. The `scripts` section becomes:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: remove SQLite/Drizzle, add Supabase deps, update config"
```

---

## Task 2: Supabase client setup and auth middleware

**Files:**
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/server.ts`
- Create: `lib/supabase/middleware.ts`
- Create: `middleware.ts`

- [ ] **Step 1: Create browser Supabase client**

Create `lib/supabase/client.ts`:

```typescript
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

- [ ] **Step 2: Create server Supabase client**

Create `lib/supabase/server.ts`:

```typescript
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from Server Component — ignore
          }
        },
      },
    }
  );
}
```

- [ ] **Step 3: Create middleware helper**

Create `lib/supabase/middleware.ts`:

```typescript
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect unauthenticated users away from /admin (except login page)
  if (
    !user &&
    request.nextUrl.pathname.startsWith("/admin") &&
    !request.nextUrl.pathname.startsWith("/admin/login")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
```

- [ ] **Step 4: Create root middleware**

Create `middleware.ts` at project root:

```typescript
import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: ["/admin/:path*"],
};
```

- [ ] **Step 5: Commit**

```bash
git add lib/supabase/ middleware.ts
git commit -m "feat: add Supabase client setup and auth middleware"
```

---

## Task 3: Shared types and event query logic

**Files:**
- Create: `lib/domain/types.ts`
- Create: `lib/domain/events.ts`

- [ ] **Step 1: Create shared types**

Create `lib/domain/types.ts`:

```typescript
export interface Empleado {
  id: string;
  matricula: string;
  nombre: string;
  fecha_nacimiento: string; // "YYYY-MM-DD"
  fecha_ingreso: string;    // "YYYY-MM-DD"
  foto_url: string | null;
  created_at: string;
}

export interface BirthdayEvent {
  empleado: Empleado;
  fechaCumple: string; // "15 de Mayo" — formatted for display
}

export interface AnniversaryEvent {
  empleado: Empleado;
  anosServicio: number;
}

export interface EventsResponse {
  cumpleanos: BirthdayEvent[];
  aniversarios: AnniversaryEvent[];
  fetchedAt: string;
}

export interface ImportResult {
  created: number;
  updated: number;
  errors: { row: number; message: string }[];
}
```

- [ ] **Step 2: Create event query logic**

Create `lib/domain/events.ts`:

```typescript
import { getMonth, getDate, getYear, addDays, format } from "date-fns";
import { es } from "date-fns/locale";
import type { Empleado, BirthdayEvent, AnniversaryEvent } from "./types";

/**
 * Parse "YYYY-MM-DD" into { month (1-12), day (1-31), year }.
 * Never uses new Date("YYYY-MM-DD") to avoid timezone bugs.
 */
function parseDateString(dateStr: string): {
  year: number;
  month: number;
  day: number;
} | null {
  const parts = dateStr.split("-");
  if (parts.length !== 3) return null;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
  return { year, month, day };
}

/**
 * Returns employees whose birthday falls within the next 15 days.
 */
export function getBirthdaysInWindow(
  empleados: Empleado[],
  referenceDate: Date = new Date()
): BirthdayEvent[] {
  const windowDays: { month: number; day: number }[] = [];
  for (let i = 0; i < 15; i++) {
    const d = addDays(referenceDate, i);
    windowDays.push({ month: getMonth(d) + 1, day: getDate(d) });
  }

  const results: BirthdayEvent[] = [];

  for (const emp of empleados) {
    const parsed = parseDateString(emp.fecha_nacimiento);
    if (!parsed) continue;

    const match = windowDays.find(
      (w) => w.month === parsed.month && w.day === parsed.day
    );
    if (match) {
      results.push({
        empleado: emp,
        fechaCumple: format(
          new Date(2000, match.month - 1, match.day),
          "d 'de' MMMM",
          { locale: es }
        ),
      });
    }
  }

  // Sort by how soon the birthday is (within the 15-day window)
  results.sort((a, b) => {
    const pa = parseDateString(a.empleado.fecha_nacimiento)!;
    const pb = parseDateString(b.empleado.fecha_nacimiento)!;
    const idxA = windowDays.findIndex(
      (w) => w.month === pa.month && w.day === pa.day
    );
    const idxB = windowDays.findIndex(
      (w) => w.month === pb.month && w.day === pb.day
    );
    return idxA - idxB;
  });

  return results;
}

/**
 * Returns employees whose hire anniversary falls in the current month.
 */
export function getAnniversariesInMonth(
  empleados: Empleado[],
  referenceDate: Date = new Date()
): AnniversaryEvent[] {
  const currentMonth = getMonth(referenceDate) + 1;
  const currentYear = getYear(referenceDate);

  const results: AnniversaryEvent[] = [];

  for (const emp of empleados) {
    const parsed = parseDateString(emp.fecha_ingreso);
    if (!parsed) continue;

    if (parsed.month === currentMonth && parsed.year < currentYear) {
      results.push({
        empleado: emp,
        anosServicio: currentYear - parsed.year,
      });
    }
  }

  // Sort by day of month
  results.sort((a, b) => {
    const pa = parseDateString(a.empleado.fecha_ingreso)!;
    const pb = parseDateString(b.empleado.fecha_ingreso)!;
    return pa.day - pb.day;
  });

  return results;
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/domain/
git commit -m "feat: add shared types and event query logic for birthdays/anniversaries"
```

---

## Task 4: Events API route

**Files:**
- Create: `app/api/events/route.ts`

- [ ] **Step 1: Create the events API route**

Create `app/api/events/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getBirthdaysInWindow, getAnniversariesInMonth } from "@/lib/domain/events";
import type { Empleado, EventsResponse } from "@/lib/domain/types";

// Use service role for public read — no auth needed for display
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const revalidate = 300; // 5 min cache on Netlify

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("empleados")
      .select("*");

    if (error) throw error;

    const empleados = data as Empleado[];
    const now = new Date();

    const response: EventsResponse = {
      cumpleanos: getBirthdaysInWindow(empleados, now),
      aniversarios: getAnniversariesInMonth(empleados, now),
      fetchedAt: now.toISOString(),
    };

    return NextResponse.json(response, {
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  } catch (error) {
    console.error("[/api/events] Error:", error);
    return NextResponse.json(
      { error: "Error al obtener eventos" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/events/route.ts
git commit -m "feat: add public events API route with Supabase"
```

---

## Task 5: Employee CRUD API routes

**Files:**
- Create: `app/api/empleados/route.ts`
- Create: `app/api/empleados/[id]/route.ts`

- [ ] **Step 1: Create POST /api/empleados**

Create `app/api/empleados/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const { matricula, nombre, fecha_nacimiento, fecha_ingreso, foto_url } = body;

  if (!matricula || !nombre || !fecha_nacimiento || !fecha_ingreso) {
    return NextResponse.json(
      { error: "Campos requeridos: matricula, nombre, fecha_nacimiento, fecha_ingreso" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("empleados")
    .insert({ matricula, nombre, fecha_nacimiento, fecha_ingreso, foto_url })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Ya existe un empleado con esa matrícula" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
```

- [ ] **Step 2: Create PUT and DELETE /api/empleados/[id]**

Create `app/api/empleados/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const { matricula, nombre, fecha_nacimiento, fecha_ingreso, foto_url } = body;

  const { data, error } = await supabase
    .from("empleados")
    .update({ matricula, nombre, fecha_nacimiento, fecha_ingreso, foto_url })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Empleado no encontrado" }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { error } = await supabase.from("empleados").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/empleados/
git commit -m "feat: add employee CRUD API routes"
```

---

## Task 6: CSV parser and import API routes

**Files:**
- Create: `lib/domain/csv-parser.ts`
- Create: `app/api/import/cumpleanos/route.ts`
- Create: `app/api/import/aniversarios/route.ts`

- [ ] **Step 1: Create CSV parser utility**

Create `lib/domain/csv-parser.ts`:

```typescript
import Papa from "papaparse";
import type { ImportResult } from "./types";

interface BirthdayCsvRow {
  matricula?: string;
  nombre?: string;
  fecha_nacimiento?: string;
}

interface AnniversaryCsvRow {
  matricula?: string;
  nombre?: string;
  fecha_ingreso?: string;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(val: string): boolean {
  if (!DATE_RE.test(val)) return false;
  const [y, m, d] = val.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return (
    date.getFullYear() === y &&
    date.getMonth() === m - 1 &&
    date.getDate() === d
  );
}

export function parseBirthdayCsv(csvText: string): {
  valid: { matricula: string; nombre: string; fecha_nacimiento: string }[];
  errors: ImportResult["errors"];
} {
  const { data } = Papa.parse<BirthdayCsvRow>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });

  const valid: { matricula: string; nombre: string; fecha_nacimiento: string }[] = [];
  const errors: ImportResult["errors"] = [];
  const seenMatriculas = new Set<string>();

  data.forEach((row, i) => {
    const rowNum = i + 2; // +2 for 1-indexed + header row
    const matricula = row.matricula?.trim();
    const nombre = row.nombre?.trim();
    const fecha = row.fecha_nacimiento?.trim();

    if (!matricula) {
      errors.push({ row: rowNum, message: "Matrícula vacía" });
      return;
    }
    if (!nombre) {
      errors.push({ row: rowNum, message: "Nombre vacío" });
      return;
    }
    if (!fecha || !isValidDate(fecha)) {
      errors.push({
        row: rowNum,
        message: `Fecha inválida: "${fecha ?? ""}" — formato esperado: YYYY-MM-DD`,
      });
      return;
    }
    if (seenMatriculas.has(matricula)) {
      errors.push({ row: rowNum, message: `Matrícula duplicada: ${matricula}` });
      return;
    }

    seenMatriculas.add(matricula);
    valid.push({ matricula, nombre, fecha_nacimiento: fecha });
  });

  return { valid, errors };
}

export function parseAnniversaryCsv(csvText: string): {
  valid: { matricula: string; nombre: string; fecha_ingreso: string }[];
  errors: ImportResult["errors"];
} {
  const { data } = Papa.parse<AnniversaryCsvRow>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });

  const valid: { matricula: string; nombre: string; fecha_ingreso: string }[] = [];
  const errors: ImportResult["errors"] = [];
  const seenMatriculas = new Set<string>();

  data.forEach((row, i) => {
    const rowNum = i + 2;
    const matricula = row.matricula?.trim();
    const nombre = row.nombre?.trim();
    const fecha = row.fecha_ingreso?.trim();

    if (!matricula) {
      errors.push({ row: rowNum, message: "Matrícula vacía" });
      return;
    }
    if (!nombre) {
      errors.push({ row: rowNum, message: "Nombre vacío" });
      return;
    }
    if (!fecha || !isValidDate(fecha)) {
      errors.push({
        row: rowNum,
        message: `Fecha inválida: "${fecha ?? ""}" — formato esperado: YYYY-MM-DD`,
      });
      return;
    }
    if (seenMatriculas.has(matricula)) {
      errors.push({ row: rowNum, message: `Matrícula duplicada: ${matricula}` });
      return;
    }

    seenMatriculas.add(matricula);
    valid.push({ matricula, nombre, fecha_ingreso: fecha });
  });

  return { valid, errors };
}
```

- [ ] **Step 2: Create birthday import API route**

Create `app/api/import/cumpleanos/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { parseBirthdayCsv } from "@/lib/domain/csv-parser";
import type { ImportResult } from "@/lib/domain/types";

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No se envió archivo" }, { status: 400 });
  }

  const text = await file.text();
  const { valid, errors } = parseBirthdayCsv(text);

  let created = 0;
  let updated = 0;

  for (const row of valid) {
    // Check if employee exists
    const { data: existing } = await supabase
      .from("empleados")
      .select("id")
      .eq("matricula", row.matricula)
      .single();

    if (existing) {
      await supabase
        .from("empleados")
        .update({
          nombre: row.nombre,
          fecha_nacimiento: row.fecha_nacimiento,
        })
        .eq("matricula", row.matricula);
      updated++;
    } else {
      await supabase.from("empleados").insert({
        matricula: row.matricula,
        nombre: row.nombre,
        fecha_nacimiento: row.fecha_nacimiento,
        fecha_ingreso: "1900-01-01", // placeholder — will be set via anniversary import
      });
      created++;
    }
  }

  const result: ImportResult = { created, updated, errors };
  return NextResponse.json(result);
}
```

- [ ] **Step 3: Create anniversary import API route**

Create `app/api/import/aniversarios/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { parseAnniversaryCsv } from "@/lib/domain/csv-parser";
import type { ImportResult } from "@/lib/domain/types";

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No se envió archivo" }, { status: 400 });
  }

  const text = await file.text();
  const { valid, errors } = parseAnniversaryCsv(text);

  let created = 0;
  let updated = 0;

  for (const row of valid) {
    const { data: existing } = await supabase
      .from("empleados")
      .select("id")
      .eq("matricula", row.matricula)
      .single();

    if (existing) {
      await supabase
        .from("empleados")
        .update({
          nombre: row.nombre,
          fecha_ingreso: row.fecha_ingreso,
        })
        .eq("matricula", row.matricula);
      updated++;
    } else {
      await supabase.from("empleados").insert({
        matricula: row.matricula,
        nombre: row.nombre,
        fecha_nacimiento: "1900-01-01", // placeholder — will be set via birthday import
        fecha_ingreso: row.fecha_ingreso,
      });
      created++;
    }
  }

  const result: ImportResult = { created, updated, errors };
  return NextResponse.json(result);
}
```

- [ ] **Step 4: Commit**

```bash
git add lib/domain/csv-parser.ts app/api/import/
git commit -m "feat: add CSV parser and birthday/anniversary import API routes"
```

---

## Task 7: TanStack Query provider

**Files:**
- Create: `lib/providers/QueryProvider.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Create QueryProvider**

Create `lib/providers/QueryProvider.tsx`:

```typescript
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
```

- [ ] **Step 2: Update root layout**

Replace `app/layout.tsx` with:

```typescript
import type { Metadata } from "next";
import { QueryProvider } from "@/lib/providers/QueryProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "TechVeo — DIDT",
  description: "Pantalla de cumpleaños y aniversarios DIDT IMSS",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/providers/QueryProvider.tsx app/layout.tsx
git commit -m "feat: add TanStack Query provider to root layout"
```

---

## Task 8: Display components — cards, slides, carousel

**Files:**
- Create: `components/display/InitialsAvatar.tsx`
- Create: `components/display/EmployeeCard.tsx`
- Create: `components/display/CapsuleHeader.tsx`
- Create: `components/display/Slide.tsx`
- Create: `components/display/EmptyState.tsx` (rewrite)
- Create: `components/display/Carousel.tsx`

- [ ] **Step 1: Create InitialsAvatar**

Create `components/display/InitialsAvatar.tsx`:

```typescript
"use client";

export function InitialsAvatar({
  nombre,
  className = "",
}: {
  nombre: string;
  className?: string;
}) {
  const initials = nombre
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");

  return (
    <div
      className={`flex items-center justify-center bg-white/10 text-white font-bold text-2xl ${className}`}
    >
      {initials}
    </div>
  );
}
```

- [ ] **Step 2: Create EmployeeCard**

Create `components/display/EmployeeCard.tsx`:

```typescript
"use client";

import { motion } from "framer-motion";
import { InitialsAvatar } from "./InitialsAvatar";
import type { BirthdayEvent, AnniversaryEvent } from "@/lib/domain/types";

interface BirthdayProps {
  type: "birthday";
  event: BirthdayEvent;
}

interface AnniversaryProps {
  type: "anniversary";
  event: AnniversaryEvent;
}

type Props = BirthdayProps | AnniversaryProps;

export function EmployeeCard(props: Props) {
  const isBirthday = props.type === "birthday";
  const empleado = isBirthday ? props.event.empleado : props.event.empleado;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.5 }}
      className={`
        flex flex-col items-center text-center p-8 rounded-3xl border flex-1
        ${
          isBirthday
            ? "bg-gradient-to-b from-pink-950/60 to-pink-900/30 border-pink-700/40"
            : "bg-gradient-to-b from-amber-950/60 to-amber-900/30 border-amber-700/40"
        }
      `}
    >
      {/* Photo or avatar */}
      {empleado.foto_url ? (
        <img
          src={empleado.foto_url}
          alt={empleado.nombre}
          className="w-32 h-32 rounded-full object-cover border-4 border-white/20 mb-6"
        />
      ) : (
        <InitialsAvatar
          nombre={empleado.nombre}
          className="w-32 h-32 rounded-full border-4 border-white/20 mb-6"
        />
      )}

      {/* Name */}
      <h3 className="text-2xl font-bold text-white leading-tight mb-3">
        {empleado.nombre}
      </h3>

      {/* Event detail */}
      {isBirthday ? (
        <p className="text-pink-300 text-lg font-medium">
          {props.event.fechaCumple}
        </p>
      ) : (
        <p className="text-amber-300 text-lg font-medium">
          {props.event.anosServicio}{" "}
          {props.event.anosServicio === 1 ? "año" : "años"} de servicio
        </p>
      )}
    </motion.div>
  );
}
```

- [ ] **Step 3: Create CapsuleHeader**

Create `components/display/CapsuleHeader.tsx`:

```typescript
"use client";

export function CapsuleHeader({
  type,
}: {
  type: "birthday" | "anniversary";
}) {
  const isBirthday = type === "birthday";

  return (
    <div
      className={`
        text-center py-4 mb-8
        ${isBirthday ? "text-pink-300" : "text-amber-300"}
      `}
    >
      <span className="text-5xl mb-2 block">
        {isBirthday ? "🎂" : "🏆"}
      </span>
      <h2 className="text-3xl font-bold uppercase tracking-wider">
        {isBirthday ? "Cumpleaños" : "Aniversarios de Servicio"}
      </h2>
    </div>
  );
}
```

- [ ] **Step 4: Create Slide**

Create `components/display/Slide.tsx`:

```typescript
"use client";

import { motion } from "framer-motion";
import { EmployeeCard } from "./EmployeeCard";
import { CapsuleHeader } from "./CapsuleHeader";
import type { BirthdayEvent, AnniversaryEvent } from "@/lib/domain/types";

interface BirthdaySlideProps {
  type: "birthday";
  events: [BirthdayEvent] | [BirthdayEvent, BirthdayEvent];
}

interface AnniversarySlideProps {
  type: "anniversary";
  events: [AnniversaryEvent] | [AnniversaryEvent, AnniversaryEvent];
}

type Props = BirthdaySlideProps | AnniversarySlideProps;

export function Slide(props: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 80 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -80 }}
      transition={{ duration: 0.6 }}
      className="absolute inset-0 flex flex-col items-center justify-center px-16"
    >
      <CapsuleHeader type={props.type} />
      <div className="flex gap-12 w-full max-w-5xl justify-center">
        {props.type === "birthday"
          ? (props.events as BirthdayEvent[]).map((event) => (
              <EmployeeCard
                key={event.empleado.id}
                type="birthday"
                event={event}
              />
            ))
          : (props.events as AnniversaryEvent[]).map((event) => (
              <EmployeeCard
                key={event.empleado.id}
                type="anniversary"
                event={event}
              />
            ))}
      </div>
    </motion.div>
  );
}
```

- [ ] **Step 5: Rewrite EmptyState**

Create `components/display/EmptyState.tsx`:

```typescript
"use client";

import { motion } from "framer-motion";

export function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center h-full text-white/40"
    >
      <span className="text-9xl mb-8">📅</span>
      <p className="text-3xl font-medium">Sin eventos este periodo</p>
      <p className="text-lg mt-3">DIDT — Dirección de Innovación y Desarrollo Tecnológico</p>
    </motion.div>
  );
}
```

- [ ] **Step 6: Create Carousel**

Create `components/display/Carousel.tsx`:

```typescript
"use client";

import { useState, useEffect, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { Slide } from "./Slide";
import type { BirthdayEvent, AnniversaryEvent } from "@/lib/domain/types";

const SLIDE_DURATION_MS = 8000;

interface SlideData {
  type: "birthday" | "anniversary";
  events: [BirthdayEvent] | [BirthdayEvent, BirthdayEvent] | [AnniversaryEvent] | [AnniversaryEvent, AnniversaryEvent];
}

function buildSlides(
  cumpleanos: BirthdayEvent[],
  aniversarios: AnniversaryEvent[]
): SlideData[] {
  const slides: SlideData[] = [];

  // Birthday slides (2 per slide)
  for (let i = 0; i < cumpleanos.length; i += 2) {
    const pair = cumpleanos.slice(i, i + 2) as [BirthdayEvent] | [BirthdayEvent, BirthdayEvent];
    slides.push({ type: "birthday", events: pair });
  }

  // Anniversary slides (2 per slide)
  for (let i = 0; i < aniversarios.length; i += 2) {
    const pair = aniversarios.slice(i, i + 2) as [AnniversaryEvent] | [AnniversaryEvent, AnniversaryEvent];
    slides.push({ type: "anniversary", events: pair });
  }

  return slides;
}

export function Carousel({
  cumpleanos,
  aniversarios,
}: {
  cumpleanos: BirthdayEvent[];
  aniversarios: AnniversaryEvent[];
}) {
  const slides = buildSlides(cumpleanos, aniversarios);
  const [currentIndex, setCurrentIndex] = useState(0);

  const advance = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  useEffect(() => {
    if (slides.length <= 1) return;
    const interval = setInterval(advance, SLIDE_DURATION_MS);
    return () => clearInterval(interval);
  }, [advance, slides.length]);

  // Reset index if slides change and current index is out of bounds
  useEffect(() => {
    if (currentIndex >= slides.length) {
      setCurrentIndex(0);
    }
  }, [slides.length, currentIndex]);

  if (slides.length === 0) return null;

  const slide = slides[currentIndex];

  return (
    <div className="relative w-full h-full">
      <AnimatePresence mode="wait">
        {slide.type === "birthday" ? (
          <Slide
            key={`birthday-${currentIndex}`}
            type="birthday"
            events={slide.events as [BirthdayEvent] | [BirthdayEvent, BirthdayEvent]}
          />
        ) : (
          <Slide
            key={`anniversary-${currentIndex}`}
            type="anniversary"
            events={slide.events as [AnniversaryEvent] | [AnniversaryEvent, AnniversaryEvent]}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add components/display/
git commit -m "feat: add display components — cards, slides, carousel, empty state"
```

---

## Task 9: Display page (main page)

**Files:**
- Create: `app/page.tsx`

- [ ] **Step 1: Create the display page**

Create `app/page.tsx`:

```typescript
"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Carousel } from "@/components/display/Carousel";
import { Clock } from "@/components/display/Clock";
import { EmptyState } from "@/components/display/EmptyState";
import type { EventsResponse } from "@/lib/domain/types";

const POLL_INTERVAL_MS = 5 * 60 * 1000;
const CACHE_KEY = "techveo:last-events";

function loadCache(): EventsResponse | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as EventsResponse) : null;
  } catch {
    return null;
  }
}

function saveCache(data: EventsResponse) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // localStorage unavailable in some kiosk setups
  }
}

async function fetchEvents(): Promise<EventsResponse> {
  const res = await fetch("/api/events", { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export default function DisplayPage() {
  const { data } = useQuery<EventsResponse>({
    queryKey: ["events"],
    queryFn: fetchEvents,
    refetchInterval: POLL_INTERVAL_MS,
    initialData: loadCache() ?? undefined,
  });

  // Save to cache on successful fetch
  useEffect(() => {
    if (data) saveCache(data);
  }, [data]);

  // Refetch on visibility change (TV waking from sleep)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchEvents()
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

  const cumpleanos = data?.cumpleanos ?? [];
  const aniversarios = data?.aniversarios ?? [];
  const hasEvents = cumpleanos.length > 0 || aniversarios.length > 0;

  return (
    <main className="h-screen flex flex-col bg-gray-950">
      {/* Header */}
      <header className="flex items-center justify-between px-10 py-5 border-b border-white/10">
        <div>
          <h1 className="text-2xl font-bold text-white">
            DIDT
          </h1>
          <p className="text-white/40 text-sm">
            Dirección de Innovación y Desarrollo Tecnológico
          </p>
        </div>
        <Clock />
      </header>

      {/* Content */}
      <div className="flex-1 relative overflow-hidden">
        {hasEvents ? (
          <Carousel cumpleanos={cumpleanos} aniversarios={aniversarios} />
        ) : (
          <EmptyState />
        )}
      </div>

      {/* Footer */}
      <footer className="px-10 py-3 border-t border-white/10 flex items-center justify-between">
        <span className="text-white/20 text-xs">
          IMSS · Dirección de Innovación y Desarrollo Tecnológico
        </span>
        {data && (
          <span className="text-white/20 text-xs">
            Actualizado: {new Date(data.fetchedAt).toLocaleTimeString("es-MX")}
          </span>
        )}
      </footer>
    </main>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/page.tsx
git commit -m "feat: add display page with polling, cache, and carousel"
```

---

## Task 10: Admin login page

**Files:**
- Create: `app/admin/login/page.tsx`

- [ ] **Step 1: Create login page**

Create `app/admin/login/page.tsx`:

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError("Credenciales incorrectas");
      setLoading(false);
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-8">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-sm bg-gray-900 rounded-2xl border border-white/10 p-8"
      >
        <h1 className="text-2xl font-bold mb-2">Administración</h1>
        <p className="text-white/50 text-sm mb-8">TechVeo — DIDT</p>

        <label className="block text-sm text-white/70 mb-1">Correo</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full mb-4 px-4 py-3 bg-gray-800 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
        />

        <label className="block text-sm text-white/70 mb-1">Contraseña</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full mb-6 px-4 py-3 bg-gray-800 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
        />

        {error && (
          <p className="text-red-400 text-sm mb-4">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl font-semibold transition-colors"
        >
          {loading ? "Ingresando…" : "Ingresar"}
        </button>
      </form>
    </main>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/admin/login/
git commit -m "feat: add admin login page with Supabase Auth"
```

---

## Task 11: Admin layout and employee list (dashboard)

**Files:**
- Create: `app/admin/layout.tsx`
- Create: `app/admin/page.tsx`
- Create: `components/admin/EmployeeTable.tsx`

- [ ] **Step 1: Create admin layout**

Create `app/admin/layout.tsx`:

```typescript
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Allow login page without auth
  // Middleware handles redirect, but this is a server-side backstop
  if (!user) {
    // Layout wraps login page too, so we just render children
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="flex items-center justify-between px-8 py-4 border-b border-white/10">
        <div className="flex items-center gap-6">
          <span className="text-lg font-bold">TechVeo Admin</span>
          <a href="/admin" className="text-white/60 hover:text-white text-sm transition-colors">
            Empleados
          </a>
          <a href="/admin/importar/cumpleanos" className="text-white/60 hover:text-white text-sm transition-colors">
            Importar Cumpleaños
          </a>
          <a href="/admin/importar/aniversarios" className="text-white/60 hover:text-white text-sm transition-colors">
            Importar Aniversarios
          </a>
        </div>
        <div className="flex items-center gap-4">
          <a href="/" target="_blank" className="text-white/40 hover:text-white/70 text-sm transition-colors">
            Ver pantalla TV ↗
          </a>
          <form action="/api/auth/logout" method="POST">
            <button className="text-white/40 hover:text-red-400 text-sm transition-colors">
              Cerrar sesión
            </button>
          </form>
        </div>
      </nav>
      <main className="p-8">{children}</main>
    </div>
  );
}
```

- [ ] **Step 2: Create EmployeeTable component**

Create `components/admin/EmployeeTable.tsx`:

```typescript
"use client";

import { useState } from "react";
import type { Empleado } from "@/lib/domain/types";

export function EmployeeTable({ empleados }: { empleados: Empleado[] }) {
  const [search, setSearch] = useState("");

  const filtered = empleados.filter(
    (e) =>
      e.nombre.toLowerCase().includes(search.toLowerCase()) ||
      e.matricula.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <input
          type="text"
          placeholder="Buscar por nombre o matrícula…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-4 py-2 bg-gray-800 border border-white/10 rounded-lg text-white w-80 focus:outline-none focus:border-white/30"
        />
        <a
          href="/admin/empleados/nuevo"
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg font-semibold transition-colors"
        >
          + Nuevo empleado
        </a>
      </div>

      <div className="bg-gray-900 rounded-xl border border-white/10 overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/10 text-white/50 text-sm uppercase tracking-wider">
              <th className="px-6 py-3">Matrícula</th>
              <th className="px-6 py-3">Nombre</th>
              <th className="px-6 py-3">Cumpleaños</th>
              <th className="px-6 py-3">Fecha Ingreso</th>
              <th className="px-6 py-3">Foto</th>
              <th className="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((emp) => (
              <tr
                key={emp.id}
                className="border-b border-white/5 hover:bg-white/5 transition-colors"
              >
                <td className="px-6 py-4 font-mono text-sm">{emp.matricula}</td>
                <td className="px-6 py-4">{emp.nombre}</td>
                <td className="px-6 py-4 text-white/70">{emp.fecha_nacimiento}</td>
                <td className="px-6 py-4 text-white/70">{emp.fecha_ingreso}</td>
                <td className="px-6 py-4">
                  {emp.foto_url ? (
                    <img
                      src={emp.foto_url}
                      alt=""
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-white/30 text-sm">Sin foto</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <a
                    href={`/admin/empleados/${emp.id}/editar`}
                    className="text-emerald-400 hover:text-emerald-300 text-sm transition-colors"
                  >
                    Editar
                  </a>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-white/30">
                  {search ? "Sin resultados" : "No hay empleados registrados"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-white/30 text-sm mt-4">
        {filtered.length} de {empleados.length} empleados
      </p>
    </div>
  );
}
```

- [ ] **Step 3: Create admin dashboard page**

Create `app/admin/page.tsx`:

```typescript
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { EmployeeTable } from "@/components/admin/EmployeeTable";
import { redirect } from "next/navigation";
import type { Empleado } from "@/lib/domain/types";

export default async function AdminDashboard() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: empleados } = await supabase
    .from("empleados")
    .select("*")
    .order("nombre");

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Empleados</h1>
      <EmployeeTable empleados={(empleados as Empleado[]) ?? []} />
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add app/admin/layout.tsx app/admin/page.tsx components/admin/EmployeeTable.tsx
git commit -m "feat: add admin layout, employee table, and dashboard page"
```

---

## Task 12: Employee form (new and edit)

**Files:**
- Create: `components/admin/EmployeeForm.tsx`
- Create: `app/admin/empleados/nuevo/page.tsx`
- Create: `app/admin/empleados/[id]/editar/page.tsx`

- [ ] **Step 1: Create reusable EmployeeForm**

Create `components/admin/EmployeeForm.tsx`:

```typescript
"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Empleado } from "@/lib/domain/types";

interface Props {
  empleado?: Empleado;
}

export function EmployeeForm({ empleado }: Props) {
  const isEditing = Boolean(empleado);
  const router = useRouter();
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [matricula, setMatricula] = useState(empleado?.matricula ?? "");
  const [nombre, setNombre] = useState(empleado?.nombre ?? "");
  const [fechaNacimiento, setFechaNacimiento] = useState(
    empleado?.fecha_nacimiento ?? ""
  );
  const [fechaIngreso, setFechaIngreso] = useState(
    empleado?.fecha_ingreso ?? ""
  );
  const [fotoUrl, setFotoUrl] = useState(empleado?.foto_url ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function uploadPhoto(): Promise<string | null> {
    const file = fileRef.current?.files?.[0];
    if (!file) return fotoUrl || null;

    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${matricula}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("fotos-empleados")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      setError(`Error al subir foto: ${uploadError.message}`);
      return null;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("fotos-empleados").getPublicUrl(path);

    return publicUrl;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const photoUrl = await uploadPhoto();
    if (error) {
      setLoading(false);
      return;
    }

    const body = {
      matricula,
      nombre,
      fecha_nacimiento: fechaNacimiento,
      fecha_ingreso: fechaIngreso,
      foto_url: photoUrl,
    };

    const url = isEditing ? `/api/empleados/${empleado!.id}` : "/api/empleados";
    const method = isEditing ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Error al guardar");
      setLoading(false);
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  async function handleDelete() {
    if (!empleado || !confirm("¿Eliminar este empleado?")) return;
    setLoading(true);

    const res = await fetch(`/api/empleados/${empleado.id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      setError("Error al eliminar");
      setLoading(false);
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
      <div>
        <label className="block text-sm text-white/70 mb-1">Matrícula</label>
        <input
          type="text"
          value={matricula}
          onChange={(e) => setMatricula(e.target.value)}
          required
          className="w-full px-4 py-3 bg-gray-800 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
        />
      </div>

      <div>
        <label className="block text-sm text-white/70 mb-1">Nombre completo</label>
        <input
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          required
          className="w-full px-4 py-3 bg-gray-800 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
        />
      </div>

      <div>
        <label className="block text-sm text-white/70 mb-1">Fecha de nacimiento</label>
        <input
          type="date"
          value={fechaNacimiento}
          onChange={(e) => setFechaNacimiento(e.target.value)}
          required
          className="w-full px-4 py-3 bg-gray-800 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
        />
      </div>

      <div>
        <label className="block text-sm text-white/70 mb-1">Fecha de ingreso</label>
        <input
          type="date"
          value={fechaIngreso}
          onChange={(e) => setFechaIngreso(e.target.value)}
          required
          className="w-full px-4 py-3 bg-gray-800 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
        />
      </div>

      <div>
        <label className="block text-sm text-white/70 mb-1">Foto</label>
        {fotoUrl && (
          <img
            src={fotoUrl}
            alt="Preview"
            className="w-16 h-16 rounded-full object-cover mb-2"
          />
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="block w-full text-sm text-white/70 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-gray-700 file:text-white hover:file:bg-gray-600 cursor-pointer"
        />
        <p className="text-white/40 text-xs mt-1">
          O ingresa una URL directa:
        </p>
        <input
          type="url"
          value={fotoUrl}
          onChange={(e) => setFotoUrl(e.target.value)}
          placeholder="https://..."
          className="w-full mt-1 px-4 py-2 bg-gray-800 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-white/30"
        />
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <div className="flex gap-4 pt-4">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl font-semibold transition-colors"
        >
          {loading ? "Guardando…" : isEditing ? "Actualizar" : "Crear empleado"}
        </button>

        {isEditing && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="px-6 py-3 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-xl font-semibold transition-colors"
          >
            Eliminar
          </button>
        )}
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Create new employee page**

Create `app/admin/empleados/nuevo/page.tsx`:

```typescript
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { EmployeeForm } from "@/components/admin/EmployeeForm";

export default async function NewEmployeePage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Nuevo empleado</h1>
      <EmployeeForm />
    </div>
  );
}
```

- [ ] **Step 3: Create edit employee page**

Create `app/admin/empleados/[id]/editar/page.tsx`:

```typescript
import { redirect, notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { EmployeeForm } from "@/components/admin/EmployeeForm";
import type { Empleado } from "@/lib/domain/types";

export default async function EditEmployeePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: empleado } = await supabase
    .from("empleados")
    .select("*")
    .eq("id", id)
    .single();

  if (!empleado) notFound();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Editar empleado</h1>
      <EmployeeForm empleado={empleado as Empleado} />
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add components/admin/EmployeeForm.tsx app/admin/empleados/
git commit -m "feat: add employee form (new/edit) with photo upload"
```

---

## Task 13: CSV import pages

**Files:**
- Create: `components/admin/CsvUploader.tsx`
- Create: `app/admin/importar/cumpleanos/page.tsx`
- Create: `app/admin/importar/aniversarios/page.tsx`

- [ ] **Step 1: Create reusable CsvUploader component**

Create `components/admin/CsvUploader.tsx`:

```typescript
"use client";

import { useState, useRef } from "react";
import type { ImportResult } from "@/lib/domain/types";

interface Props {
  title: string;
  description: string;
  expectedColumns: string;
  apiEndpoint: string;
}

export function CsvUploader({
  title,
  description,
  expectedColumns,
  apiEndpoint,
}: Props) {
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">(
    "idle"
  );
  const [result, setResult] = useState<ImportResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    setStatus("loading");
    setResult(null);
    setErrorMsg("");

    const form = new FormData();
    form.append("file", file);

    try {
      const res = await fetch(apiEndpoint, { method: "POST", body: form });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error ?? "Error desconocido");
        setStatus("error");
        return;
      }

      setResult(data as ImportResult);
      setStatus("ok");
    } catch {
      setErrorMsg("No se pudo conectar con el servidor");
      setStatus("error");
    }
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold mb-2">{title}</h1>
      <p className="text-white/50 text-sm mb-6">{description}</p>

      <div className="bg-gray-800 rounded-lg p-4 mb-6 text-xs font-mono text-white/70">
        <p className="text-white/40 mb-1">Columnas esperadas en el CSV:</p>
        <p>{expectedColumns}</p>
        <p className="text-white/40 mt-1">Formato de fecha: YYYY-MM-DD</p>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".csv"
        className="block w-full text-sm text-white/70 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 cursor-pointer mb-4"
      />

      <button
        onClick={handleUpload}
        disabled={status === "loading"}
        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl font-semibold transition-colors"
      >
        {status === "loading" ? "Importando…" : "Importar CSV"}
      </button>

      {status === "ok" && result && (
        <div className="mt-6 p-4 bg-emerald-900/50 border border-emerald-700/50 rounded-lg">
          <p className="text-emerald-400 font-semibold">Importación completada</p>
          <p className="text-white/70 text-sm mt-1">
            Creados: {result.created} · Actualizados: {result.updated}
          </p>
          {result.errors.length > 0 && (
            <details className="mt-3">
              <summary className="text-yellow-400 text-sm cursor-pointer">
                {result.errors.length} errores
              </summary>
              <ul className="mt-2 text-xs text-white/50 space-y-1">
                {result.errors.map((e, i) => (
                  <li key={i}>
                    Fila {e.row}: {e.message}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      {status === "error" && (
        <div className="mt-6 p-4 bg-red-900/50 border border-red-700/50 rounded-lg">
          <p className="text-red-400 font-semibold">Error</p>
          <p className="text-white/70 text-sm mt-1">{errorMsg}</p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create birthday import page**

Create `app/admin/importar/cumpleanos/page.tsx`:

```typescript
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { CsvUploader } from "@/components/admin/CsvUploader";

export default async function ImportBirthdaysPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  return (
    <CsvUploader
      title="Importar Cumpleaños"
      description="Carga un archivo CSV con las fechas de cumpleaños de los empleados"
      expectedColumns="matricula, nombre, fecha_nacimiento"
      apiEndpoint="/api/import/cumpleanos"
    />
  );
}
```

- [ ] **Step 3: Create anniversary import page**

Create `app/admin/importar/aniversarios/page.tsx`:

```typescript
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { CsvUploader } from "@/components/admin/CsvUploader";

export default async function ImportAnniversariesPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  return (
    <CsvUploader
      title="Importar Aniversarios"
      description="Carga un archivo CSV con las fechas de ingreso de los empleados"
      expectedColumns="matricula, nombre, fecha_ingreso"
      apiEndpoint="/api/import/aniversarios"
    />
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add components/admin/CsvUploader.tsx app/admin/importar/
git commit -m "feat: add CSV import pages for birthdays and anniversaries"
```

---

## Task 14: Supabase database setup instructions and globals update

**Files:**
- Create: `docs/supabase-setup.md`
- Modify: `app/globals.css`

- [ ] **Step 1: Create Supabase setup instructions**

Create `docs/supabase-setup.md`:

```markdown
# Supabase Setup

## 1. Create the `empleados` table

Run this SQL in the Supabase SQL editor:

```sql
CREATE TABLE empleados (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  matricula TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  fecha_nacimiento DATE NOT NULL,
  fecha_ingreso DATE NOT NULL,
  foto_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

## 2. Enable Row Level Security

```sql
ALTER TABLE empleados ENABLE ROW LEVEL SECURITY;

-- Public read (for display page)
CREATE POLICY "Public read" ON empleados
  FOR SELECT USING (true);

-- Authenticated write
CREATE POLICY "Auth insert" ON empleados
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Auth update" ON empleados
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Auth delete" ON empleados
  FOR DELETE USING (auth.role() = 'authenticated');
```

## 3. Create Storage bucket

1. Go to Storage in Supabase dashboard
2. Create a new bucket called `fotos-empleados`
3. Set it to **public**
4. Add a policy for authenticated uploads:

```sql
CREATE POLICY "Auth upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'fotos-empleados' AND auth.role() = 'authenticated'
  );

CREATE POLICY "Auth overwrite" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'fotos-empleados' AND auth.role() = 'authenticated'
  );

CREATE POLICY "Public read storage" ON storage.objects
  FOR SELECT USING (bucket_id = 'fotos-empleados');
```

## 4. Create admin user

1. Go to Authentication > Users in Supabase dashboard
2. Click "Add user" > "Create new user"
3. Enter the admin email and password
4. This is the only user needed for the system

## 5. Environment variables

Copy `.env.example` to `.env.local` and fill in:

- `NEXT_PUBLIC_SUPABASE_URL` — from Supabase Settings > API
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from Supabase Settings > API
- `SUPABASE_SERVICE_ROLE_KEY` — from Supabase Settings > API (keep secret)
```

- [ ] **Step 2: Update globals.css**

Replace `app/globals.css` with:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --font-display: "Inter", system-ui, sans-serif;
}

/* TV display — no scrollbar, no cursor on display page */
body {
  @apply bg-gray-950 text-white;
}

/* Hide scrollbar but allow programmatic scroll */
* {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
*::-webkit-scrollbar {
  display: none;
}
```

- [ ] **Step 3: Commit**

```bash
git add docs/supabase-setup.md app/globals.css
git commit -m "docs: add Supabase setup instructions, update global styles"
```

---

## Task 15: Update CLAUDE.md and final cleanup

**Files:**
- Modify: `CLAUDE.md`
- Modify: `.env.example`

- [ ] **Step 1: Update CLAUDE.md to reflect new architecture**

Replace the content of `CLAUDE.md` to reflect the new Supabase-based architecture, updated tech stack, and file structure. Key changes:
- Remove all SQLite/Drizzle references
- Add Supabase (DB + Auth + Storage) references
- Update architecture section with new file paths
- Update critical domain rules (no more MM-DD storage — using full dates now)
- Keep the GSD workflow and Spanish language notes

- [ ] **Step 2: Verify the project builds**

```bash
npm run build
```

Expected: successful build with no type errors.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md .env.example
git commit -m "docs: update CLAUDE.md for Supabase architecture"
```

---

## Supabase Table Setup (Run Manually Before Starting)

Before executing any task, the developer must:

1. Create a Supabase project at https://supabase.com
2. Run the SQL from `docs/supabase-setup.md` (Task 14, Step 1)
3. Create the `fotos-empleados` storage bucket
4. Create the admin user in Supabase Auth
5. Copy `.env.example` to `.env.local` and fill in the keys
