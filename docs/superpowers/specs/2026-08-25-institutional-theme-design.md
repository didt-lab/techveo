# Identidad institucional IMSS en panel admin

Fuente: `starter-kit-dumbo` (starter kit institucional IMSS/DIDT), carpeta hermana del proyecto.

## Alcance

Solo `/admin/**`. Las pantallas TV (`/`, `/aniversarios`, `/nuevo-ingreso`, `/techndencias`) no cambian — el header/footer institucional de gobierno no calza con carousels full-screen.

## Tokens de color

`tailwind.config.ts` — namespace `brand` (existía sin uso, se repropone):

```
brand: {
  primary:        "#006455",
  primaryHover:   "#004f43",
  secondary:      "#0aa16e",  // reemplaza emerald-600/700 en toda la UI admin
  secondaryHover: "#089158",
  danger:         "#e9080c",
  dangerHover:    "#c81010",
  gob:            "#611232",  // barra de Gobierno de México
}
```

## Layout (revisado tras feedback visual)

El diseño evolucionó de header de un solo nivel a la estructura real del starter-kit: barra guinda de gobierno (con `public/gobierno-mexico-logo.png`) + barra de marca blanca (logo IMSS + "TechVeo · DIDT" + correo/logout) + sidebar verde oscuro fijo (`components/admin/AdminSidebar.tsx`) + footer guinda institucional. Ver `app/admin/layout.tsx`.

Además se corrigió `html { font-size: 1.2vw }` en `app/globals.css`, que era global y inflaba todo el admin — ahora se aplica solo en rutas TV vía script inline en `app/layout.tsx`.

## Logo

- `techveo-logo.png` → `IMSS.svg` (`public/imss-logo.svg`)
- `public/gobierno-mexico-logo.png` — escudo Gobierno de México, barra guinda superior

## Componentes afectados

Reemplazo de clases `emerald-*` → `brand-secondary`/`brand-secondaryHover`, inputs a `bg-[#F5F6F7]` con foco `brand-secondary`, tabla con header `bg-[#F4F7FC]`, botón eliminar a outline `brand-danger`:

- `app/admin/layout.tsx`
- `components/admin/EmployeeTable.tsx`
- `components/admin/EmployeeForm.tsx`
- `components/admin/CsvUploader.tsx`
- `components/admin/TickerAdmin.tsx`
- `components/admin/TechNdenciasAdmin.tsx`
- `app/admin/login/page.tsx`

No se tocan: rutas API, lógica de dominio, páginas `app/admin/importar/*/page.tsx` y `app/admin/empleados/*/page.tsx` (son wrappers delgados sin estilos propios más allá del link "Regresar").
