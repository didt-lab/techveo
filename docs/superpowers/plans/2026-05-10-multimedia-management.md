# Multimedia Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add image/video upload and management to TechVeo admin, plus a public `/media` display page Ablesign can embed.

**Architecture:** Supabase Storage bucket `multimedia` holds the files; a `multimedia` DB table holds metadata (url, tipo, orden, activo, duracion_segundos). A public GET route serves active items to the display page; auth-protected POST/PUT/DELETE routes handle admin operations. The admin UI is a single client component. The display page loops images (by configured duration) and videos (by `onEnded`).

**Tech Stack:** Next.js 15 App Router, TypeScript strict, Supabase (DB + Storage), Tailwind CSS, TanStack Query 5

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `lib/domain/types.ts` | Modify | Add `MultimediaItem`, `MultimediaResponse` types |
| `app/api/multimedia/route.ts` | Create | GET (public) + POST (auth) |
| `app/api/multimedia/[id]/route.ts` | Create | PUT (auth) + DELETE (auth) |
| `app/media/page.tsx` | Create | Public display page for Ablesign |
| `app/admin/multimedia/page.tsx` | Create | Admin page shell (server component) |
| `components/admin/MultimediaManager.tsx` | Create | Client component — upload + list management |
| `app/admin/layout.tsx` | Modify | Add "Multimedia" nav link |

---

## Task 1: Supabase — DB table + Storage bucket

**Files:** Supabase dashboard (manual step)

- [ ] **Step 1: Create the `multimedia` table**

Run this SQL in the Supabase SQL editor:

```sql
CREATE TABLE multimedia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  url TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('image', 'video')),
  duracion_segundos INTEGER,
  activo BOOLEAN NOT NULL DEFAULT true,
  orden INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

- [ ] **Step 2: Add RLS policies**

```sql
ALTER TABLE multimedia ENABLE ROW LEVEL SECURITY;

-- Public can read active items
CREATE POLICY "public_read_active" ON multimedia
  FOR SELECT USING (activo = true);

-- Service role bypasses RLS (used in API routes)
```

- [ ] **Step 3: Create the Storage bucket**

In Supabase dashboard → Storage → New bucket:
- Name: `multimedia`
- Public: ✅ yes
- Allowed MIME types: `image/jpeg, image/png, image/gif, image/webp, video/mp4, video/quicktime, video/webm`
- Max file size: 104857600 (100 MB)

- [ ] **Step 4: Add Storage policy for service role uploads**

In Supabase SQL editor:

```sql
CREATE POLICY "service_role_all" ON storage.objects
  FOR ALL
  USING (bucket_id = 'multimedia')
  WITH CHECK (bucket_id = 'multimedia');
```

---

## Task 2: Add types to `lib/domain/types.ts`

**Files:**
- Modify: `lib/domain/types.ts`

- [ ] **Step 1: Append types**

Add to the end of `lib/domain/types.ts`:

```ts
export interface MultimediaItem {
  id: string;
  nombre: string;
  url: string;
  tipo: 'image' | 'video';
  duracion_segundos: number | null;
  activo: boolean;
  orden: number;
  created_at: string;
}

export interface MultimediaResponse {
  items: MultimediaItem[];
  fetchedAt: string;
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/domain/types.ts
git commit -m "feat: add MultimediaItem and MultimediaResponse types"
```

---

## Task 3: GET /api/multimedia — public endpoint

**Files:**
- Create: `app/api/multimedia/route.ts`

- [ ] **Step 1: Create the file**

```ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { MultimediaItem, MultimediaResponse } from "@/lib/domain/types";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const revalidate = 300;

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("multimedia")
      .select("*")
      .eq("activo", true)
      .order("orden", { ascending: true });

    if (error) throw error;

    const response: MultimediaResponse = {
      items: (data as MultimediaItem[]) ?? [],
      fetchedAt: new Date().toISOString(),
    };

    return NextResponse.json(response, {
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  } catch (error) {
    console.error("[/api/multimedia] GET error:", error);
    return NextResponse.json({ error: "Error al obtener multimedia" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify manually**

Start dev server (`npm run dev`) and visit `http://localhost:3000/api/multimedia`.
Expected: `{ "items": [], "fetchedAt": "..." }`

- [ ] **Step 3: Commit**

```bash
git add app/api/multimedia/route.ts
git commit -m "feat: add GET /api/multimedia public endpoint"
```

---

## Task 4: POST /api/multimedia — file upload

**Files:**
- Modify: `app/api/multimedia/route.ts`

- [ ] **Step 1: Add POST handler to the same file**

Append to `app/api/multimedia/route.ts` (after the GET function):

```ts
export async function POST(request: Request) {
  const supabaseAuth = await createServerSupabaseClient();
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const nombre = (formData.get("nombre") as string | null)?.trim();
  const tipo = formData.get("tipo") as string | null;
  const duracionRaw = formData.get("duracion_segundos");
  const ordenRaw = formData.get("orden");

  if (!file || !nombre || (tipo !== "image" && tipo !== "video")) {
    return NextResponse.json({ error: "Faltan campos: file, nombre, tipo" }, { status: 400 });
  }
  if (tipo === "image" && !duracionRaw) {
    return NextResponse.json({ error: "Las imágenes requieren duracion_segundos" }, { status: 400 });
  }

  const ext = file.name.split(".").pop() ?? "bin";
  const path = `${crypto.randomUUID()}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from("multimedia")
    .upload(path, arrayBuffer, { contentType: file.type });

  if (uploadError) {
    console.error("[/api/multimedia] Storage upload error:", uploadError);
    return NextResponse.json({ error: "Error al subir archivo" }, { status: 500 });
  }

  const { data: { publicUrl } } = supabase.storage.from("multimedia").getPublicUrl(path);

  const { data: existing } = await supabase
    .from("multimedia")
    .select("orden")
    .order("orden", { ascending: false })
    .limit(1)
    .single();

  const nextOrden = ordenRaw ? Number(ordenRaw) : ((existing?.orden ?? -1) + 1);

  const { data, error } = await supabase
    .from("multimedia")
    .insert({
      nombre,
      url: publicUrl,
      tipo,
      duracion_segundos: tipo === "image" ? Number(duracionRaw) : null,
      activo: true,
      orden: nextOrden,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/multimedia/route.ts
git commit -m "feat: add POST /api/multimedia file upload endpoint"
```

---

## Task 5: PUT + DELETE /api/multimedia/[id]

**Files:**
- Create: `app/api/multimedia/[id]/route.ts`

- [ ] **Step 1: Create the file**

```ts
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabaseAuth = await createServerSupabaseClient();
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await request.json();
  const updates: Record<string, unknown> = {};

  if (typeof body.nombre === "string") updates.nombre = body.nombre.trim();
  if (typeof body.activo === "boolean") updates.activo = body.activo;
  if (typeof body.orden === "number") updates.orden = body.orden;
  if (typeof body.duracion_segundos === "number") updates.duracion_segundos = body.duracion_segundos;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("multimedia")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  return NextResponse.json(data);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabaseAuth = await createServerSupabaseClient();
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  // Get the record first to find the storage path
  const { data: item, error: fetchError } = await supabase
    .from("multimedia")
    .select("url")
    .eq("id", id)
    .single();

  if (fetchError || !item) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  // Extract path from public URL: everything after /multimedia/
  const urlPath = new URL(item.url).pathname;
  const storagePath = urlPath.split("/multimedia/").at(-1)!;

  await supabase.storage.from("multimedia").remove([storagePath]);

  const { error } = await supabase.from("multimedia").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/multimedia/[id]/route.ts
git commit -m "feat: add PUT/DELETE /api/multimedia/[id] endpoints"
```

---

## Task 6: MultimediaManager client component

**Files:**
- Create: `components/admin/MultimediaManager.tsx`

- [ ] **Step 1: Create the file**

```tsx
"use client";

import { useState, useRef } from "react";
import type { MultimediaItem } from "@/lib/domain/types";

interface Props {
  initialItems: MultimediaItem[];
}

export function MultimediaManager({ initialItems }: Props) {
  const [items, setItems] = useState<MultimediaItem[]>(initialItems);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editDuracion, setEditDuracion] = useState<number>(10);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Upload ──────────────────────────────────────────────────────────────
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const tipo: "image" | "video" = file.type.startsWith("video/") ? "video" : "image";
    const nombre = file.name.replace(/\.[^.]+$/, "");
    const duracion_segundos = tipo === "image" ? 10 : null;

    const fd = new FormData();
    fd.append("file", file);
    fd.append("nombre", nombre);
    fd.append("tipo", tipo);
    if (duracion_segundos !== null) fd.append("duracion_segundos", String(duracion_segundos));

    setUploading(true);
    setUploadError(null);

    try {
      const res = await fetch("/api/multimedia", { method: "POST", body: fd });
      if (!res.ok) {
        const json = await res.json();
        setUploadError(json.error ?? "Error al subir");
        return;
      }
      const newItem: MultimediaItem = await res.json();
      setItems(prev => [...prev, newItem]);
    } catch {
      setUploadError("Error de red al subir el archivo");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  // ── Toggle activo ────────────────────────────────────────────────────────
  async function toggleActivo(item: MultimediaItem) {
    const res = await fetch(`/api/multimedia/${item.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo: !item.activo }),
    });
    if (!res.ok) return;
    const updated: MultimediaItem = await res.json();
    setItems(prev => prev.map(i => i.id === updated.id ? updated : i));
  }

  // ── Reorder ──────────────────────────────────────────────────────────────
  async function moveItem(index: number, direction: "up" | "down") {
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= items.length) return;

    const a = items[index];
    const b = items[swapIndex];

    await Promise.all([
      fetch(`/api/multimedia/${a.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orden: b.orden }),
      }),
      fetch(`/api/multimedia/${b.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orden: a.orden }),
      }),
    ]);

    const next = [...items];
    next[index] = { ...a, orden: b.orden };
    next[swapIndex] = { ...b, orden: a.orden };
    next.sort((x, y) => x.orden - y.orden);
    setItems(next);
  }

  // ── Edit nombre / duracion ───────────────────────────────────────────────
  function startEdit(item: MultimediaItem) {
    setEditingId(item.id);
    setEditNombre(item.nombre);
    setEditDuracion(item.duracion_segundos ?? 10);
  }

  async function saveEdit(item: MultimediaItem) {
    const body: Record<string, unknown> = { nombre: editNombre };
    if (item.tipo === "image") body.duracion_segundos = editDuracion;

    const res = await fetch(`/api/multimedia/${item.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return;
    const updated: MultimediaItem = await res.json();
    setItems(prev => prev.map(i => i.id === updated.id ? updated : i));
    setEditingId(null);
  }

  // ── Delete ───────────────────────────────────────────────────────────────
  async function deleteItem(id: string) {
    if (!confirm("¿Eliminar este elemento?")) return;
    const res = await fetch(`/api/multimedia/${id}`, { method: "DELETE" });
    if (!res.ok) return;
    setItems(prev => prev.filter(i => i.id !== id));
  }

  const sorted = [...items].sort((a, b) => a.orden - b.orden);

  return (
    <div>
      {/* Upload zone */}
      <div
        className="border-2 border-dashed border-white/20 rounded-lg p-8 text-center mb-8 cursor-pointer hover:border-teal-500 transition-colors"
        onClick={() => fileRef.current?.click()}
      >
        <div className="text-4xl mb-3">📁</div>
        <p className="text-white/60 text-sm mb-1">Haz clic para seleccionar un archivo</p>
        <p className="text-white/30 text-xs">JPG, PNG, GIF, MP4, MOV, WEBM · Máx. 100 MB</p>
        {uploading && <p className="text-teal-400 mt-3 text-sm">Subiendo...</p>}
        {uploadError && <p className="text-red-400 mt-3 text-sm">{uploadError}</p>}
        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* List */}
      {sorted.length === 0 ? (
        <p className="text-white/40 text-sm text-center py-12">Sin contenido. Sube el primer archivo.</p>
      ) : (
        <div className="rounded-lg border border-white/10 overflow-hidden">
          <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between">
            <span className="text-white/40 text-xs uppercase tracking-wider font-semibold">
              Contenido ({sorted.length} elementos)
            </span>
            <span className="text-white/20 text-xs">Orden de reproducción →</span>
          </div>

          {sorted.map((item, idx) => (
            <div
              key={item.id}
              className={`flex items-center gap-4 px-5 py-4 border-b border-white/5 last:border-0 ${!item.activo ? "opacity-50" : ""}`}
            >
              {/* Order number */}
              <span className="text-white/30 font-bold w-6 text-center text-sm">{idx + 1}</span>

              {/* Icon */}
              <div className={`w-16 h-10 rounded flex items-center justify-center text-2xl flex-shrink-0 ${item.tipo === "video" ? "bg-blue-900/40" : "bg-purple-900/40"}`}>
                {item.tipo === "video" ? "🎬" : "🖼"}
              </div>

              {/* Info / edit */}
              <div className="flex-1 min-w-0">
                {editingId === item.id ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    <input
                      className="bg-white/10 text-white text-sm rounded px-2 py-1 border border-white/20 min-w-0 flex-1"
                      value={editNombre}
                      onChange={e => setEditNombre(e.target.value)}
                    />
                    {item.tipo === "image" && (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={1}
                          max={300}
                          className="bg-white/10 text-white text-sm rounded px-2 py-1 border border-white/20 w-20"
                          value={editDuracion}
                          onChange={e => setEditDuracion(Number(e.target.value))}
                        />
                        <span className="text-white/40 text-xs">seg</span>
                      </div>
                    )}
                    <button
                      onClick={() => saveEdit(item)}
                      className="bg-teal-600 hover:bg-teal-500 text-white text-xs px-3 py-1 rounded"
                    >
                      Guardar
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="bg-white/10 text-white/60 text-xs px-3 py-1 rounded"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="text-white text-sm font-medium truncate">{item.nombre}</p>
                    <p className="text-white/40 text-xs">
                      {item.tipo === "video" ? "Video" : `Imagen · ${item.duracion_segundos}s`}
                    </p>
                  </>
                )}
              </div>

              {/* Active badge */}
              <span
                className={`text-xs px-2 py-0.5 rounded-full cursor-pointer select-none ${item.activo ? "bg-teal-500/20 text-teal-300" : "bg-white/10 text-white/40"}`}
                onClick={() => toggleActivo(item)}
                title="Clic para activar/desactivar"
              >
                {item.activo ? "Activo" : "Inactivo"}
              </span>

              {/* Up/Down */}
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => moveItem(idx, "up")}
                  disabled={idx === 0}
                  className="bg-white/10 hover:bg-white/20 text-white/60 text-xs px-2 py-0.5 rounded disabled:opacity-20"
                >↑</button>
                <button
                  onClick={() => moveItem(idx, "down")}
                  disabled={idx === sorted.length - 1}
                  className="bg-white/10 hover:bg-white/20 text-white/60 text-xs px-2 py-0.5 rounded disabled:opacity-20"
                >↓</button>
              </div>

              {/* Edit */}
              {editingId !== item.id && (
                <button
                  onClick={() => startEdit(item)}
                  className="bg-purple-700/60 hover:bg-purple-600 text-white text-xs px-3 py-1 rounded"
                >
                  Editar
                </button>
              )}

              {/* Delete */}
              <button
                onClick={() => deleteItem(item.id)}
                className="bg-red-900/40 hover:bg-red-700/60 text-red-300 text-xs px-2 py-1 rounded"
              >
                🗑
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/admin/MultimediaManager.tsx
git commit -m "feat: add MultimediaManager admin client component"
```

---

## Task 7: Admin page + nav link

**Files:**
- Create: `app/admin/multimedia/page.tsx`
- Modify: `app/admin/layout.tsx`

- [ ] **Step 1: Create the admin page**

```tsx
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { MultimediaManager } from "@/components/admin/MultimediaManager";
import type { MultimediaItem } from "@/lib/domain/types";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function MultimediaPage() {
  const supabaseAuth = await createServerSupabaseClient();
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data } = await supabase
    .from("multimedia")
    .select("*")
    .order("orden", { ascending: true });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Multimedia</h1>
      <MultimediaManager initialItems={(data as MultimediaItem[]) ?? []} />
    </div>
  );
}
```

- [ ] **Step 2: Add nav link in `app/admin/layout.tsx`**

After the existing `Importar Empleados` link, add:

```tsx
<a href="/admin/multimedia" className="text-white/60 hover:text-white text-sm transition-colors">
  Multimedia
</a>
```

- [ ] **Step 3: Commit**

```bash
git add app/admin/multimedia/page.tsx app/admin/layout.tsx
git commit -m "feat: add /admin/multimedia page and nav link"
```

---

## Task 8: Public display page `/media`

**Files:**
- Create: `app/media/page.tsx`

- [ ] **Step 1: Create the file**

```tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { MultimediaItem, MultimediaResponse } from "@/lib/domain/types";

const POLL_MS = 5 * 60 * 1000;
const CACHE_KEY = "techveo:multimedia";

function loadCache(): MultimediaResponse | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as MultimediaResponse) : null;
  } catch { return null; }
}

async function fetchMultimedia(): Promise<MultimediaResponse> {
  const res = await fetch("/api/multimedia", { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function ImageSlide({ item, onEnd }: { item: MultimediaItem; onEnd: () => void }) {
  useEffect(() => {
    const t = setTimeout(onEnd, (item.duracion_segundos ?? 10) * 1000);
    return () => clearTimeout(t);
  }, [item.id, item.duracion_segundos, onEnd]);

  return (
    <img
      src={item.url}
      alt={item.nombre}
      className="w-full h-full object-cover"
    />
  );
}

function VideoSlide({ item, onEnd }: { item: MultimediaItem; onEnd: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.play().catch(() => {});
  }, [item.id]);

  return (
    <video
      ref={videoRef}
      src={item.url}
      className="w-full h-full object-cover"
      autoPlay
      muted
      playsInline
      onEnded={onEnd}
    />
  );
}

export default function MediaPage() {
  const { data, isPending } = useQuery<MultimediaResponse>({
    queryKey: ["multimedia"],
    queryFn: fetchMultimedia,
    refetchInterval: POLL_MS,
    initialData: loadCache() ?? undefined,
  });

  useEffect(() => {
    if (data) {
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch {}
    }
  }, [data]);

  // Daily 3AM reload backstop
  useEffect(() => {
    const now = new Date();
    const next3AM = new Date(now);
    next3AM.setHours(3, 0, 0, 0);
    if (next3AM <= now) next3AM.setDate(next3AM.getDate() + 1);
    const t = setTimeout(() => window.location.reload(), next3AM.getTime() - now.getTime());
    return () => clearTimeout(t);
  }, []);

  const [index, setIndex] = useState(0);
  const items = data?.items ?? [];

  useEffect(() => {
    if (index >= items.length && items.length > 0) setIndex(0);
  }, [items.length, index]);

  const advance = useCallback(() => {
    setIndex(prev => (prev + 1) % items.length);
  }, [items.length]);

  if (isPending && items.length === 0) return null;

  if (items.length === 0) {
    return (
      <div className="w-screen h-screen bg-black flex items-center justify-center">
        <p className="text-white/30 text-2xl">Sin contenido multimedia</p>
      </div>
    );
  }

  const current = items[index];

  return (
    <div className="w-screen h-screen bg-black overflow-hidden">
      {current.tipo === "image" ? (
        <ImageSlide key={current.id} item={current} onEnd={advance} />
      ) : (
        <VideoSlide key={current.id} item={current} onEnd={advance} />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify manually**

With at least one active item in DB, visit `http://localhost:3000/media`.
- Image: should display full-screen, advance after `duracion_segundos`
- Video: should play full-screen, advance on end

- [ ] **Step 3: Commit**

```bash
git add app/media/page.tsx
git commit -m "feat: add /media public display page for Ablesign embedding"
```

---

## Task 9: Build check

- [ ] **Step 1: Run lint**

```bash
npm run lint
```

Expected: no errors. Fix any TypeScript strict-mode issues before proceeding.

- [ ] **Step 2: Run build**

```bash
npm run build
```

Expected: build completes with no errors.

- [ ] **Step 3: Final commit if any lint fixes were needed**

```bash
git add -A
git commit -m "fix: lint and type errors after multimedia feature"
```

---

## Summary

After all tasks:

| URL | Purpose |
|-----|---------|
| `/admin/multimedia` | Upload, reorder, toggle, delete media |
| `/media` | Public display page — embed in Ablesign |
| `GET /api/multimedia` | Public JSON feed of active items |
| `POST /api/multimedia` | Upload new file (auth) |
| `PUT /api/multimedia/[id]` | Update metadata/order (auth) |
| `DELETE /api/multimedia/[id]` | Remove file + record (auth) |
