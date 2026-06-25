# TooDoo Portal

Web portal for TooDoo admins and business managers. Built with React, Vite, TypeScript, and shadcn/ui.

## Roles

- **Admin** (`ADMIN`): operational portal at `/admin`, `/companies`, `/pending`, invoices, logs, and quality control
- **Manager** (`MANAGER`): company portal at `/company/*` for a single linked business

Log in via `/login` using `POST /user/login/portal` on the backend (admin and manager accounts only).

## Admin company management

From **Företag** (`/companies`), admins can:

- View company details
- **Edit** a company at `/companies/:businessId/edit`
  - **Uppgifter** — update name, contact info, address, description, categories
  - **Bilder** — upload or link images directly to the company gallery, set profile image, remove uploaded images
  - **Erbjudanden** — list, create (`/companies/:businessId/offers/new`), and delete offers
  - **Event** — list, create (`/companies/:businessId/events/new`), and delete events
- Invite a manager (when none is assigned)
- Delete a company

Pending registrations are reviewed at `/pending` (approve/reject + optional manager invite).

## Manager company portal

Managers manage their own linked business under `/company`:

- Dashboard, offers, events, verification, invoices, account settings, and image requests (submitted for admin review)

## Development

```bash
npm install
npm run dev
```

Set the API base URL in the portal environment (see `src/lib/api.ts` / Vite env) to point at the running TooDoo backend.

## Related docs

Backend API details (auth rules, `businessId` for admin create endpoints, image gallery routes) live in [TooDoo-Backend/README.md](../TooDoo-Backend/README.md).
