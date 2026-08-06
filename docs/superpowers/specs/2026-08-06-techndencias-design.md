# TechNdencias — Spec de Diseño

**Fecha:** 2026-08-06
**Estado:** Aprobado

---

## Resumen

Nuevo módulo para mostrar 3 noticias semanales de tendencias tecnológicas en una pantalla propia (`/techndencias`), embebida como slot independiente en Ablesign. Cada noticia tiene título, párrafo corto y una imagen o video. El admin sube y reemplaza manualmente las 3 noticias cada semana (sin lógica de expiración por fecha), siguiendo el mismo patrón operativo del Ticker.

---

## Pantalla de display (`app/techndencias/page.tsx`)

- Ruta pública nueva, sin auth, embebible en Ablesign — mismo patrón que `/nuevo-ingreso`.
- Carrusel: **una noticia a pantalla completa a la vez**, rota cada **15 segundos** entre las noticias activas (orden ASC).
- Layout de cada slide — **split horizontal 50/50** (opción elegida sobre 3 mockups):
  - **Izquierda (50%):** título + párrafo, centrado verticalmente.
  - **Derecha (50%):** imagen o video, `object-cover`, ocupa el 100% de esa mitad.
- **Legibilidad a distancia (pantallas de señalización):** título y párrafo grandes, mismo criterio de tamaño que `EmployeeCard` (nombre `text-4xl`+, fecha `text-5xl`):
  - Título: `text-6xl font-black leading-tight text-gray-900`
  - Párrafo: `text-3xl font-medium leading-snug text-gray-700`
  - Badge "TechNdencias" arriba del título: `bg-teal-500 text-white text-lg font-semibold px-5 py-1.5 rounded-full`
  - Párrafo con `line-clamp-4` como backstop visual (por si el límite de caracteres no calza exacto con el ancho real de la pantalla).
- Video: `<video autoPlay muted loop playsInline>` — bucle silencioso mientras esa noticia está en pantalla (no controles, pantalla no interactiva).
- Imagen: `<img>` normal, `object-cover`.
- Fondo: gradiente `from-gray-100 to-gray-200`, consistente con el resto del display.
- Header/footer: igual patrón que `/nuevo-ingreso` (DIDT + Clock arriba, footer con "Actualizado: hh:mm:ss").
- Polling: `GET /api/techndencias` cada 5 min (TanStack Query `refetchInterval`), cache en `localStorage` (`techveo:last-techndencias`), refetch en `visibilitychange`, reload diario 3:00 AM.
- `EmptyState` (branded, sin errores visibles) si no hay noticias activas tras resolver el fetch.

---

## Base de datos

Nueva tabla `tech_noticias`:

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

Límites de contenido (validados en el form de admin, no en DB):
- `titulo`: máx. 80 caracteres (hard limit, contador visible).
- `parrafo`: máx. 180 caracteres (hard limit, contador visible) — calibrado para 4 líneas a `text-3xl` en la mitad de una pantalla TV; `line-clamp-4` en display es el backstop si algún caso límite se pasa visualmente.

---

## Storage

Nuevo bucket público: `techndencias-media`.

- Imagen: comprimida client-side igual que `EmployeeForm.compressImage()` (máx 1200px, JPEG calidad 0.8 — más resolución que la foto de empleado circular, porque aquí ocupa medio TV).
- Video: sin comprimir. Validación client-side: tipo `video/mp4` o `video/webm`, tamaño máx. 20MB (rechazar antes de subir con mensaje de error).
- Path de archivo: `{id}.{ext}` donde `id` es un `crypto.randomUUID()` generado en el cliente antes de subir (mismo `id` se usa luego al insertar la fila).

---

## API

### `GET /api/techndencias` (público)

Devuelve noticias activas ordenadas por `orden ASC`. Mismo patrón que `/api/ticker` (usa `SUPABASE_SERVICE_ROLE_KEY`, sin auth).

```ts
// Response
{ noticias: TechNoticia[]; fetchedAt: string }
```

### `POST /api/techndencias` (protegido)

Crea noticia. Body: `{ id, titulo, parrafo, media_url, media_type }`. Asigna `orden` = max(orden) + 1, `activo = true`.

### `PUT /api/techndencias/[id]` (protegido)

Actualiza `titulo`, `parrafo`, `media_url`, `media_type`, `orden` y/o `activo`.

### `DELETE /api/techndencias/[id]` (protegido)

Elimina la fila y el archivo asociado en Storage.

---

## Admin (`/admin/techndencias`)

Nueva página protegida por el middleware existente (`middleware.ts` ya cubre `/admin/:path*`). Link "TechNdencias" en la nav junto a "Ticker".

Componente `TechNdenciasAdmin` — mismo esqueleto que `TickerAdmin`:

- Lista de noticias (activas e inactivas) con: ▲▼ para reordenar, thumbnail chico, título, toggle activo (punto verde/gris), botón eliminar (✕).
- Form "Agregar noticia" arriba o en modal: input título (maxLength 80 + contador), textarea párrafo (maxLength 180 + contador), input file (imagen o video, sin opción de URL externa), preview de la imagen/video antes de guardar.
- Botón "Guardar orden" — persiste `orden` de todas las filas en batch, igual que Ticker.
- Vista previa del slide (split 50/50) al final de la página, mismos tamaños de fuente que el display real.

---

## Domain Types (`lib/domain/types.ts`)

```ts
export interface TechNoticia {
  id: string;
  titulo: string;
  parrafo: string;
  media_url: string;
  media_type: 'imagen' | 'video';
  orden: number;
  activo: boolean;
  created_at: string;
}

export interface TechNoticiasResponse {
  noticias: TechNoticia[];
  fetchedAt: string;
}
```

---

## Archivos a crear / modificar

| Archivo | Acción |
|---------|--------|
| `app/api/techndencias/route.ts` | Crear — GET (público) + POST (auth) |
| `app/api/techndencias/[id]/route.ts` | Crear — PUT + DELETE (auth) |
| `app/admin/techndencias/page.tsx` | Crear — página admin |
| `components/admin/TechNdenciasAdmin.tsx` | Crear — componente de gestión |
| `app/techndencias/page.tsx` | Crear — pantalla de display |
| `components/display/TechNdenciaCarousel.tsx` | Crear — carrusel de slides |
| `components/display/TechNdenciaSlide.tsx` | Crear — slide individual (split 50/50) |
| `app/admin/layout.tsx` | Modificar — agregar `NavLink` "TechNdencias" |
| `lib/domain/types.ts` | Modificar — agregar `TechNoticia`, `TechNoticiasResponse` |
| `docs/supabase-setup.md` | Modificar — agregar tabla + bucket nuevos |

---

## Fuera de alcance

- Expiración automática de noticias por fecha (reemplazo es 100% manual).
- URL externa como alternativa a subir archivo.
- Más de una pantalla de TechNdencias con contenido distinto.
- Analítica de qué noticia se vio más tiempo.
