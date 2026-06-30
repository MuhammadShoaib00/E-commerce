# ShopFlow — project context for Claude Code

Mini e-commerce platform: a customer **storefront** and an **admin panel** sharing
one API. Monorepo with two apps.

```
shopFlow/
├── backend/    # NestJS 11 + MongoDB (Mongoose), JWT auth, served under /api
└── frontend/   # Next.js 16 (App Router, React 19) + React Query + Tailwind v4
```

## Architecture (backend)
- Feature modules: `auth`, `users`, `categories`, `products`, `cart`, `orders`,
  `recommendations`, `admin`, `analytics`.
- **Global guards** (in `app.module.ts`): `JwtAuthGuard` then `RolesGuard`.
  - Routes are protected by default. Mark open routes with `@Public()`.
  - `@Public()` routes still populate `req.user` when a valid token is present
    (recommendations personalise when logged in).
  - Admin-only: decorate the controller with `@Roles(Role.ADMIN)`.
- Cross-cutting: global `ValidationPipe` (whitelist + transform), global
  `HttpExceptionFilter` (never leak stack traces; `{statusCode,message,timestamp,path}`),
  global `TransformInterceptor`, `ParseObjectIdPipe` for `:id` params.

## Conventions (do not break)
- **Money is integer cents** everywhere (DB, API, totals). Format to currency only
  in the UI (`frontend/lib/utils/formatCurrency.ts`).
- **Never trust the client for prices, totals, or stock.** Re-fetch products
  server-side and compute totals from DB values (see `orders.service.ts`).
- **Scope every customer query by `userId`** — a user only ever sees their own
  cart/orders.
- Order status is a **state machine** (`VALID_STATUS_TRANSITIONS`); reject illegal
  transitions server-side.
- Add a DTO with `class-validator` for every write endpoint.
- Add indexes for any new query path (see `*.schema.ts`).

## Frontend
- `app/(storefront)/*` and `app/admin/*` route groups; shared `components/ui/*`
  kit driven by `styles/tokens.css` design tokens. Keep both surfaces visually
  consistent via the tokens — do not introduce ad-hoc colours.
- Data via React Query hooks in `features/*/hooks`; API clients in `lib/api/*`.
- **Next.js 16 has breaking changes vs. training data — read
  `frontend/node_modules/next/dist/docs/` before writing framework code.**
  (See `frontend/AGENTS.md`.)

## Definition of done for a change
1. `cd backend && npm test` passes; `npx tsc --noEmit` clean both apps.
2. New logic that touches money/stock/auth/state has a unit test.
3. Auth + authorization enforced on any new endpoint.
4. No secrets committed; no stack traces leaked to clients.
