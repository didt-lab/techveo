# Ticker Animado — Spec de Diseño

**Fecha:** 2026-05-28  
**Estado:** Aprobado

---

## Resumen

Agregar una barra de ticker animado (estilo noticias) en la parte inferior de la pantalla de display (`/`). El ticker muestra el logo de TechVeo, la hora en vivo y mensajes configurables que desfiles horizontalmente. Se elimina el header actual (DIDT + reloj) para maximizar el área del carrusel.

---

## Cambios en la pantalla de display (`app/page.tsx`)

- **Eliminar** el `<header>` superior (logo DIDT + Clock + fecha).
- **Reemplazar** el `<footer>` actual por el componente `<Ticker>`.
- El carrusel ocupa todo el espacio vertical entre el ticker y el tope de la pantalla.

### Componente `Ticker` (`components/display/Ticker.tsx`)

Composición de izquierda a derecha:

| Sección | Fondo | Contenido |
|---------|-------|-----------|
| Logo box | Blanco | Logo `techveo-logo.png` con `object-contain` |
| Hora | `rgba(0,0,0,0.12)` sobre verde | Hora HH:mm:ss actualizada cada segundo |
| Texto desfilante | `#3bb5a6` | Mensajes activos concatenados con separador `●` |

- Altura: `44px`
- Fondo base: `#3bb5a6`
- Texto: blanco, `font-size` legible en TV (~16px)
- Animación CSS `translateX` de derecha a izquierda, loop infinito
- Velocidad: `animation-duration` fija de `40s` por ciclo (suficiente para textos institucionales típicos en TV)
- Si no hay mensajes configurados: ticker muestra solo logo + hora (sin texto)
- Datos: fetched desde `GET /api/ticker`, mismo patrón de polling que eventos (5 min + visibility)

---

## Base de datos

### Nueva tabla: `ticker_mensajes`

```sql
CREATE TABLE ticker_mensajes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  texto       TEXT NOT NULL,
  orden       INTEGER NOT NULL DEFAULT 0,
  activo      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: lectura pública, escritura solo con service role
ALTER TABLE ticker_mensajes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read" ON ticker_mensajes FOR SELECT USING (true);
```

---

## API

### `GET /api/ticker` (público)

Devuelve mensajes activos ordenados por `orden ASC`.

```ts
// Response
{ mensajes: { id: string; texto: string }[] }
```

Usa `SUPABASE_SERVICE_ROLE_KEY`. Sin auth requerida (igual que `/api/events`).

### `POST /api/ticker` (protegido)

Crea un nuevo mensaje. Body: `{ texto: string }`. Asigna `orden` = max(orden) + 1.

### `PUT /api/ticker/[id]` (protegido)

Actualiza `texto`, `orden` y/o `activo`. Body: `{ texto?, orden?, activo? }`.

### `DELETE /api/ticker/[id]` (protegido)

Elimina el mensaje. Requiere auth de admin.

---

## Admin (`/admin/ticker`)

Nueva página protegida por el middleware existente.

### Layout

- Enlace "Ticker" en la navegación del admin (junto a "Empleados").
- Lista de mensajes activos e inactivos con:
  - Indicador verde/gris de activo
  - Texto del mensaje
  - Botón eliminar (✕)
- Campo de texto + botón "+ Agregar" para nuevos mensajes.
- Toggle activo/inactivo por mensaje (click en el indicador).
- Botón "Guardar cambios" — persiste orden y estado activo de todos los mensajes en batch.
- Vista previa del ticker al final de la página (misma animación que en display).

### Reordenamiento

Drag-and-drop con la librería `@dnd-kit/sortable` (ya compatible con React 18/Next.js 15, sin necesidad de `document` en SSR).

---

## Archivos a crear / modificar

| Archivo | Acción |
|---------|--------|
| `app/api/ticker/route.ts` | Crear — GET (público) + POST (auth) |
| `app/api/ticker/[id]/route.ts` | Crear — PUT + DELETE (auth) |
| `app/admin/ticker/page.tsx` | Crear — página admin |
| `components/admin/TickerAdmin.tsx` | Crear — componente de gestión |
| `components/display/Ticker.tsx` | Crear — barra ticker para display |
| `app/page.tsx` | Modificar — quitar header, agregar Ticker, fetch `/api/ticker` |
| `lib/domain/types.ts` | Modificar — agregar `TickerResponse` type |

---

## Fuera de alcance

- Internacionalización del texto del ticker.
- Programación de mensajes por fecha.
- Múltiples pantallas con tickers distintos.
