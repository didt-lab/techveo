# Feature Research

**Domain:** Employee recognition display app (digital signage — birthdays & work anniversaries)
**Researched:** 2026-03-08
**Confidence:** MEDIUM (web search unavailable; based on training knowledge of digital signage, HR recognition, and office display products through Aug 2025)

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features that office staff expect to see on any employee recognition display. Missing these makes the screen feel broken, amateur, or useless.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Current-week celebration roster | Core purpose — the screen must show who is being recognized THIS week | LOW | Must auto-filter by current date window; "this week" = Mon–Sun or rolling 7-day window |
| Employee photo | Humanizes recognition; text-only feels cold and impersonal | LOW | Requires photo storage; fallback needed when no photo exists (initials avatar or placeholder) |
| Full name | Minimum personal acknowledgment; first name only feels too casual in institutional context | LOW | Must handle accented characters (Spanish names: é, á, ñ, etc.) |
| Event type label | Viewer needs to know: is this a birthday or a work anniversary? | LOW | Visual distinction — icon, color, or badge. "Cumpleaños" vs. "Aniversario" |
| Years count | For anniversaries: "X años en la institución" is the recognition content. For birthdays: age is optional but expected in institutional contexts | LOW | Anniversary: years since hire date. Birthday: current age (birth year required) |
| Animated / carousel display | A static list looks like a spreadsheet. A public display screen must be visually engaging | MEDIUM | Auto-advancing slides; smooth transitions. This is a TV/monitor, not a dashboard |
| Automatic self-refresh | The screen must update without anyone touching it — especially across midnight, weekends, and new weeks | MEDIUM | Periodic polling or scheduled recalculation; handles week rollover without manual restart |
| Graceful empty-state | When nobody has an event this week, the screen must not show an error or blank | LOW | Show a default message or rotating institutional image instead of a broken/empty screen |
| CSV/Excel data import | Without HR API integration, this is the only way to load data initially | MEDIUM | Parse date fields correctly (DD/MM/YYYY vs MM/DD/YYYY ambiguity is a real risk); handle encoding issues (UTF-8 vs Windows-1252 for Spanish files) |
| Duplicate/conflict handling on import | Re-importing an updated file must not create double entries | MEDIUM | Upsert strategy: match on employee ID or unique key, update existing records |

### Differentiators (Competitive Advantage)

Features that make the display feel polished, institutional, and worth maintaining. These align with the core value: "that every collaborator feels publicly recognized."

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Branded visual identity | The display looks like it belongs to DIDT, not a generic app. Increases pride in the screen itself | LOW | Logo, institutional colors, custom typography. Config-driven, not hardcoded |
| "Exact day" highlight | When today IS the birthday or anniversary, the card gets a special visual treatment (glow, banner, fireworks animation) vs. "upcoming this week" cards | MEDIUM | Two visual states: "this week" and "today" — motivates colleagues to actually say something |
| Event window flexibility | Some weeks have heavy clusters; admin may want Mon–Sun vs. rolling 7 days vs. +3/−0 days | LOW | Configurable window size. Default: current ISO week |
| HR API integration (adapter pattern) | Eliminates manual re-import; data stays current without IT action | HIGH | The PROJECT.md notes this is future work. Design the data layer as a pluggable adapter from day 1: CSV importer and API fetcher both satisfy the same interface |
| Multi-event-type support | Distinguishing between birthdays and work anniversaries on the same carousel allows richer celebration and is uncommon in simpler tools | LOW | Already in scope per PROJECT.md. The visual distinction is the differentiator |
| Photo fallback with initials avatar | When a photo is missing, showing a styled initials avatar (like Google/Slack) looks professional vs. a broken image icon | LOW | Generate avatar from name initials + consistent color derived from name hash |
| Import error report | After CSV upload, show a clear summary: "X records imported, Y skipped (reasons)" — reduces data quality anxiety | MEDIUM | Surface row-level errors: missing field, invalid date, duplicate key |
| Transition animations with purpose | CSS/JS animations that feel celebratory (confetti burst, card flip, fade with sparkle) rather than generic slide or fade | MEDIUM | Must not be distracting for an office environment — subtle but festive. Configurable off/on |
| Upcoming events sidebar or ticker | A secondary display zone showing "Coming up next week" provides forward-looking recognition | MEDIUM | Optional second zone; adds complexity to layout but increases engagement |
| Display configuration without code | Admin sets logo, colors, event window, and refresh rate via a config file or minimal UI — not by editing source code | MEDIUM | Even a well-documented `.env` or `config.json` satisfies this. A settings page is overkill for v1 |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Interactive admin UI for editing individual employee records | "Can't we just click on a name and edit it?" | Adds a full CRUD web app, auth system, and user management on top of the display app. Doubles the scope. Misaligns with the PROJECT.md decision to use file import | Re-import a corrected CSV. The import is the editor |
| Email or messaging notifications on birthdays | "Can we also send a Slack/Teams/email message?" | Transforms the app from a display into a notification system. Requires auth credentials, email infra, and ongoing maintenance of a separate channel | The TV screen IS the notification. Out of scope per PROJECT.md |
| Push to mobile / external web access | "Can employees see it on their phone?" | Requires auth, user accounts, mobile responsive design, and public hosting. The security and infrastructure cost far exceeds the value for a departmental tool | The physical screen in the office is the intended interface |
| Milestone-only anniversaries (5/10/15 years) | "Most companies only celebrate milestone years" | PROJECT.md explicitly decided to celebrate every year. Milestone-only logic adds conditional complexity and reduces recognition frequency for newer employees | Celebrate every anniversary. The annual cadence is a feature, not a bug |
| Real-time data push from HR system | "We want changes to appear immediately" | Real-time push requires webhooks, persistent connections, or polling at high frequency. For a weekly-cadence display, this is over-engineering | Poll the HR API on a schedule (e.g., nightly or hourly). Near-real-time is sufficient |
| Approval workflow for photos | "Someone should approve photos before they appear" | Adds a review queue, notification system, and admin state machine. Significant complexity for a one-department internal tool | Establish a naming convention for the photos folder in the import package. Wrong photos are fixed by re-import |
| Analytics / engagement tracking | "How many people actually look at the screen?" | Requires screen-side tracking, server logging, and a reporting dashboard. None of this serves the core value | The recognition happens whether or not it's measured. Skip the analytics layer |

---

## Feature Dependencies

```
[CSV/Excel Import]
    └──enables──> [Employee Data Store]
                      └──enables──> [Carousel Display]
                                        └──enhances──> [Animated Transitions]
                                        └──enhances──> [Exact-Day Highlight]
                                        └──requires──> [Automatic Self-Refresh]

[HR API Integration]
    └──replaces──> [CSV/Excel Import]  (same data store interface)
    └──requires──> [Adapter Pattern in Data Layer]

[Employee Photo]
    └──requires──> [Photo Storage / File Serving]
    └──enhances──> [Photo Fallback Avatar]  (fallback only active when photo missing)

[Branded Visual Identity]
    └──enhances──> [Carousel Display]
    └──enhances──> [Graceful Empty-State]

[Import Error Report]
    └──enhances──> [CSV/Excel Import]

[Exact-Day Highlight]
    └──requires──> [Current-Week Celebration Roster]  (today detection is a subset of week detection)
```

### Dependency Notes

- **Carousel Display requires Employee Data Store:** The display layer has no value without data. The data store is the foundation everything else builds on.
- **HR API Integration replaces CSV Import at the data layer:** Both must produce the same internal data schema. Design the import and the API fetcher as interchangeable adapters that write to the same store.
- **Exact-Day Highlight requires Current-Week Roster:** Today-detection is a refinement of the week-window logic, not a separate system. Build week logic first, then layer in "today == exact date" as a display state.
- **Automatic Self-Refresh requires Carousel Display:** The refresh loop has no purpose before the carousel exists. Build the display, then wire in the auto-refresh trigger.
- **Photo Fallback Avatar enhances Employee Photo:** The fallback is only meaningful after photo display is working. It is a polish layer, not a foundation.

---

## MVP Definition

### Launch With (v1)

Minimum viable product — enough to put on the TV and have it mean something.

- [ ] **Employee data store with CSV/Excel import** — without data, nothing else works; import is the only viable data entry path before HR API is available
- [ ] **Current-week event filter** — shows only employees with a birthday or anniversary in the current ISO week; this is the entire display logic
- [ ] **Animated carousel** — full name, photo (with fallback avatar), event type label, and years count on each card; auto-advances through celebrants
- [ ] **Event type visual distinction** — birthday vs. anniversary must be visually distinct (color, icon, or label); core to the recognition value
- [ ] **Automatic self-refresh** — the screen recalculates the current week's roster on a schedule without human intervention; handles midnight/week-rollover
- [ ] **Graceful empty-state** — when no events this week, show something intentional rather than a blank or broken screen
- [ ] **Branded visual identity** — DIDT logo and institutional colors; a generic-looking display will not earn trust or buy-in from the team

### Add After Validation (v1.x)

Features to add once the screen is running and the team is using it.

- [ ] **Exact-day highlight** — visual emphasis on cards where today IS the birthday or anniversary; add once the carousel is working and generating engagement
- [ ] **Import error report** — show a clear summary after CSV upload; add once the first round of real data imports surfaces confusion or data quality issues
- [ ] **Event window configurability** — allow admin to set Mon–Sun vs. rolling 7 days; add when the DIDT team starts asking "can we show next week's too?"
- [ ] **Transition animation theming** — festive vs. subtle animation modes; add once base display is stable and the team asks for more polish

### Future Consideration (v2+)

Features to defer until the core is validated and HR API coordination is unblocked.

- [ ] **HR API integration** — highest long-term value but blocked on institutional coordination; design the adapter interface in v1, implement when the API endpoint is available
- [ ] **Upcoming events sidebar** — "next week" preview zone; adds layout complexity, defer until current-week display is proven
- [ ] **Multi-department support** — if other departments (not just DIDT) want their own instance; defer until there is actual demand beyond the initial department

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Employee data store + CSV import | HIGH | MEDIUM | P1 |
| Current-week event filter | HIGH | LOW | P1 |
| Animated carousel (photo, name, type, years) | HIGH | MEDIUM | P1 |
| Event type visual distinction | HIGH | LOW | P1 |
| Automatic self-refresh | HIGH | MEDIUM | P1 |
| Graceful empty-state | MEDIUM | LOW | P1 |
| Branded visual identity | MEDIUM | LOW | P1 |
| Photo fallback avatar | MEDIUM | LOW | P1 |
| Exact-day highlight | HIGH | LOW | P2 |
| Import error report | MEDIUM | MEDIUM | P2 |
| Event window configurability | LOW | LOW | P2 |
| Transition animation theming | LOW | MEDIUM | P2 |
| Upcoming events sidebar | MEDIUM | MEDIUM | P3 |
| HR API integration | HIGH | HIGH | P3 |
| Multi-department support | LOW | HIGH | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

---

## Competitor Feature Analysis

Products in this space include: Enplug, Screenly, Rise Vision (digital signage with HR integrations), BambooHR recognition modules, and purpose-built birthday/work anniversary bots (BirthdayBot for Slack/Teams).

| Feature | Digital Signage Platforms (Enplug/Rise Vision) | Slack/Teams Birthday Bots | Our Approach |
|---------|------------------------------------------------|---------------------------|--------------|
| Data source | Native HRIS integrations (BambooHR, ADP, Workday) | Slack directory or manual | CSV import first; HR API adapter later |
| Display modality | Full-screen slides, branded templates, scheduling | Chat message / channel post | Full-screen TV carousel — physical presence in office |
| Event types | Birthday-focused; some do work anniversaries | Birthday-focused; fewer do anniversaries | Both birthday and anniversary, every year |
| Photo handling | Often requires individual upload or HRIS photo sync | Uses Slack avatar | CSV import package with photos; fallback avatar |
| Animation | Template-based; varies by platform | Static card in chat | Custom CSS/JS animations; celebratory but not distracting |
| Admin UI | Full web admin dashboard | Slack app settings | Config file / minimal settings; no full dashboard |
| Offline operation | Cloud-dependent (requires internet) | Cloud-dependent | Local/intranet-deployable; works without public internet |
| Cost | $20–$50/screen/month (SaaS) | $0–$3/user/month | Custom-built, zero ongoing SaaS cost |

**Key differentiator for our context:** Enterprise SaaS tools require internet, HRIS contracts, and per-seat or per-screen licensing. This app is built for an internal government/institutional IT department that needs a self-hosted, low-maintenance, zero-cost-per-seat display that works on the local network.

---

## Sources

- PROJECT.md context: explicit requirements and out-of-scope decisions provided by project owner
- Training knowledge (through Aug 2025): Enplug, Screenly, Rise Vision, BirthdayBot feature sets; digital signage UX patterns; HR recognition software common capabilities
- NOTE: Web search and WebFetch were unavailable during this research session. Competitor feature details are based on training data and should be verified against current product pages if precision is needed. Confidence on competitor specifics is LOW; confidence on domain table stakes and anti-features is MEDIUM-HIGH (well-established patterns in this category).

---

*Feature research for: Employee birthday & anniversary recognition display (DIDT)*
*Researched: 2026-03-08*
