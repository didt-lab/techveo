# TechNdencias Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a new `/techndencias` display screen plus an `/admin/techndencias` management page that let the DIDT admin publish 3 weekly tech-trend news items (title + short paragraph + image/video), shown one at a time in a 50/50 split-screen carousel.

**Architecture:** Follows the existing Ticker feature end-to-end: a public `GET` route backed by the service-role client for the display screen, auth-protected `POST/PUT/DELETE` routes for the admin CRUD, and a Supabase Storage bucket for media uploads (same upload pattern as employee photos, extended to also accept short videos). The display page reuses the polling/cache/visibility/reload skeleton from `app/nuevo-ingreso/page.tsx`.

**Tech Stack:** Next.js 15 App Router, Supabase (Postgres + Storage + Auth), TanStack Query, Framer Motion, Tailwind CSS.

**Note on verification:** This project has no automated test suite (see `CLAUDE.md`: "No test suite exists in this project"). Per that project convention, verification steps below use `npm run lint`, `npm run build`, and manual browser/curl checks instead of unit tests — the same approach used for the existing Ticker and Empleados features.

**Prerequisites already done (do not redo):**
- Table `tech_noticias` created in Supabase with columns `id, titulo, parrafo, media_url, media_type, orden, activo, created_at` and public-read RLS policy — verified working.
- Storage bucket `techndencias-media` created — public, 20MB file size limit, allowed mime types `image/jpeg, image/png, image/webp, video/mp4, video/webm`.

---

### Task 1: Domain types

**Files:**
- Modify: `lib/domain/types.ts`

- [ ] **Step 1: Add the new types**

Append to the end of `lib/domain/types.ts`:

```ts
export interface TechNoticia {
  id: string;
  titulo: string;
  parrafo: string;
  media_url: string;
  media_type: "imagen" | "video";
  orden: number;
  activo: boolean;
  created_at: string;
}

export interface TechNoticiasResponse {
  noticias: TechNoticia[];
  fetchedAt: string;
}
```

- [ ] **Step 2: Verify the project still type-checks**

Run: `npm run build`
Expected: build succeeds (no TypeScript errors). It's fine if this step compiles the rest of the app unchanged — we're only confirming the new types don't break anything.

- [ ] **Step 3: Commit**

```bash
git add lib/domain/types.ts
git commit -m "feat: add TechNoticia domain types"
```

---

### Task 2: Public + create API route

**Files:**
- Create: `app/api/techndencias/route.ts`

- [ ] **Step 1: Write the route**

```ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { TechNoticia, TechNoticiasResponse } from "@/lib/domain/types";

const supabasePublic = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const { data, error } = await supabasePublic
    .from("tech_noticias")
    .select("id, titulo, parrafo, media_url, media_type, orden, activo, created_at")
    .eq("activo", true)
    .order("orden", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const response: TechNoticiasResponse = {
    noticias: (data as TechNoticia[]) ?? [],
    fetchedAt: new Date().toISOString(),
  };
  return NextResponse.json(response, {
    headers: { "Access-Control-Allow-Origin": "*" },
  });
}

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id, titulo, parrafo, media_url, media_type } = await request.json();

  if (!id || !titulo?.trim() || !parrafo?.trim() || !media_url || !media_type) {
    return NextResponse.json(
      { error: "Campos requeridos: id, titulo, parrafo, media_url, media_type" },
      { status: 400 }
    );
  }
  if (media_type !== "imagen" && media_type !== "video") {
    return NextResponse.json(
      { error: "media_type debe ser 'imagen' o 'video'" },
      { status: 400 }
    );
  }

  const { data: maxRow } = await supabasePublic
    .from("tech_noticias")
    .select("orden")
    .order("orden", { ascending: false })
    .limit(1)
    .single();

  const orden = maxRow ? (maxRow.orden as number) + 1 : 0;

  const { data, error } = await supabasePublic
    .from("tech_noticias")
    .insert({
      id,
      titulo: titulo.trim(),
      parrafo: parrafo.trim(),
      media_url,
      media_type,
      orden,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
```

- [ ] **Step 2: Verify GET works with no auth**

Run: `npm run dev` (leave running), then in another terminal:
`curl http://localhost:3000/api/techndencias`
Expected: `{"noticias":[],"fetchedAt":"..."}` — empty array since the table has no rows yet.

- [ ] **Step 3: Commit**

```bash
git add app/api/techndencias/route.ts
git commit -m "feat: add GET/POST /api/techndencias"
```

---

### Task 3: Update + delete API route

**Files:**
- Create: `app/api/techndencias/[id]/route.ts`

- [ ] **Step 1: Write the route**

```ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function requireAuth() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const fields: Record<string, unknown> = {};
  if (body.titulo !== undefined) fields.titulo = body.titulo;
  if (body.parrafo !== undefined) fields.parrafo = body.parrafo;
  if (body.media_url !== undefined) fields.media_url = body.media_url;
  if (body.media_type !== undefined) fields.media_type = body.media_type;
  if (body.orden !== undefined) fields.orden = body.orden;
  if (body.activo !== undefined) fields.activo = body.activo;

  const { data, error } = await supabaseAdmin
    .from("tech_noticias")
    .update(fields)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const { data: row } = await supabaseAdmin
    .from("tech_noticias")
    .select("media_url")
    .eq("id", id)
    .single();

  if (row?.media_url) {
    const marker = "/techndencias-media/";
    const idx = row.media_url.indexOf(marker);
    if (idx !== -1) {
      const path = row.media_url.slice(idx + marker.length);
      await supabaseAdmin.storage.from("techndencias-media").remove([path]);
    }
  }

  const { error } = await supabaseAdmin.from("tech_noticias").delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
```

- [ ] **Step 2: Verify unauthenticated requests are rejected**

With `npm run dev` running:
`curl -X DELETE http://localhost:3000/api/techndencias/00000000-0000-0000-0000-000000000000`
Expected: `{"error":"No autorizado"}` with HTTP 401 (no admin session cookie sent). Full authenticated CRUD is verified end-to-end in Task 5 through the admin UI.

- [ ] **Step 3: Commit**

```bash
git add app/api/techndencias/[id]/route.ts
git commit -m "feat: add PUT/DELETE /api/techndencias/[id]"
```

---

### Task 4: Admin management UI

**Files:**
- Create: `components/admin/TechNdenciasAdmin.tsx`
- Create: `app/admin/techndencias/page.tsx`
- Modify: `app/admin/layout.tsx`

- [ ] **Step 1: Write the admin component**

Create `components/admin/TechNdenciasAdmin.tsx`:

```tsx
"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { TechNoticia } from "@/lib/domain/types";

interface Props {
  initialNoticias: TechNoticia[];
}

const TITULO_MAX = 80;
const PARRAFO_MAX = 180;

async function compressImage(file: File, maxPx = 1200, quality = 0.8): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))),
        "image/jpeg",
        quality
      );
    };
    img.onerror = reject;
    img.src = url;
  });
}

export function TechNdenciasAdmin({ initialNoticias }: Props) {
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [noticias, setNoticias] = useState<TechNoticia[]>(initialNoticias);
  const [titulo, setTitulo] = useState("");
  const [parrafo, setParrafo] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function uploadMedia(): Promise<
    { url: string; type: "imagen" | "video"; id: string } | null
  > {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("Selecciona una imagen o video");
      return null;
    }

    const id = crypto.randomUUID();
    const isVideo = file.type.startsWith("video/");

    if (isVideo) {
      if (file.type !== "video/mp4" && file.type !== "video/webm") {
        setError("El video debe ser MP4 o WebM");
        return null;
      }
      if (file.size > 20 * 1024 * 1024) {
        setError("El video no debe superar 20MB");
        return null;
      }
      const ext = file.type === "video/webm" ? "webm" : "mp4";
      const path = `${id}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("techndencias-media")
        .upload(path, file, { contentType: file.type });

      if (uploadError) {
        setError(`Error al subir video: ${uploadError.message}`);
        return null;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("techndencias-media").getPublicUrl(path);

      return { url: publicUrl, type: "video", id };
    }

    const compressed = await compressImage(file);
    const path = `${id}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from("techndencias-media")
      .upload(path, compressed, { contentType: "image/jpeg" });

    if (uploadError) {
      setError(`Error al subir imagen: ${uploadError.message}`);
      return null;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("techndencias-media").getPublicUrl(path);

    return { url: publicUrl, type: "imagen", id };
  }

  async function handleAgregar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!titulo.trim() || !parrafo.trim()) {
      setError("Título y párrafo son requeridos");
      return;
    }

    setUploading(true);
    const media = await uploadMedia();
    if (!media) {
      setUploading(false);
      return;
    }

    const res = await fetch("/api/techndencias", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: media.id,
        titulo: titulo.trim(),
        parrafo: parrafo.trim(),
        media_url: media.url,
        media_type: media.type,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Error al guardar");
      setUploading(false);
      return;
    }

    const nueva = (await res.json()) as TechNoticia;
    setNoticias((prev) => [...prev, nueva]);
    setTitulo("");
    setParrafo("");
    if (fileRef.current) fileRef.current.value = "";
    setUploading(false);
    setSuccess("Noticia agregada");
    setTimeout(() => setSuccess(""), 3000);
  }

  async function handleToggle(id: string) {
    const noticia = noticias.find((n) => n.id === id);
    if (!noticia) return;
    const res = await fetch(`/api/techndencias/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo: !noticia.activo }),
    });
    if (!res.ok) return;
    setNoticias((prev) =>
      prev.map((n) => (n.id === id ? { ...n, activo: !n.activo } : n))
    );
  }

  async function handleEliminar(id: string) {
    if (!confirm("¿Eliminar esta noticia?")) return;
    const res = await fetch(`/api/techndencias/${id}`, { method: "DELETE" });
    if (!res.ok) return;
    setNoticias((prev) => prev.filter((n) => n.id !== id));
  }

  function moverArriba(index: number) {
    if (index === 0) return;
    setNoticias((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  }

  function moverAbajo(index: number) {
    if (index === noticias.length - 1) return;
    setNoticias((prev) => {
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  }

  async function handleGuardarOrden() {
    setSaving(true);
    setError("");
    setSuccess("");
    const updates = noticias.map((n, i) =>
      fetch(`/api/techndencias/${n.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orden: i }),
      })
    );
    const results = await Promise.all(updates);
    const failed = results.some((r) => !r.ok);
    setSaving(false);
    if (failed) {
      setError("Error al guardar el orden");
    } else {
      setSuccess("Orden guardado");
      setTimeout(() => setSuccess(""), 3000);
    }
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">TechNdencias</h1>

      <div className="flex flex-col gap-3 mb-8">
        {noticias.length === 0 && (
          <p className="text-gray-400 text-sm">No hay noticias. Agrega una abajo.</p>
        )}
        {noticias.map((noticia, i) => (
          <div
            key={noticia.id}
            className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3"
          >
            <div className="flex flex-col gap-1">
              <button
                onClick={() => moverArriba(i)}
                disabled={i === 0}
                className="text-gray-400 hover:text-gray-900 disabled:opacity-20 leading-none text-xs"
              >
                ▲
              </button>
              <button
                onClick={() => moverAbajo(i)}
                disabled={i === noticias.length - 1}
                className="text-gray-400 hover:text-gray-900 disabled:opacity-20 leading-none text-xs"
              >
                ▼
              </button>
            </div>

            {noticia.media_type === "video" ? (
              <video
                src={noticia.media_url}
                muted
                className="w-16 h-16 rounded-lg object-cover flex-shrink-0 bg-gray-200"
              />
            ) : (
              <img
                src={noticia.media_url}
                alt={noticia.titulo}
                className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
              />
            )}

            <span className="flex-1 text-sm text-gray-700 truncate">{noticia.titulo}</span>

            <button
              onClick={() => handleToggle(noticia.id)}
              title={noticia.activo ? "Desactivar" : "Activar"}
              className={`w-3 h-3 rounded-full flex-shrink-0 transition-colors ${
                noticia.activo ? "bg-emerald-500" : "bg-gray-300"
              }`}
            />

            <button
              onClick={() => handleEliminar(noticia.id)}
              className="text-red-400 hover:text-red-600 text-xs font-bold ml-1"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {noticias.length > 0 && (
        <button
          onClick={handleGuardarOrden}
          disabled={saving}
          className="w-full py-3 rounded-xl font-semibold transition-colors mb-8 text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
        >
          {saving ? "Guardando…" : "Guardar orden"}
        </button>
      )}

      <form
        onSubmit={handleAgregar}
        className="bg-white border border-gray-200 rounded-xl p-6 space-y-4"
      >
        <h2 className="text-lg font-semibold text-gray-800">Agregar noticia</h2>

        <div>
          <label className="block text-sm text-gray-600 mb-1">
            Título ({titulo.length}/{TITULO_MAX})
          </label>
          <input
            type="text"
            value={titulo}
            maxLength={TITULO_MAX}
            onChange={(e) => setTitulo(e.target.value)}
            className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:border-gray-400"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">
            Párrafo ({parrafo.length}/{PARRAFO_MAX})
          </label>
          <textarea
            value={parrafo}
            maxLength={PARRAFO_MAX}
            onChange={(e) => setParrafo(e.target.value)}
            rows={3}
            className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:border-gray-400 resize-none"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">Imagen o video</label>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/mp4,video/webm"
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-gray-200 file:text-gray-700 hover:file:bg-gray-300 cursor-pointer"
          />
          <p className="text-gray-400 text-xs mt-1">Video máx. 20MB, formato MP4 o WebM.</p>
        </div>

        {success && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
            <p className="text-emerald-700 text-sm font-semibold">{success}</p>
          </div>
        )}
        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={uploading}
          className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-semibold transition-colors"
        >
          {uploading ? "Subiendo…" : "Agregar noticia"}
        </button>
      </form>

      <div className="mt-10">
        <p className="text-gray-400 text-xs uppercase tracking-widest mb-2">
          Vista previa (split 50/50)
        </p>
        <div
          className="flex rounded-xl overflow-hidden border border-gray-200"
          style={{ aspectRatio: "16/9" }}
        >
          <div className="w-1/2 flex flex-col justify-center gap-3 px-8 bg-gradient-to-br from-gray-100 to-gray-200">
            <span className="bg-teal-500 text-white text-xs font-semibold px-3 py-1 rounded-full w-fit">
              TechNdencias
            </span>
            <h3 className="text-2xl font-black leading-tight text-gray-900">
              {titulo || "Título de la noticia"}
            </h3>
            <p className="text-base font-medium leading-snug text-gray-700 line-clamp-4">
              {parrafo || "El párrafo aparece aquí, máximo 4 líneas en pantalla."}
            </p>
          </div>
          <div className="w-1/2 bg-gray-300 flex items-center justify-center text-gray-500 text-xs">
            imagen / video
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write the admin page**

Create `app/admin/techndencias/page.tsx`:

```tsx
import { createClient } from "@supabase/supabase-js";
import { TechNdenciasAdmin } from "@/components/admin/TechNdenciasAdmin";
import type { TechNoticia } from "@/lib/domain/types";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function TechNdenciasAdminPage() {
  const { data } = await supabase
    .from("tech_noticias")
    .select("id, titulo, parrafo, media_url, media_type, orden, activo, created_at")
    .order("orden", { ascending: true });

  return <TechNdenciasAdmin initialNoticias={(data as TechNoticia[]) ?? []} />;
}
```

- [ ] **Step 3: Add the nav link**

In `app/admin/layout.tsx`, find this block:

```tsx
            <NavLink href="/admin">Empleados</NavLink>
            <NavLink href="/admin/ticker">Ticker</NavLink>
```

Replace with:

```tsx
            <NavLink href="/admin">Empleados</NavLink>
            <NavLink href="/admin/ticker">Ticker</NavLink>
            <NavLink href="/admin/techndencias">TechNdencias</NavLink>
```

- [ ] **Step 4: Manual verification**

With `npm run dev` running, log in at `http://localhost:3000/admin/login`, then:
1. Click "TechNdencias" in the nav — page loads with empty list.
2. Fill título/párrafo, pick a small test image (JPEG/PNG), submit.
   Expected: row appears in the list, thumbnail renders, character counters worked, success message shown.
3. Click the green/gray dot to toggle `activo` — dot color flips immediately.
4. Click ▲/▼ then "Guardar orden" — reload the page, order persists.
5. Click ✕, confirm — row disappears from the list.
6. In Supabase Storage dashboard, confirm the uploaded file in `techndencias-media` was removed after the delete in step 5.

- [ ] **Step 5: Run lint and build**

Run: `npm run lint`
Expected: no errors.

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 6: Commit**

```bash
git add components/admin/TechNdenciasAdmin.tsx app/admin/techndencias/page.tsx app/admin/layout.tsx
git commit -m "feat: add TechNdencias admin management page"
```

---

### Task 5: Display screen

**Files:**
- Create: `components/display/TechNdenciaSlide.tsx`
- Create: `components/display/TechNdenciaCarousel.tsx`
- Create: `app/techndencias/page.tsx`

- [ ] **Step 1: Write the slide component**

Create `components/display/TechNdenciaSlide.tsx`:

```tsx
"use client";

import { motion } from "framer-motion";
import type { TechNoticia } from "@/lib/domain/types";

export function TechNdenciaSlide({ noticia }: { noticia: TechNoticia }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="absolute inset-0 flex"
    >
      {/* Texto — 50% izquierda */}
      <div className="w-1/2 flex flex-col justify-center gap-6 px-16">
        <span className="bg-teal-500 text-white text-lg font-semibold px-5 py-1.5 rounded-full w-fit">
          TechNdencias
        </span>
        <h2 className="text-6xl font-black leading-tight text-gray-900">
          {noticia.titulo}
        </h2>
        <p className="text-3xl font-medium leading-snug text-gray-700 line-clamp-4">
          {noticia.parrafo}
        </p>
      </div>

      {/* Media — 50% derecha */}
      <div className="w-1/2 h-full">
        {noticia.media_type === "video" ? (
          <video
            key={noticia.id}
            src={noticia.media_url}
            autoPlay
            muted
            loop
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <img
            src={noticia.media_url}
            alt={noticia.titulo}
            className="w-full h-full object-cover"
          />
        )}
      </div>
    </motion.div>
  );
}
```

- [ ] **Step 2: Write the carousel component**

Create `components/display/TechNdenciaCarousel.tsx`:

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { TechNdenciaSlide } from "./TechNdenciaSlide";
import type { TechNoticia } from "@/lib/domain/types";

const SLIDE_MS = 15000;

export function TechNdenciaCarousel({ noticias }: { noticias: TechNoticia[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const advance = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % noticias.length);
  }, [noticias.length]);

  useEffect(() => {
    if (noticias.length <= 1) return;
    const interval = setInterval(advance, SLIDE_MS);
    return () => clearInterval(interval);
  }, [advance, noticias.length]);

  useEffect(() => {
    if (currentIndex >= noticias.length) {
      setCurrentIndex(0);
    }
  }, [noticias.length, currentIndex]);

  if (noticias.length === 0) return null;

  const noticia = noticias[currentIndex];

  return (
    <div className="relative w-full h-full overflow-hidden">
      <AnimatePresence mode="wait">
        <TechNdenciaSlide key={`${noticia.id}-${currentIndex}`} noticia={noticia} />
      </AnimatePresence>
    </div>
  );
}
```

- [ ] **Step 3: Write the display page**

Create `app/techndencias/page.tsx`:

```tsx
"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { TechNdenciaCarousel } from "@/components/display/TechNdenciaCarousel";
import { Clock } from "@/components/display/Clock";
import { EmptyState } from "@/components/display/EmptyState";
import type { TechNoticiasResponse } from "@/lib/domain/types";

const POLL_INTERVAL_MS = 5 * 60 * 1000;
const CACHE_KEY = "techveo:last-techndencias";

function loadCache(): TechNoticiasResponse | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as TechNoticiasResponse) : null;
  } catch {
    return null;
  }
}

function saveCache(data: TechNoticiasResponse) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // localStorage unavailable in some kiosk setups
  }
}

async function fetchTechNoticias(): Promise<TechNoticiasResponse> {
  const res = await fetch("/api/techndencias", { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export default function TechNdenciasPage() {
  const { data, isPending } = useQuery<TechNoticiasResponse>({
    queryKey: ["techndencias"],
    queryFn: fetchTechNoticias,
    refetchInterval: POLL_INTERVAL_MS,
    initialData: loadCache() ?? undefined,
  });

  useEffect(() => {
    if (data) saveCache(data);
  }, [data]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchTechNoticias()
          .then(saveCache)
          .catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  useEffect(() => {
    const now = new Date();
    const next3AM = new Date(now);
    next3AM.setHours(3, 0, 0, 0);
    if (next3AM <= now) next3AM.setDate(next3AM.getDate() + 1);
    const ms = next3AM.getTime() - now.getTime();
    const timeout = setTimeout(() => window.location.reload(), ms);
    return () => clearTimeout(timeout);
  }, []);

  const noticias = data?.noticias ?? [];
  const showEmpty = !isPending && noticias.length === 0;

  return (
    <main className="h-screen flex flex-col bg-gradient-to-br from-gray-100 to-gray-200">
      <header className="flex items-center justify-between px-10 py-4 border-b border-gray-300">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">DIDT</h1>
          <p className="text-gray-400 text-sm">
            Dirección de Innovación y Desarrollo Tecnológico
          </p>
        </div>
        <Clock />
      </header>

      <div className="flex-1 relative overflow-hidden">
        {noticias.length > 0 ? (
          <TechNdenciaCarousel noticias={noticias} />
        ) : showEmpty ? (
          <EmptyState />
        ) : null}
      </div>

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

- [ ] **Step 4: Manual verification**

With `npm run dev` running and at least one active noticia (add via `/admin/techndencias` if the list is empty), open `http://localhost:3000/techndencias`:
1. The slide shows: badge, título, párrafo on the left half; image (or looping muted video) filling the right half.
2. Add a 2nd and 3rd noticia in the admin, reload the display — after 15s the carousel advances to the next one.
3. Deactivate all noticias in the admin, reload the display — `EmptyState` renders (no console errors, no broken layout).
4. Resize the browser window narrower — confirm the 50/50 split still holds without overflow (this screen is always shown on a fixed 16:9 TV, but sanity-check anyway).

- [ ] **Step 5: Run lint and build**

Run: `npm run lint`
Expected: no errors.

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 6: Commit**

```bash
git add components/display/TechNdenciaSlide.tsx components/display/TechNdenciaCarousel.tsx app/techndencias/page.tsx
git commit -m "feat: add TechNdencias display screen"
```

---

### Task 6: Documentation

**Files:**
- Modify: `docs/supabase-setup.md`

- [ ] **Step 1: Add the new table + bucket setup steps**

Insert a new section after "## 3. Create Storage bucket" in `docs/supabase-setup.md` (renumber the following sections, "Create admin user" becomes "5." and "Environment variables" becomes "6."):

```markdown
## 4. Create the `tech_noticias` table (TechNdencias module)

```sql
CREATE TABLE tech_noticias (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo      TEXT NOT NULL,
  parrafo     TEXT NOT NULL,
  media_url   TEXT NOT NULL,
  media_type  TEXT NOT NULL CHECK (media_type IN ('imagen', 'video')),
  orden       INTEGER NOT NULL DEFAULT 0,
  activo      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE tech_noticias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read" ON tech_noticias FOR SELECT USING (true);
```

Create a Storage bucket called `techndencias-media`:
1. Go to Storage in the Supabase dashboard.
2. Create a new bucket named `techndencias-media`, set it to **public**.
3. Set file size limit to 20MB and allowed mime types to `image/jpeg, image/png, image/webp, video/mp4, video/webm`.
```

- [ ] **Step 2: Commit**

```bash
git add docs/supabase-setup.md
git commit -m "docs: document tech_noticias table and storage bucket setup"
```

---

### Task 7: End-to-end smoke test

**Files:** none (verification only)

- [ ] **Step 1: Full weekly-workflow walkthrough**

With `npm run dev` running:
1. Go to `/admin/techndencias`, add exactly 3 noticias: one with an image, one with an MP4 video, one more with an image.
2. Open `/techndencias` in a new tab — confirm all 3 rotate in order every 15 seconds, video autoplays muted and loops, images render sharp (not stretched).
3. Back in admin, deactivate one noticia — reload `/techndencias`, confirm only 2 remain in rotation.
4. Delete a noticia from admin — confirm its file is gone from the `techndencias-media` bucket in the Supabase dashboard, and the display no longer shows it.
5. Try adding a noticia with a título/párrafo at the max character count — confirm the input stops accepting further characters and the display renders 4 lines cleanly (no visual overflow) with `line-clamp-4`.

- [ ] **Step 2: Final lint + build**

Run: `npm run lint && npm run build`
Expected: both succeed with no errors.

- [ ] **Step 3: Clean up test data**

Remove any test noticias created during the smoke test from `/admin/techndencias` so the module starts empty for the first real weekly publish.
