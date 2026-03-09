# DIDT Birthday & Anniversary Display

## What This Is

Aplicación de pantalla pública que muestra los cumpleaños y aniversarios de antigüedad de los colaboradores de la DIDT (Dirección de Informática y Desarrollo Tecnológico). Se visualiza en un monitor o TV de la oficina como un carrusel animado, reconociendo a cada colaborador durante la semana de su evento. Los datos se cargan inicialmente mediante importación de archivos Excel/CSV y eventualmente se integrarán con la API del sistema institucional de RRHH.

## Core Value

Que cada colaborador de la DIDT se sienta reconocido públicamente en su cumpleaños y en cada año cumplido en la institución — visible en pantalla toda la semana del evento.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] La pantalla muestra un carrusel animado con los colaboradores que tienen evento en la semana actual
- [ ] Para cada colaborador se muestra: foto, nombre completo y años (edad o años en la institución)
- [ ] Se distingue visualmente entre cumpleaños y aniversarios de antigüedad
- [ ] Los datos de colaboradores se pueden cargar mediante importación de archivo Excel/CSV
- [ ] Integración futura con API del sistema institucional de RRHH (diseño preparado para esto)
- [ ] La pantalla se actualiza automáticamente sin intervención manual

### Out of Scope

- Panel de administración interactivo — los datos se gestionan por importación de archivo, no por UI de edición
- Notificaciones por correo o mensajería — solo pantalla física
- Versión móvil o web accesible externamente — es una pantalla de oficina interna
- Hitos especiales (solo 5/10/15 años) — se celebra cada año de antigüedad

## Context

- La DIDT es el departamento de TI de una institución (pública o privada)
- El sistema institucional de RRHH tiene un endpoint o servicio web con datos de colaboradores, pero la coordinación técnica está pendiente
- La importación de archivo es el mecanismo de arranque para no depender de la API desde el inicio
- La pantalla debe funcionar de forma autónoma (sin interacción del usuario)
- "Aniversario por antigüedad" = cada año cumplido desde la fecha de ingreso a la institución
- El evento es relevante durante **la semana** del cumpleaños/aniversario (días previos + el día exacto)

## Constraints

- **Datos**: Dependencia de API institucional pendiente de coordinación — importación de archivo como fallback obligatorio
- **Despliegue**: Pantalla de oficina, conexión de red interna disponible
- **Autonomía**: La app debe correr sin intervención humana una vez configurada

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Importación CSV/Excel como mecanismo inicial | La API no está lista; permite arrancar sin dependencias externas | — Pending |
| Ventana de visibilidad = semana del evento | Máximo impacto vs. saturación de pantalla | — Pending |
| Carrusel animado en lugar de dashboard estático | Más llamativo en pantalla pública; mejor experiencia visual | — Pending |

---
*Last updated: 2026-03-08 after initialization*
