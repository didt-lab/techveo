# Stack Research

**Domain:** Digital signage / employee recognition display (SPA, public screen / TV kiosk)
**Researched:** 2026-03-08
**Confidence:** MEDIUM-HIGH (based on training knowledge through August 2025; no live web verification available — flag versions before scaffolding)

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| React | 18.3.x | UI framework, component tree, rendering | React 18 is the production-stable baseline as of 2025. React 19 added server actions — unnecessary complexity for a pure client-side display app. React 18's concurrent rendering and `useTransition` help with smooth animated carousel updates. Largest animation library ecosystem. |
| Vite | 5.x | Build tool, dev server, bundler | CRA is officially dead (archived 2023). Vite 5 is the de-facto standard for React SPAs in 2025: sub-second HMR, native ESM, minimal config. No webpack complexity. |
| TypeScript | 5.x | Type safety across the codebase | Strongly recommended even for a small app: the date logic (birthday/anniversary week detection), data models (employee records), and future API shapes benefit enormously from typed interfaces. Catches bugs before they appear on the display screen. |
| Tailwind CSS | 3.4.x | Utility-first styling, layout | Tailwind v3 is stable and widely adopted. Tailwind v4 (released early 2025) changed the config model significantly — v3 is safer for a greenfield project starting now unless the team explicitly wants v4. Ideal for full-screen TV layouts: `h-screen`, `w-full`, responsive grid, dark backgrounds. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Framer Motion | 11.x | Animated transitions for carousel cards, entrance/exit effects | Use for all animated transitions: card slide-in/out, fade between celebrants, stagger animations on the employee grid. The gold standard for declarative React animations. `AnimatePresence` handles mount/unmount transitions cleanly — critical for carousel behavior. |
| Swiper.js | 11.x | Touch-ready carousel/slider with autoplay and loop | Use as the carousel engine if you want autoplay, looping, and slide transitions handled declaratively. Has official React bindings (`swiper/react`). Pair with Framer Motion for per-card animations inside each slide. **Alternative:** build a custom carousel with Framer Motion `motion.div` + `AnimatePresence` — simpler if you control all animations anyway (see Stack Patterns section). |
| PapaParse | 5.x | CSV file parsing in the browser | Use for CSV import. Industry standard: handles delimiters, encoding, malformed rows, streaming. Zero dependencies. Synchronous and async modes. Single responsibility — only does CSV. |
| SheetJS (xlsx) | 0.18.x | Excel (.xlsx / .xls) parsing in the browser | Use for Excel import. Community edition (free) reads .xlsx, .xls, .csv from file inputs client-side. No server needed. Be aware: the npm package was intentionally broken in some versions of the community edition — pin to `0.18.5` or use the CDN build if npm install fails. |
| TanStack Query (React Query) | 5.x | Data fetching, caching, background polling, auto-refresh | Use from Phase 1 even while data comes from CSV. Configure `refetchInterval` for the future REST API. When the HR API is integrated, the query layer is already in place — just swap the `queryFn`. Handles stale data, background refetch, and loading states without boilerplate. |
| date-fns | 3.x | Date arithmetic: "is this birthday/anniversary in the current week?" | Use for all date logic. Lightweight (tree-shakeable), immutable, no global state. `isThisWeek()`, `differenceInYears()`, `getWeek()` cover all the use cases. Never use moment.js (deprecated, mutable, heavy). |
| Zustand | 4.x | Global state: loaded employee data, current display state, data source mode | Use for app-level state that spans components: the list of employees, which ones are "this week's celebrants", whether we're in CSV mode or API mode. ~1kb, no boilerplate, works perfectly with React 18. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Vite | Dev server + production bundler | `npm run dev` serves with HMR. `npm run build` produces a static `dist/` folder deployable anywhere. |
| ESLint + eslint-plugin-react-hooks | Code quality, hooks rules enforcement | Catches stale closure bugs in carousel timing logic. Use `eslint-config-react-app` or the Vite React template's default config. |
| Prettier | Code formatting | Integrate with ESLint via `eslint-config-prettier`. |
| TypeScript strict mode | `"strict": true` in tsconfig | Enables `noUncheckedIndexedAccess`, `strictNullChecks`. Catches `employee.photo` being `undefined` before it crashes the display. |
| nginx (or any static server) | Production deployment | The built `dist/` is purely static HTML/CSS/JS. Serve with nginx on the internal network. No Node.js runtime needed in production. The TV browser points to `http://[server-ip]/`. |

---

## Installation

```bash
# Scaffold with Vite React + TypeScript template
npm create vite@latest didt-display -- --template react-ts
cd didt-display

# Core animation and carousel
npm install framer-motion swiper

# Data parsing
npm install papaparse xlsx
npm install -D @types/papaparse

# Data fetching and state
npm install @tanstack/react-query zustand

# Date utilities
npm install date-fns

# Styling
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# Dev tools
npm install -D eslint prettier eslint-config-prettier
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| React 18 | Vue 3 | If the team has deep Vue expertise and prefers Options API. Vue 3 + Vite is equally valid technically. React wins here because Framer Motion, Swiper's React bindings, and TanStack Query have better React ecosystem integration. |
| React 18 | Svelte / SvelteKit | If bundle size is the primary concern and the team wants no virtual DOM overhead. Svelte's built-in `{#each}` transitions are elegant. However, the ecosystem for CSV parsing and REST integration is thinner; adds learning curve. |
| Vite 5 | Next.js 14/15 | If SSR or file-based routing is needed. This is a pure client-side display — SSR adds zero value and unnecessary complexity. Static SPA is the right choice. |
| Tailwind CSS v3 | CSS Modules | If the team dislikes utility-class HTML. CSS Modules work fine but slow down iteration for layout-heavy TV UIs. |
| Tailwind CSS v3 | Tailwind CSS v4 | Tailwind v4 (2025) has no `tailwind.config.js` — config is in CSS. Viable for new projects, but tooling (IntelliSense, plugins) is less mature. Use v4 if starting fresh and the team is comfortable with the new model. |
| Framer Motion | React Spring | React Spring is powerful but has a steeper API. Framer Motion's `AnimatePresence` + `variants` pattern maps directly to the enter/exit carousel use case. |
| Framer Motion | CSS animations only | Viable for simple fade transitions. Not viable for the staggered card entrance effects, exit animations, and dynamic layout transitions this app needs. |
| Swiper.js | Embla Carousel | Embla is more lightweight and programmatic — better if you need pixel-perfect custom carousel logic. For this use case (autoplay, loop, full-screen slides) Swiper's declarative API is faster to implement. |
| TanStack Query | SWR | SWR is lighter (less features). TanStack Query's `refetchInterval` + `staleTime` configuration is more expressive for the display's polling pattern. SWR is a viable fallback. |
| date-fns | Luxon | Luxon handles timezones more robustly — relevant if the HR API returns ISO timestamps with timezone offsets. For birthday/anniversary detection based on local dates, date-fns is sufficient and smaller. |
| Zustand | React Context + useReducer | Context works at this scale. Zustand wins because: no Provider wrapper, no re-render propagation issues, easier to update state from outside React (e.g., from a file import callback). |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Create React App (CRA) | Officially archived in 2023. No longer maintained. Slow build times, outdated Webpack 4, broken with Node 18+. | Vite 5 with `npm create vite@latest` |
| moment.js | Deprecated by maintainers. 67kb minified. Mutable API causes subtle bugs in date comparison logic. | date-fns v3 (tree-shakeable, immutable) |
| jQuery | No place in a React app. DOM manipulation conflicts with React's virtual DOM reconciliation. | React hooks + Framer Motion |
| Redux Toolkit | Correct tool for large, complex state with many actors. This app has one state shape (employee list + current week filter). Redux adds 4-5x the boilerplate for zero benefit here. | Zustand v4 |
| React Router | The display has one view — the carousel. There are no routes. Adding a router adds weight for no benefit. If an admin import screen is added later, React Router can be introduced then. | Conditional rendering with state |
| WebSockets / Socket.io | The data changes at most once per week (when someone imports a new CSV). Polling via TanStack Query `refetchInterval` is far simpler and sufficient. | TanStack Query `refetchInterval` |
| Electron | Unnecessarily heavy if the TV runs a browser. Kiosk mode in Chrome/Chromium is sufficient. Only consider Electron if offline-first operation (no LAN) is required. | Chrome kiosk mode (`--kiosk` flag) |
| xlsx npm package (latest from npm) | SheetJS intentionally broke the community npm package in some releases to push paid plans. Pin to `0.18.5` or use the official CDN/GitHub release tarball. | `npm install xlsx@0.18.5` or use the SheetJS CDN build |

---

## Stack Patterns by Variant

**If the HR API becomes available (Phase 2+):**
- Add a TanStack Query `queryFn` that calls the REST endpoint
- Keep the CSV import path as a fallback
- Use Zustand to track `dataSource: 'csv' | 'api'`
- The display component does not change — only the data layer changes

**If the display needs to run fully offline (no LAN):**
- Bundle employee data at build time (static JSON in `public/`)
- Add a simple admin page behind a local route for CSV import
- Consider `localStorage` persistence so a reimport survives browser refresh
- This does not require Electron — Chrome in kiosk mode with a `file://` URL or local nginx works

**If multiple departments want their own displays:**
- Keep all data per-instance (CSV per department)
- No multi-tenancy needed — each TV gets its own deployed instance
- Parameterize via environment variables (`VITE_DEPARTMENT_NAME`)

**If the design requires full-screen video backgrounds or complex CSS effects:**
- Add `react-player` (v2) for video background support
- Use CSS `backdrop-filter` for glassmorphism card effects — no library needed
- Framer Motion handles overlay animations on top of video

---

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| React 18.3.x | Framer Motion 11.x | Framer Motion 11 requires React 18+. Do not use Framer Motion 10 with React 18 — peer dep warnings and deprecated APIs. |
| React 18.3.x | TanStack Query 5.x | TanStack Query v5 dropped the `useQuery` object-based overload — breaking change from v4. Use v5 syntax from the start. |
| Swiper 11.x | React 18.x | Swiper 11 ships its own React bindings — no separate package needed. Import from `swiper/react`. |
| Tailwind 3.4.x | PostCSS 8.x | Tailwind 3 requires PostCSS 8. Vite includes PostCSS — just install tailwindcss, postcss, autoprefixer. |
| date-fns 3.x | TypeScript 5.x | date-fns v3 ships its own types — no `@types/date-fns` needed. v3 changed import paths from v2 — do not mix. |
| xlsx 0.18.5 | Vite 5.x | SheetJS community edition works in browser via `import * as XLSX from 'xlsx'`. No special Vite config needed. |

---

## Deployment Architecture

```
[Internal LAN]
    |
    v
[nginx static server]  ← serves dist/ (built once, or re-built after CSV import)
    |
    v
[Chrome in kiosk mode on TV PC]
    |
    ↕  (optional: future)
[HR REST API endpoint]
```

- **Static SPA**: `npm run build` produces `dist/`. Copy to nginx server.
- **Auto-refresh**: TanStack Query polls a local JSON file (generated from CSV import) or the HR API. `refetchInterval: 60_000` (every minute) is sufficient.
- **CSV import workflow (Phase 1)**: Admin drags Excel/CSV into the app's import page → SheetJS/PapaParse parses it in the browser → data saved to `localStorage` → Zustand state updated → display refreshes automatically.
- **Kiosk mode**: `chromium-browser --kiosk --noerrdialogs --disable-infobars http://localhost/`

---

## Sources

- Training knowledge (React, Vite, Framer Motion, TanStack Query, date-fns ecosystems) — through August 2025 — MEDIUM confidence
- SheetJS community edition npm breakage: known issue documented across GitHub issues and community posts — MEDIUM confidence; verify current status before `npm install xlsx`
- Vite vs CRA: Vite officially recommended by React team and Vite docs as of 2024 — HIGH confidence
- TanStack Query v5 breaking changes vs v4: documented in official TanStack changelog — HIGH confidence (from training)
- Framer Motion v11 React 18 requirement: documented in Framer Motion release notes — HIGH confidence (from training)

**Flags for live verification before implementation:**
- [ ] Confirm `xlsx` current safe version on npm (the community edition situation may have changed)
- [ ] Confirm Tailwind v4 vs v3 choice — v4 tooling may be mature enough by implementation time
- [ ] Confirm Swiper 11.x React bindings API (import paths changed between Swiper 8 → 9 → 11)
- [ ] Confirm React 18 vs 19 — React 19 stable released December 2024; may be the recommended baseline by now

---

*Stack research for: DIDT Birthday & Anniversary Display (digital signage SPA)*
*Researched: 2026-03-08*
