# Bulk Import Revamp (Portal / Admin)

> **Purpose:** Spec for admin UX after the backend stops Google-enriching imports and lands SCB imports as `PENDING`.  
> **Audience:** Engineers / agents implementing portal changes.  
> **Backend counterpart:** `TooDoo-Backend/docs/bulk-import-revamp.md`.

---

## Goal

Imported businesses must be reviewed by an admin **before** they go live, and they must **not** share the same queue as self-registered companies.

| Queue | Who | Source | Status |
|-------|-----|--------|--------|
| **Väntande** (existing) | Self-registered applicants | `SELF_REGISTERED` | `PENDING` |
| **Importerade** (new tab) | SCB bulk imports awaiting review | `IMPORTED` | `PENDING` |
| **Företag** (existing) | Live listings | either | `APPROVED` |

---

## Current behaviour (baseline)

| Screen | Route | Today |
|--------|-------|--------|
| Företag | `/companies` | Lists `APPROVED` (all sources); client-side source filters including imports |
| Väntande | `/pending` | All `PENDING` businesses (no source filter) — would mix self-reg + imports after backend change |
| Sidebar counts | `AdminSidebar` | `listBusinesses("PENDING")` — would count imports too |
| Claim / registration | `/registration` | Can claim an existing enriched import |

Key files:

- `src/components/AdminSidebar.tsx`
- `src/components/AdminLayout.tsx` (page titles)
- `src/App.tsx` (routes)
- `src/pages/Pending.tsx`
- `src/pages/Companies.tsx`
- `src/lib/api.ts` — `listBusinesses`, `updateBusinessStatus`
- `src/lib/adminPendingCounts.ts`
- Import badges / details: `BusinessImportBadges`, `CompanyDetailsDialog`, `businessImport.ts`

---

## Target UX

### New admin tab: Importerade

Add a sidebar item under **Hantera**, e.g.:

- Title: **Importerade** (or “Importerade företag”)
- Route: `/admin/imported` (or `/imported` — pick one and wire in `App.tsx` + `AdminLayout` title)
- Icon: something distinct from Väntande (e.g. `Download` / `Database` from lucide) — not the same as Företag/Väntande

**Data:** only `status = PENDING` and `source = IMPORTED`.

**Actions per row:**

- View details (reuse / extend `CompanyDetailsDialog` — show SCB fields: name, address, city, org.nr, CFAR, SNI, category, import metadata)
- **Redigera** → `/companies/:id/edit?from=imported` (same admin edit page as Företag: update fields via `PUT /business/:id`, upload/set image via gallery + `imageAssetId`)
- **Godkänn** → `updateBusinessStatus(id, "APPROVED")` → leaves queue; appears under Företag when live
- **Neka** → `updateBusinessStatus(id, "REJECTED")` (or delete if product prefers hard remove)

Contact email/phone are often missing on SCB imports — treat them as optional during audit edit. First uploaded gallery image becomes primary if none is set.

**Do not** auto-send manager invite on approve for imports (often no email; ownership is via claim). Väntande can keep invite-on-approve for self-registered.

**Filters / search:** name, city, category; optional SNI / kommun later.

**Empty / loading states:** clear copy that these came from SCB import and need review before they show in the app.

### Väntande — self-registered only

Update `Pending.tsx` (and sidebar badge) so it only loads:

```ts
listBusinesses("PENDING", /* auth */, /* category */, { source: "SELF_REGISTERED" })
```

Exact API shape follows backend `GET /business?status=PENDING&source=SELF_REGISTERED`.

Approve/deny + invite behaviour stays as today for self-registered.

### Företag — live listings

Keep listing `APPROVED` businesses.

Recommendations:

- Default source filter to **all** or **self_registered**; keep “imported” / “unclaimed imports” filters for ops.
- Pending imports must **not** appear here.
- Once an import is approved, it may appear with existing `BusinessImportBadges` / unclaimed indicators.

### Sidebar pending counts

Split badges:

| Item | Count |
|------|--------|
| Väntande | `PENDING` + `SELF_REGISTERED` |
| Importerade | `PENDING` + `IMPORTED` |
| (unchanged) Kvalitets kontroll / Ägarskap | existing |

Refresh both on `business.updated` / `ADMIN_PENDING_COUNTS_REFRESH`.

---

## API client changes (`src/lib/api.ts`)

Extend `listBusinesses` to accept optional `source`:

```ts
listBusinesses(status?: BusinessStatus, withAuth?: boolean, categoryName?: string, source?: BusinessSource)
// → GET /business?status=PENDING&source=IMPORTED
```

Types already include `BusinessSource` (`SELF_REGISTERED` | `IMPORTED`). Ensure list responses expose `source`, `cfarNr`, `orgNr`, `sniCode`, `importMetadata`, `city`, `address` for the new page (request backend include if missing).

No new approve endpoint — reuse `updateBusinessStatus`.

---

## New page sketch

Suggested file: `src/pages/AdminImportedBusinesses.tsx` (name flexible).

Reuse patterns from `Pending.tsx`:

- Search + category filter
- Card/list rows with approve / deny + details
- `ConfirmDialog` before status change
- Realtime reload on `business.updated`
- `refreshAdminPendingCounts()` after actions

Differences from Väntande:

| | Väntande | Importerade |
|--|----------|-------------|
| Source filter | `SELF_REGISTERED` | `IMPORTED` |
| Primary contact | email expected | often missing — show address / org.nr / CFAR |
| On approve | invite manager | no invite by default |
| Badges | status | import / SCB metadata |

---

## Registration / claim (light touch)

Backend may only allow claiming **approved** imports. Portal should:

- Keep claim UX for matched CFAR when the import is claimable
- Surface a clear error if the import is still pending admin review (if lookup returns nothing or a specific flag)

No need for a separate user-facing “import review” UI outside admin.

---

## Routing & navigation checklist

- [ ] Route in `App.tsx` (lazy import like other admin pages)
- [ ] Menu item in `AdminSidebar` under Hantera
- [ ] Title in `AdminLayout`
- [ ] Pending count for Väntande excludes imports
- [ ] New count for Importerade
- [ ] Väntande fetch uses `source=SELF_REGISTERED`
- [ ] New page fetch uses `source=IMPORTED` + `status=PENDING`
- [ ] Approve/reject wired; no Google-specific UI required
- [ ] Företag does not list pending imports

---

## Copy (Swedish, suggested)

- Sidebar: **Importerade**
- Page heading: **Importerade företag**
- Helper: *Företag hämtade från SCB. Godkänn för att visa dem i appen, eller neka om de inte hör hemma här.*
- Approve toast: *{name} är godkänt och synligt i appen.*
- Reject toast: *{name} har nekats.*

---

## Out of scope

- Triggering bulk SCB import from the portal (CLI remains the runner)
- Editing Google Places fields / enrichment UI
- Merging import review into Företag via filters only (dedicated tab is required)

---

## Implementation order

1. Extend `listBusinesses` client for `source` (depends on backend query param)
2. Restrict Väntande + sidebar count to `SELF_REGISTERED`
3. Add Importerade page + route + sidebar + title + count
4. Wire approve/reject without manager invite
5. Smoke-test: import run → appears only on Importerade → approve → Företag + app search; Väntande unchanged for self-reg
