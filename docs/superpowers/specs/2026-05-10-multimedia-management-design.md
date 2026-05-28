# Multimedia Management — Design Spec
Date: 2026-05-10

## Goal
Allow admins to upload and manage images/videos from TechVeo's admin panel. A public display page (`/media`) loops through the active content in configured order, embedded by Ablesign via URL.

## Database

New table `multimedia` in Supabase:

```sql
CREATE TABLE multimedia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  url TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('image', 'video')),
  duracion_segundos INTEGER, -- null for videos, required for images
  activo BOOLEAN NOT NULL DEFAULT true,
  orden INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

RLS: public SELECT for active items; service role for INSERT/UPDATE/DELETE.

## Storage

New Supabase Storage bucket: `multimedia` (public). Files stored as `{id}-{filename}`.

## API Routes

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | /api/multimedia | public | Active items sorted by orden |
| POST | /api/multimedia | required | Upload file to Storage + insert row |
| PUT | /api/multimedia/[id] | required | Update nombre, duracion, activo, orden |
| DELETE | /api/multimedia/[id] | required | Delete from Storage + DB |

## Admin Page — `/admin/multimedia`

- File picker (image/*, video/*, max 100MB) with drag & drop zone
- On upload: show progress, then add to list
- List columns: orden, thumbnail/icon, nombre, tipo, duración, activo toggle, ↑↓ buttons, edit button, delete button
- Edit inline or modal: nombre + duracion_segundos (images only)
- Activo toggle updates immediately via PUT
- ↑↓ swaps orden values between adjacent rows via PUT
- Add "Multimedia" link to admin nav

## Display Page — `/media`

- Public route, no auth
- Fetches `/api/multimedia` on load + every 5 min (TanStack Query)
- localStorage cache key `techveo:multimedia` as fallback
- Loops through active items in order:
  - **Image**: `<img>` shown for `duracion_segundos`, then advances
  - **Video**: `<video autoplay muted playsInline>`, advances on `onEnded`
- Full-screen (`h-screen w-screen object-cover`)
- No header/footer — pure media display for Ablesign embedding
- EmptyState if no active items (after fetch resolves)
- Daily 3AM reload backstop

## Domain Types

```ts
interface MultimediaItem {
  id: string;
  nombre: string;
  url: string;
  tipo: 'image' | 'video';
  duracion_segundos: number | null;
  activo: boolean;
  orden: number;
  created_at: string;
}

interface MultimediaResponse {
  items: MultimediaItem[];
  fetchedAt: string;
}
```
