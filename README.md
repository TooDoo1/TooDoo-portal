# TooDoo Portal

Web portal for TooDoo admins and business managers. It is the operational back-office for the TooDoo platform — admins vet self-registered companies and SCB bulk imports (edit details/images before approval), review ownership-claim applications, and business managers run their own listing (offers, events, invoices, workers).

Built with **React 18**, **Vite 5**, **TypeScript**, **React Router 6**, **TanStack Query**, **Tailwind CSS**, and **shadcn/ui** (Radix primitives).

## Table of contents

- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Scripts](#scripts)
- [Project structure](#project-structure)
- [Routing & roles](#routing--roles)
- [Authentication](#authentication)
- [API layer](#api-layer)
- [Feature areas](#feature-areas)
- [Testing](#testing)
- [Performance](#performance)
- [Deployment](#deployment)
- [Related docs](#related-docs)

## Tech stack

| Concern | Choice |
| --- | --- |
| Framework | React 18 + TypeScript |
| Build tool | Vite 5 (`@vitejs/plugin-react-swc`) |
| Routing | React Router 6 (`BrowserRouter`, lazy-loaded routes) |
| Server state | TanStack Query (`@tanstack/react-query`) |
| Styling | Tailwind CSS 3 + `tailwindcss-animate`, CSS variables for theming |
| UI components | shadcn/ui (Radix UI primitives) in `src/components/ui` |
| Forms & validation | `react-hook-form` + `zod` |
| Icons | `lucide-react` |
| Notifications | `sonner` + the shadcn toast |
| Unit tests | Vitest + Testing Library (jsdom) |
| E2E tests | Playwright |

## Getting started

```bash
npm install
npm run dev
```

The dev server runs on **http://localhost:8080** (see `vite.config.ts`). It talks to the backend defined by `VITE_API_URL` (see below).

To inspect a production-equivalent build locally (minified + bundled — this is what you should benchmark, not the dev server):

```bash
npm run build
npm run preview
```

## Environment variables

Vite only exposes variables prefixed with `VITE_`. Configure them in a `.env` file at the project root (already git-ignored) or in the hosting provider's environment.

`VITE_API_URL` is **required** — there is no fallback. The app throws on startup if it is missing, so you must set it before running or building the portal.

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `VITE_API_URL` | **Yes** | — | Base URL of the TooDoo backend API. The app fails fast if this is unset. |
| `VITE_PORTAL_URL` | No | `window.location.origin` | The portal's own public URL. Used to build password-reset links (`buildPasswordResetUrl`). Falls back to the current origin at runtime. |

Example `.env` (point it at the backend for your target environment):

```bash
VITE_API_URL=https://your-backend-host.example.com
```

## Scripts

| Script | Command | Description |
| --- | --- | --- |
| `npm run dev` | `vite` | Start the dev server on port 8080 with HMR. |
| `npm run build` | `vite build` | Production build to `dist/` (minified, code-split). |
| `npm run build:dev` | `vite build --mode development` | Build using development mode/env. |
| `npm run preview` | `vite preview` | Serve the built `dist/` locally to test the production output. |
| `npm run lint` | `eslint .` | Lint the codebase. |
| `npm run test` | `vitest run` | Run unit tests once. |
| `npm run test:watch` | `vitest` | Run unit tests in watch mode. |

## Project structure

```
src/
  App.tsx            Router, providers (QueryClient, Tooltip, Toasters, CookieConsent), route table
  main.tsx           App entry point
  index.css          Tailwind layers, theme CSS variables, self-hosted @font-face, keyframes
  components/        Feature components (sidebars, dialogs, cards, badges, ...)
    BusinessImportBadges.tsx   Origin badges for imported companies
    ImportedBusinessBanner.tsx Unclaimed-import warning on the manager dashboard
    CompanyDetailsDialog.tsx   Read-only company details (supports edit link into AdminCompanyEdit)
    ui/              shadcn/ui primitives (button, dialog, select, table, ...)
  content/           Static content (e.g. legal.ts — privacy/terms/cookie copy)
  hooks/             Custom hooks (useRealtime, useMonochrome, use-mobile, use-toast, ...)
  lib/               API client and utilities
    api.ts           Typed fetch wrapper, auth-token storage, all endpoint functions & DTO types
    businessImport.ts  Labels/helpers for imported businesses (Maps links, import metadata)
    adminAccess.ts   Admin gating helpers
    adminPendingCounts.ts  Sidebar badges for Väntande / Importerade / Ägarskap
    monochrome.ts    Light/monochrome theme application
    ...
  pages/             Route-level components (Landingpage, LoggIn, Dashboard, Company*/Admin*, ...)
    AdminImportedBusinesses.tsx  Admin queue for pending SCB imports (`/admin/imported`)
    AdminCompanyNew.tsx          Admin create company (`/companies/new`) — approved immediately
    AdminClaimRequests.tsx       Admin queue for imported-business ownership claims
    AdminCompanyEdit.tsx         Edit company details, gallery images, offers, events
    Pending.tsx                  Self-registered pending applications only
  test/              Vitest + Playwright tests
public/              Static assets served as-is
  fonts/             Self-hosted Inter (inter-latin.woff2)
  mockups/           Landing-page phone mockup images (webp)
  Icon.jpg           Full-size icon used for favicon / og:image
  icon-96.webp       Small optimized logo used in-app
  robots.txt
```

## Routing & roles

Routes are declared in `src/App.tsx`. All routes except the landing page are lazy-loaded; the landing page is imported statically for a faster first paint. Protected routes are wrapped in `ProtectedRoute` with an allowed-roles list and rendered inside `AdminLayout`.

- **Public**: `/` (landing), `/login`, `/reset-password`, `/registration`, `/manager-registration`, `/manager/onboard`, `/invite/manager`, `/worker/onboard`, `/invite/worker`
- **Admin** (`ADMIN`): `/admin`, `/admin/logs`, `/admin/invoices`, `/admin/quality-control`, `/admin/claim-requests`, `/admin/imported`, `/companies`, `/companies/new`, `/companies/:businessId/edit`, `/companies/:businessId/offers/new`, `/companies/:businessId/events/new`, `/pending`, `/category/:name`
- **Manager** (`MANAGER`): `/company`, `/company/offers`, `/company/offers/new`, `/company/events`, `/company/events/new`, `/company/verification`, `/company/invoices`, `/company/account`, `/company/image-request`, `/company/support`, `/company/workers/new`

Log in via `/login`, which calls `POST /user/login/portal` on the backend (admin and manager accounts only).

## Authentication

Auth is JWT-based and stored in the browser (see `src/lib/api.ts`):

- `localStorage`: `toodoo_jwt` (token), `toodoo_user_email`, `toodoo_user_role`, `toodoo_business_id`
- `sessionStorage`: invite tokens for manager/worker onboarding

Authenticated requests attach `Authorization: Bearer <token>`. On logout or invalid/expired tokens, call `clearAuthStorage()` to purge all auth state. Non-admin users must resolve their `businessId` from the API (`resolveBusinessId`) rather than trusting a stale local value.

## API layer

`src/lib/api.ts` is the single source of truth for backend communication:

- `apiRequest` / `apiRequestFormData` — typed fetch wrappers that set headers, attach auth, parse JSON, and normalize errors.
- `ApiError` — error type carrying `details` (validation field errors) and `reason` codes; messages are suffixed with `[status method path]` for actionable UI errors.
- `resolveImageUrl` — resolves relative backend image paths against `VITE_API_URL` (passes through absolute/`data:`/`blob:` URLs).
- Endpoint functions and DTO types for users, businesses (including `listBusinesses(..., source?)` for admin queues), orders/offers, business events, order presets, invoices, images, categories, logs, claims/redemptions, SCB company/workplace lookups, and **import ownership claims** (`lookupClaimableImport`, `submitBusinessClaimRequest`, `listBusinessClaimRequests`, `reviewBusinessClaimRequest`).

## Feature areas

### Business registration & imported ownership claims

Public registration at `/registration` uses SCB workplace lookup (`GET /scb/workplaces`) to pre-fill company details.

When the selected workplace (`cfarNr`) already exists as an **approved** import in TooDoo:

1. The portal calls `GET /business/import-lookup?cfarNr=...`.
2. If claimable, the user submits an **ownership application** via `POST /business/:id/claim` (no password on this path).
3. A success dialog explains that an admin must review the request before access is granted.
4. If a `PENDING` request already exists, the form is disabled to prevent duplicate applications.

When the CFAR matches a pending (not yet approved) import, registration shows that the listing is awaiting admin review and is not claimable yet.

When no import exists, the flow continues as before: submit `POST /business` (`PENDING`) and wait for admin approval at `/pending`.

After **claim approval**, the backend sends the standard manager invite email. The applicant completes setup at `/invite/manager` (same path as self-registered businesses approved from `/pending`).

### Admin company management

From **Företag** (`/companies`), admins can:

- **Create** a company at `/companies/new` — SCB org.nr lookup (same as public registration), then fill details; status is **APPROVED** immediately; optional profile image (upload or URL) is set as primary; `orgNr`/`cfarNr` are stored when selected from SCB
- View company details with **import badges** (imported vs self-registered, claimed vs unclaimed)
- Filter the list by origin (`imported` / `self-registered`) and claim state (`unclaimed` imports)
- Open **import metadata** in the company details dialog (`orgNr`, `cfarNr`, Maps link)
- **Edit** a company at `/companies/:businessId/edit`
  - **Uppgifter** — update name, contact info, address, description, categories (email/phone optional for imports)
  - **Bilder** — upload or link images directly to the company gallery, set profile image, remove uploaded images (first upload becomes primary when none is set)
  - **Erbjudanden** — list, create (`/companies/:businessId/offers/new`), and delete offers
  - **Event** — list, create (`/companies/:businessId/events/new`), and delete events
- Invite a manager (when none is assigned)
- Delete a company

Pending **self-registrations** are reviewed at **Väntande** (`/pending`) — `source = SELF_REGISTERED` only (approve/reject + optional manager invite).

Pending **SCB imports** are reviewed at **Importerade** (`/admin/imported`) — `status = PENDING` and `source = IMPORTED`:

- View details, **edit** info/images (`/companies/:id/edit?from=imported`), then **approve** (becomes live in the app, no manager invite) or **reject**
- Search/filter by name, city, category, org.nr, CFAR, SNI

**Imported ownership claims** are reviewed at **Ägarskap** (`/admin/claim-requests`): approve applies the applicant's proposed contact/profile fields, marks the business claimed, and triggers the manager invite email; reject leaves the import unclaimed. The admin sidebar shows pending-count badges for Väntande, Importerade, and Ägarskap.

Admins also have logs (`/admin/logs`), invoices (`/admin/invoices`), and quality control (`/admin/quality-control`).

### Manager company portal

Managers manage their own linked business under `/company`:

- Dashboard (shows an **unclaimed import banner** when the business is imported but not yet claimed — offers/events stay blocked until claim approval)
- Offers, events, verification, invoices, account settings, worker creation, and image requests (submitted for admin review)

Creating offers on an unclaimed import shows a friendly error from the backend claim guard.

## Testing

- **Unit tests** run on Vitest with Testing Library in a jsdom environment. Test files live in `src/test` (see `vitest.config.ts`).

  ```bash
  npm run test        # single run
  npm run test:watch  # watch mode
  ```

- **End-to-end tests** use Playwright (`playwright.config.ts`, `testDir: ./src/test`, `baseURL: http://localhost:8080`). Start the dev server first, then run Playwright:

  ```bash
  npm run dev
  npx playwright test
  ```

## Performance

The public landing page is tuned for Lighthouse. Keep these conventions when editing it:

- **Benchmark the production build, never `npm run dev`.** The dev server ships unminified, unbundled modules, so its Lighthouse score is meaningless — it reports large "Minify JavaScript" / "Reduce unused JavaScript" savings that do not exist in production. Test `npm run preview` or the deployed site instead.
- **Self-hosted fonts.** Inter is served from `public/fonts/inter-latin.woff2` (single variable file, latin subset — covers Swedish å/ä/ö) via an `@font-face` in `src/index.css` and preloaded in `index.html`. Do **not** re-introduce the render-blocking Google Fonts `<link>`.
- **Local, optimized images.** Landing-page mockups live in `public/mockups/*.webp`; the small in-app logo is `public/icon-96.webp` (the larger `public/Icon.jpg` is kept only for the favicon / `og:image`). Give `<img>` tags explicit `width`/`height` to avoid layout shift.
- **Eager landing page.** `LandingPage` is imported statically in `src/App.tsx` (all other routes stay lazy-loaded) so `/` renders without an extra JS round-trip.

Reference scores after these changes (deployed build): **Desktop ~99**, **Mobile ~92**.

## Deployment

The portal is a static single-page app. It builds to `dist/` and is served by a static host (currently Render at `toodoo-portal-1.onrender.com`), which serves the built assets minified and Brotli-compressed.

SPA routing requires all unknown paths to fall back to `index.html` — see `vercel.json`:

```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

Set `VITE_API_URL` (and optionally `VITE_PORTAL_URL`) in the host's environment so the build points at the correct backend.

> Tip: hashed files under `/assets/*` and the self-hosted font are immutable and can safely use a long `Cache-Control: max-age=31536000, immutable` header for faster repeat visits (configured at the host level).

## Related docs

- Backend API details (auth rules, `businessId` for admin create endpoints, image gallery routes, import/claim endpoints, CLI import pipeline, personalized feeds): [TooDoo-Backend/README.md](../TooDoo-Backend/README.md)
- Bulk import revamp (SCB → `PENDING` → admin review; no Google in pipeline): [TooDoo-Backend/docs/bulk-import-revamp.md](../TooDoo-Backend/docs/bulk-import-revamp.md)
- Portal import-audit UX: [docs/bulk-import-revamp.md](./docs/bulk-import-revamp.md)
- Older enrich/cleanup design notes: [TooDoo-Backend/docs/business-bulk-import-implementation.md](../TooDoo-Backend/docs/business-bulk-import-implementation.md)
