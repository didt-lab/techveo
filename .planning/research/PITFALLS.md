# Pitfalls Research

**Domain:** Digital signage — employee birthday & anniversary display (internal office screen)
**Researched:** 2026-03-08
**Confidence:** HIGH (date/timezone: verified via MDN official docs; CSV, memory, photo, privacy: HIGH based on domain-specific engineering knowledge and known failure patterns)

---

## Critical Pitfalls

### Pitfall 1: Timezone-Offset Date Shifting on Import

**What goes wrong:**
A collaborator has a birthdate of `1990-02-15`. When the CSV contains `1990-02-15` (date-only ISO string) and the code does `new Date("1990-02-15")`, JavaScript parses date-only strings as **UTC midnight**. When the server/browser is in UTC-6 (Central America), displaying `date.getMonth()` and `date.getDate()` returns February 14 — one day early. The collaborator's birthday never shows on February 15.

**Why it happens:**
JavaScript has a documented split behavior: `new Date("2024-02-15")` (date-only) is parsed as UTC, while `new Date("2024-02-15T00:00:00")` (with time) is parsed as local time. This inconsistency (MDN-confirmed) catches developers who assume consistent parsing. The bug is invisible in UTC+0 environments but breaks at UTC-5, UTC-6 (Latin America).

**How to avoid:**
Never call `new Date(dateString)` on date-only strings for birthdate/anniversary comparisons. Instead, parse the date components directly:
```javascript
// Safe: parse as local calendar date, no UTC shift
function parseLocalDate(isoDateStr) {
  const [year, month, day] = isoDateStr.split('-').map(Number);
  return { year, month, day }; // work with components, not Date objects
}

// For "is this week?" check: compare month+day against today's local month+day
function isThisWeek(birthMonth, birthDay) {
  const today = new Date(); // local time
  const todayMonth = today.getMonth() + 1;
  const todayDay = today.getDate();
  // compute start/end of current week using local components
}
```
Store birthdates and hire dates as plain `{year, month, day}` objects in state, not as `Date` instances.

**Warning signs:**
- A collaborator's event appears one day early or never appears on the correct day
- Tests pass in CI (UTC server) but fail locally in a non-UTC timezone
- Dates imported from Excel appear as `1990-02-14` when the source shows `1990-02-15`

**Phase to address:** Data import phase (CSV/Excel parsing implementation)

---

### Pitfall 2: February 29 Leap Year Anniversary Explosion

**What goes wrong:**
A collaborator was hired on February 29, 2020. In 2025 (non-leap year), there is no February 29. Code that tries to construct `new Date(2025, 1, 29)` silently rolls over to March 1, 2025 in JavaScript. The anniversary either shows on March 1 (wrong week) or throws, or is silently skipped in a filter, meaning the collaborator is **never recognized** for years that aren't leap years.

**Why it happens:**
Developers write anniversary logic as "replace the year, keep month/day" without handling the leap year edge case. It's rare (Feb 29 birthdays are ~0.07% of population) so it never appears in initial testing, but it will appear in production the first non-leap year.

**How to avoid:**
When computing "what date does this annual event fall on in year Y?", explicitly handle Feb 29:
```javascript
function getAnniversaryDateInYear(month, day, targetYear) {
  if (month === 2 && day === 29) {
    // Convention: celebrate on Feb 28 in non-leap years
    const isLeap = (targetYear % 4 === 0 && targetYear % 100 !== 0) || (targetYear % 400 === 0);
    return { year: targetYear, month: 2, day: isLeap ? 29 : 28 };
  }
  return { year: targetYear, month, day };
}
```
Document this convention (Feb 28 fallback) in the project so it is intentional and consistent.

**Warning signs:**
- No automated test for Feb 29 birthdate/hire date
- Anniversary logic uses `date.setFullYear(currentYear)` without validation

**Phase to address:** Core date logic phase (week-window calculation)

---

### Pitfall 3: "Current Week" Window Definition Ambiguity

**What goes wrong:**
The requirement says events are shown "during the week of the event." If "week" means Monday–Sunday ISO week, the display on a Monday may show different collaborators than what was displayed on the Sunday before — even though the event date is the same calendar day. Alternatively, if "week" means "7 days centered on the event," a collaborator born on Sunday December 31 would show from December 24 to January 6, spanning two calendar years and requiring year-boundary handling.

**Why it happens:**
The term "week" is ambiguous and no single definition is universally correct. Teams implement it informally and discover the edge cases when the screen shows wrong names near week boundaries.

**How to avoid:**
Define the window precisely in code before writing the feature:
- **Recommended definition:** "An event is visible if `today >= eventDate - N days` AND `today <= eventDate`." A simple forward-looking N-day window (e.g., 6 days) avoids ISO-week complexity entirely.
- Document this definition as a named constant: `const VISIBILITY_WINDOW_DAYS = 6`.
- Handle year-wrap for December dates (a December 28 birthday is visible in the last week of December; a January 2 birthday becomes visible December 27 of the previous year).

**Warning signs:**
- The word "week" appears in comments without a precise numeric definition
- No test case for a birthday on January 1, January 2, December 30, or December 31

**Phase to address:** Core date logic phase

---

### Pitfall 4: Excel Date Serial Numbers in CSV Export

**What goes wrong:**
HR exports the collaborator list from Excel as CSV. Birthdates in Excel are stored internally as serial numbers (days since 1900-01-01, with a historical off-by-one bug for 1900). When Excel exports to CSV, some date cells export as `44927` (a serial number) instead of `2023-01-01`. The import silently stores `44927` as the date, which when parsed becomes year 2022 or causes `NaN`. The collaborator is imported with a wrong or missing birthdate.

**Why it happens:**
Date cells in Excel export as serial numbers when the cell formatting is lost (common when columns are formatted as "General" or "Number"). This is especially frequent when HR staff copies data between spreadsheets. The bug is invisible until someone notices a collaborator showing on the wrong date.

**How to avoid:**
In the CSV parsing layer, detect and convert Excel serial numbers:
```javascript
function parseExcelDateOrString(value) {
  const num = Number(value);
  if (!isNaN(num) && num > 40000 && num < 60000) {
    // Likely an Excel date serial number
    const excelEpoch = new Date(1899, 11, 30); // Excel epoch with off-by-one fix
    const ms = excelEpoch.getTime() + num * 86400000;
    const d = new Date(ms);
    return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
  }
  // Try ISO parse
  return parseLocalDate(value);
}
```
Log a warning when serial number conversion is applied so it can be reviewed.

**Warning signs:**
- A date column shows 5-digit numbers (40000–50000 range) after import
- Collaborator birthdays clustering around year 2022–2023 regardless of actual ages

**Phase to address:** Data import phase

---

### Pitfall 5: Memory Leak from Non-Cleared Animation Intervals on Screen Refresh

**What goes wrong:**
The display screen runs 24/7 as an unattended kiosk. The carousel animation uses `setInterval` or `requestAnimationFrame` loops to rotate slides. When the app reloads data (hourly or daily refresh), new intervals are registered without clearing the old ones. After a few days, the browser has dozens of stale interval callbacks running simultaneously. The animation stutters, tabs memory grows, and eventually the browser crashes or the display freezes.

**Why it happens:**
Developers test the app for minutes during development. The leak only manifests after hours of operation. React's `useEffect` cleanup function is the common prevention point but is easy to omit on first pass. Vanilla JS interval IDs are stored in component state but the cleanup runs only if the component unmounts (which it never does on a persistent display).

**How to avoid:**
- Always return a cleanup function from `useEffect` for any interval/timeout:
  ```javascript
  useEffect(() => {
    const id = setInterval(advanceSlide, SLIDE_DURATION_MS);
    return () => clearInterval(id); // REQUIRED
  }, [employees]);
  ```
- Schedule a full page reload once per day (e.g., 3:00 AM) via `setTimeout` or a server-sent event to recover from any accumulated state:
  ```javascript
  // Hard reset at 3 AM — clears all memory state
  scheduleDaily('03:00', () => window.location.reload());
  ```
- Use `WeakRef`/`FinalizationRegistry` cautiously; the simpler daily-reload strategy is more reliable.

**Warning signs:**
- Animation frame rate drops after hours of operation
- Browser task manager shows growing memory for the display tab
- Carousel skips frames or shows multiple slides simultaneously

**Phase to address:** Carousel/display phase; also verified during "long-running stability" test

---

### Pitfall 6: Storing Employee Photos as Database BLOBs

**What goes wrong:**
Photos are stored as base64 strings in SQLite/PostgreSQL or embedded directly in the JSON data store. As the team grows, the data file/database becomes hundreds of MB. Every time the app loads data, it transfers all photos to the browser in a single payload. The initial load takes 10–30 seconds. The app also becomes unmaintainable — replacing one photo requires a database migration.

**Why it happens:**
It feels simple to store everything in one place. JSON files with base64-encoded photos "just work" during development with 5 test employees. The problem only appears at realistic scale (50+ employees with quality headshots).

**How to avoid:**
Store photos as files on disk in a dedicated `/photos/` directory. The data store (JSON, SQLite, or CSV) stores only the filename or relative path. The display fetches photos via HTTP:
```
/photos/maria-garcia.jpg    ← file on disk
CSV record: "Maria García", ..., "maria-garcia.jpg"
```
Use a convention for missing photos: a single `default-avatar.png` fallback in the same directory. This way missing photos never cause broken images — only an update to the photos folder is needed.

**Warning signs:**
- Initial data load takes more than 1 second
- The data file/database size is measured in MB when employee count is under 200
- The CSV or JSON has columns like `photo_base64` or `photo_data`

**Phase to address:** Data model / architecture phase (before any import is written)

---

### Pitfall 7: CSV Encoding Issues with Spanish Characters

**What goes wrong:**
HR generates the CSV file on a Windows machine where Excel defaults to Windows-1252 (Latin-1) encoding, not UTF-8. Names like `María García`, `José Martínez`, and `Ángel Núñez` import as `Mar?a Garc?a` or `MarÃ­a GarcÃ­a`. The display shows garbled names in public, which is embarrassing and defeats the recognition purpose.

**Why it happens:**
Modern JS/browser environments default to UTF-8. When a non-UTF-8 file is read as UTF-8, multi-byte characters are misinterpreted. This is nearly universal in Spanish-language HR systems that use legacy Windows tools.

**How to avoid:**
- Detect encoding at import time. If the file contains bytes in the 0x80–0x9F range, attempt Latin-1/Windows-1252 decode:
  ```javascript
  // Using FileReader with explicit encoding
  const reader = new FileReader();
  reader.readAsText(file, 'windows-1252'); // or try UTF-8 first, then fallback
  ```
- Show the first 5 rows of the parsed preview to the user before confirming the import, so encoding problems are visible immediately.
- Document in the import UI: "If names appear with strange characters, export your Excel file as CSV UTF-8."

**Warning signs:**
- Any `?`, `Ã`, `Â`, or `▯` characters appearing in imported names
- Files with accented Spanish characters (á, é, í, ó, ú, ñ, ü) not displaying correctly
- HR staff using Excel on Windows (very common)

**Phase to address:** Data import phase

---

### Pitfall 8: No Graceful Fallback When Data Is Empty or Stale

**What goes wrong:**
It is Sunday at midnight and the weekly data refresh runs. The API call fails (the HR system is down for maintenance), or the CSV file was not updated this week. The display shows a blank screen or a JavaScript error. On Monday morning, the screen is black and nobody knows why. It looks broken.

**Why it happens:**
Developers test the happy path (data loads, events exist). The empty-state and error-state are afterthoughts. A display screen has no user to "retry" — it must handle errors autonomously.

**How to avoid:**
- Always maintain a "last known good" data snapshot on disk or in localStorage. On load failure, serve the cached data with a timestamp warning.
- Design the empty state: if no events exist this week, show a branded holding screen ("No events this week") rather than blank.
- Implement retry with exponential backoff for API calls. For CSV-import mode, the file is static — read failure should retry 3 times then serve cache.

**Warning signs:**
- No `try/catch` around data-loading code
- No empty-state UI component exists
- The display has crashed and nobody noticed for hours

**Phase to address:** Data loading / refresh phase

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Store all dates as JavaScript `Date` objects in state | Easy to pass around | UTC-shift bugs in non-UTC timezones; breaks leap year edge case | Never — always store as `{year, month, day}` plain objects |
| Base64-encode photos in the JSON/CSV | Single-file deployment | Massive file size; slow loads; hard to update individual photos | Never for production |
| Hardcode "this week" as "Mon–Sun ISO week" | Simpler initial logic | Week-boundary display inconsistencies near Monday midnight | Only if product accepts Monday-only refreshes |
| Use `innerHTML` to render employee names | Faster templating | XSS risk if names contain `<` or `"` characters | Never — use `textContent` or React |
| Skip encoding detection on CSV import | Faster import code | Garbled Spanish names in production | Never — HR files from Windows are commonly Latin-1 |
| No daily page reload on kiosk | Fewer moving parts | Memory leak accumulation causes display crash after days | Acceptable only in short-running demo contexts |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| HR API (future) | Assume API returns dates as ISO strings | Validate and normalize format on every API response; HR systems often return `DD/MM/YYYY` or Excel serial numbers |
| HR API (future) | Poll the API on every browser refresh | Cache API response server-side or in a scheduled job; avoid hammering HR system from display tab |
| Excel/CSV import | Read file with `FileReader` default encoding (UTF-8) | Detect encoding; offer Windows-1252 fallback for files from Windows-Excel |
| Excel/CSV import | Accept any column order | Require a header row with known column names; validate before accepting import |
| Photo directory | Rely on exact case-sensitive filename match (`Maria.jpg` vs `maria.jpg`) | Normalize all photo filenames to lowercase on upload and in data records; Linux filesystems are case-sensitive |
| Browser kiosk | Assume the tab stays active indefinitely | Some browsers throttle background/inactive tabs; ensure the display tab is always active/fullscreen |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Loading all employee photos on initial load regardless of whether they have an event this week | Slow first paint; large network payload | Load only photos for employees with events in the current week | At ~50+ employees with full-size headshots |
| Re-computing "which employees are this week?" on every carousel tick | Wasted CPU; potential animation jitter | Compute the weekly employee list once on load and memoize; only recompute on daily refresh | Immediately noticeable on slow display hardware (Raspberry Pi, low-end TV stick) |
| Storing carousel state in URL query params | Works as dev shortcut | URL changes trigger full React re-renders; causes animation flicker | From day one |
| CSS animations using `width`/`height`/`top`/`left` transitions | Smooth in Chrome on dev machine | Causes layout reflow on every frame; jitters on low-power hardware | On any GPU-starved display device |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Exposing raw employee CSV (names, birthdates, hire dates) via a public-accessible URL | Personal data breach; GDPR/privacy law violation | Serve CSV/data only from authenticated or internal-network-only routes; the display should only receive computed "who is visible this week" data |
| Embedding employee photos directly in the HTML source (via base64 in `<img src>`) | Photos are visible in browser devtools to anyone at the screen | Acceptable for an internal office screen, but document this explicitly as a privacy decision |
| Trusting CSV column names without sanitization | An attacker (or misconfigured HR export) could inject script-like content into name fields | Use React (which escapes by default) or explicit `textContent` assignment; never `innerHTML` with imported data |
| Storing HR API credentials in frontend JavaScript | Credentials exposed to anyone who opens devtools | All API calls must go through a backend proxy; never expose HR API keys in client-side code |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Carousel moves too fast (slide duration < 5 seconds) | Collaborators walk past the screen and miss their name; no feeling of recognition | Use 8–12 second slide duration; loop back so names repeat throughout the day |
| No visual distinction between birthday and work anniversary | Viewers don't know which event is being celebrated | Use distinct icons (cake for birthday, star/medal for anniversary) and different color accents |
| Photo not available → broken image icon shown | Looks unfinished, especially on a public screen | Always fall back to a branded avatar placeholder; never show broken image `alt` text on a display screen |
| Year count displayed as "0 years" for a new hire on their first anniversary | Technically correct but feels dismissive | Display "1st year" or "1 year" with context ("joined [year]") so it feels celebratory, not numerical |
| Names truncated without ellipsis at small font sizes | Long Spanish names (e.g., "María Inmaculada Rodríguez Hernández") get cut off mid-character | Test with the longest realistic name from the actual team; use CSS `text-overflow: ellipsis` and font scaling |
| Screen goes blank between data refresh and next render | Jarring black flash visible to the whole office | Use a fade transition; keep the old data rendering until new data is confirmed loaded |

---

## "Looks Done But Isn't" Checklist

- [ ] **Date comparison:** Verified that birthday shows on the correct calendar day when the server/browser is in UTC-5 or UTC-6 (not just UTC)
- [ ] **Leap year:** Has a test employee with a February 29 birthdate or hire date; the app handles non-leap years gracefully
- [ ] **Week boundary:** Events on December 31 and January 1 are included correctly in their respective week windows
- [ ] **Empty state:** When no employees have events this week, a branded holding screen is displayed instead of a blank or error
- [ ] **Photo fallback:** Removing a photo file causes the display to show a placeholder, not a broken image
- [ ] **Encoding:** A CSV file exported from Windows Excel with names containing `á`, `é`, `ñ`, `ü` imports correctly
- [ ] **Excel serial date:** A CSV where dates appear as 5-digit numbers (e.g., `44927`) is handled correctly or rejected with a clear error
- [ ] **Memory stability:** After 24 hours of continuous operation, the browser tab memory is not growing unboundedly
- [ ] **Data staleness:** If the data file/API is unavailable on refresh, the display shows the last valid data rather than crashing
- [ ] **Long names:** The display renders correctly with a full Spanish double-surname name at the configured font size

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Timezone shift corrupts stored dates | HIGH | Audit all stored dates; add UTC-offset correction script; re-import from source CSV with fixed parsing code |
| Feb 29 collaborator silently missing | LOW | Add special-case handling in anniversary computation; no data migration needed |
| Memory leak has crashed display | LOW | Restart browser; add daily page-reload schedule; deploy interval cleanup fix |
| Photos stored as base64 in data file | HIGH | Extract all base64 strings to files; update data store to reference filenames; requires migration script |
| Encoding corrupted all Spanish names | MEDIUM | Re-import original CSV with correct encoding; data correction is straightforward if source file is retained |
| Excel serial dates stored as numeric dates | MEDIUM | Identify affected records by range (values 40000–60000); run conversion script; re-validate |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Timezone-offset date shifting | Data model + import phase | Unit test: parse `1990-02-15` in UTC-6, assert month=2 day=15 |
| Feb 29 leap year edge case | Core date logic phase | Unit test: hire date Feb 29 2020, check 2021, 2022, 2023, 2024 anniversary dates |
| "Current week" window ambiguity | Core date logic phase | Unit test: Dec 31, Jan 1, and a date whose window spans year boundary |
| Excel serial number dates | Data import phase | Integration test: import a CSV row with `44927` in date column; assert correct ISO date |
| Memory leak from stale intervals | Carousel/display phase | 24-hour soak test; monitor browser memory via performance API |
| Photos stored as BLOBs | Architecture phase (before import) | Architecture review: data store must reference filenames only |
| CSV encoding (Spanish characters) | Data import phase | Integration test: import Windows-1252 CSV; assert `ñ` and `á` survive |
| Empty/stale data fallback | Data loading phase | Integration test: simulate API failure; assert display shows cached data |
| Blank screen on data refresh | Display/carousel phase | Manual test: trigger refresh while carousel is playing; assert no blank flash |

---

## Sources

- MDN Web Docs — JavaScript Date object, timezone and parsing behavior (verified 2026-03-08): https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date
- MDN confirmed: date-only ISO strings parsed as UTC; date+time strings parsed as local — this is the root cause of Pitfall 1
- Excel date serial number format — documented Excel off-by-one epoch bug (1900 leap year bug): widely known, affects all Excel CSV exports
- Windows-1252 vs UTF-8 encoding in Excel CSV exports: standard behavior documented by Microsoft for Excel on Windows
- React useEffect cleanup pattern for intervals: React official documentation on effect cleanup
- Domain knowledge: internal office display / kiosk patterns, employee recognition systems, Latin American HR tooling

---
*Pitfalls research for: Digital signage — employee birthday & anniversary display (DIDT)*
*Researched: 2026-03-08*
