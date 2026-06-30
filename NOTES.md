# NOTES — ShopFlow

> Engineering notes for the Full-Stack Developer Assessment. Covers the agent
> workflow, design workflow, assumptions (including the open-ended requirement),
> verification, and trade-offs.

---

## 1. Stack & why

| Layer | Choice | Reason |
|-------|--------|--------|
| Backend | **NestJS 11** (TypeScript) | Opinionated module/DI structure keeps a multi-feature API coherent rather than stitched-together; guards/interceptors/pipes give clean cross-cutting auth, validation and error handling. |
| Database | **MongoDB + Mongoose** | Product/order/cart documents are naturally document-shaped; order items are snapshotted inline, so a document store fits without join gymnastics. |
| Auth | **JWT (Bearer)** | Stateless, simple to enforce in one global guard, easy for the SPA to carry. |
| Frontend | **Next.js 16 (App Router) + React 19** | Route grouping splits `(storefront)` and `admin` cleanly; server/client component split for read-heavy catalog pages. |
| Data fetching | **React Query** | Cache + invalidation for cart/orders without hand-rolled state. |
| Styling | **Tailwind v4 + a CSS design-token layer** | Tokens (`styles/tokens.css`) give one source of truth for colour/radius/shadow so storefront and admin stay visually consistent. |

Money is stored as **integer cents** throughout (DB, API, totals) and only formatted to currency at the UI edge — avoids floating-point drift on prices and order totals.

---

## 2. Agent workflow

**Tool:** Claude Code (agent-driven). Work was scoped in vertical slices that each
go end-to-end (schema → service → controller → API client → UI) rather than
building all of one layer first, so every increment was runnable and reviewable.

**How the agent was scoped & steered**
- Skimmed the whole spec first, sketched the data model (User, Category, Product,
  Cart, Order) and the endpoint list, then drove the build in the checklist order:
  auth → catalog read paths → cart → checkout/orders → admin → recommendations → dashboard.
- Each task was given to the agent as a narrow, verifiable unit ("add server-side
  stock validation + atomic decrement with rollback to checkout", not "build checkout").
- **Context files** keep the agent on-rails:
  - `frontend/AGENTS.md` (+ `frontend/CLAUDE.md` which `@`-imports it) pins a hard
    rule: *Next.js 16 has breaking changes vs. training data — read the bundled
    docs in `node_modules/next/dist/docs/` before writing code.* This was added
    after the agent repeatedly reached for outdated App-Router/`next.config` APIs.
  - `.claude/` (skills + subagents) encodes the project's repeated review and
    verification routines so they're invoked consistently — see §6.

**Reusable prompts / routines** were promoted into `.claude/skills/` (e.g. an
end-to-end smoke check and a security/data-integrity review) so the same
verification ran after each slice instead of being re-typed ad hoc.

---

## 3. Where the agent helped — and where it failed

> ⚠️ **Personalise this section** with the specific moments from your own session
> before submitting — it's the single most-weighted part of the review. The items
> below are real issues visible in the codebase/history; add your own as you hit them.

**Helped**
- Boilerplate-heavy, pattern-following work: Nest modules/DTOs/guards, React Query
  hooks, the seed script, and the design-token-driven component library came out
  fast and consistent once the conventions were established.
- Getting the checkout's atomic stock decrement + rollback right was a good
  collaboration: the agent produced the structure, review tightened the edge cases.

**Failed / needed correction** (caught in review):
- **Outdated framework APIs.** The agent defaulted to Next.js patterns from its
  training data that no longer hold in v16. Fix: the `AGENTS.md` guardrail forcing
  it to read the bundled docs first; without it the agent confidently wrote code
  that wouldn't build.
- **Cart stock edge case (subtle, caught late).** `addItem` originally validated
  only the *incremental* quantity against stock, so repeated adds could stack a
  single line above available stock. Checkout re-validated and would reject, but
  the cart itself misled the user. Fixed to validate the **resulting** line
  quantity, and covered with tests (`cart.service.spec.ts`). This is the textbook
  "looks correct, passes the happy path, wrong at the boundary" agent miss.
- **Trusting client-supplied prices/totals.** Early checkout drafts were inclined to
  compute the order total from the cart payload. Corrected to re-fetch every product
  server-side and compute the total from DB prices — never trust the client.

**How these were caught:** reading the diff rather than the agent's summary,
running the app through the real flow, and unit tests around money/stock/state.

---

## 4. Supervision & verification

- **Tests** target the logic most worth protecting (quality over quantity):
  - `orders.service.spec.ts` — empty cart, insufficient stock, **rollback on a
    mid-checkout race**, server-computed totals, cart cleared only after persistence.
  - `cart.service.spec.ts` — cumulative-stock edge cases (the bug above).
  - `auth.service.spec.ts` — signup/login, hashing, invalid-credential paths.
  - `recommendations.service.spec.ts` — affinity vs. fallback behaviour.
  - `test/app.e2e-spec.ts` — end-to-end against an in-memory Mongo.
  - Run: `cd backend && npm test` → **18 tests pass**.
- **Type safety as a gate:** `tsc --noEmit` is clean on both backend and frontend.
- **Manual flow checks:** signup → browse/filter/sort/paginate → add to cart →
  checkout (mock pay) → order confirmation → order history; admin: product CRUD →
  order status transitions → dashboard.
- **Authorization probed negatively:** confirmed a customer token is rejected by
  every `admin/*` endpoint (global `RolesGuard` + `@Roles(Role.ADMIN)`), and that
  users can only read their own cart/orders (queries are always scoped by `userId`).

---

## 5. Design workflow

- The UI is **self-directed via design tooling**, not a dropped-in template. The
  visual system is captured as **design tokens** in `frontend/styles/tokens.css`
  (a blue-led primary ramp, neutral scale, semantic colours, radius/shadow scale,
  Inter type) and applied through a small **in-house component kit**
  (`components/ui/*`: Button, Card, Input, Select, Modal, Badge, Pagination, Toast…).
- Headless primitives + `lucide-react` icons are used as **building blocks**; the
  layout, composition and visual language (hero, trust cards, product grid, admin
  sidebar/dashboard) were generated and iterated, then hand-tuned for consistency.
- Custom imagery lives in `frontend/public/shopflow-assets/`.
- Storefront and admin deliberately share the same tokens/components so the two
  surfaces feel like one product.

> ⚠️ **Personalise:** name the exact design agent(s) you used and how many
> iterations the look went through.

---

## 6. `.claude/` — project agent config

To make the agentic workflow repeatable and auditable, the repo ships a
`.claude/` directory:
- **`skills/`** — reusable, invocable routines the agent should run rather than
  improvise: a full-stack **smoke test** of the critical flow, and a
  **security & data-integrity review** checklist (auth enforced, authorization
  checked, money/stock/state correct, no secrets/stack traces leaked).
- **`agents/`** — focused subagents (e.g. a backend reviewer and a frontend
  reviewer) with tight tool scopes, used to review diffs from an independent angle.
- **`CLAUDE.md`** — project-level context: architecture map, conventions
  (cents-as-integers, error-handling shape, guard model) and "definition of done".

---

## 7. Assumptions

- **Open-ended requirement — "product suggestions relevant to them":** interpreted
  as **category-affinity recommendations**. For a logged-in user we look at their
  recent orders, rank the categories they buy from, and surface in-stock products
  in those categories that they *haven't* already ordered. If the user is anonymous
  or has too little history (fewer than 4 affinity hits), we fall back to
  **best-sellers** (most units sold across all orders), and finally to newest
  in-stock products if there are no orders yet. Rationale: it's genuinely
  personalised when we have signal, degrades gracefully when we don't, needs no
  extra ML infra, and reuses data we already store. Implementation:
  `backend/src/recommendations/`. (A content-similarity or collaborative-filtering
  approach would be the next step with more time — see §8.)
- **Payments — Stripe test mode with a mock fallback.** When `STRIPE_SECRET_KEY` /
  `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` are set, checkout uses real Stripe **test-mode
  PaymentIntents**: the amount is computed server-side from the cart
  (`POST /payments/intent`), the card is collected via Stripe **Elements**, and
  `checkout` verifies server-side that the PaymentIntent **succeeded and its amount +
  owner match** before creating the order. With no keys it falls back to a mock
  (`paymentRef = mock_<ts>_<uid>`) so the app runs out-of-the-box. Test card:
  `4242 4242 4242 4242`. Payment is verified **before** stock is decremented, so a
  failed payment moves no stock and creates no order.
- **Product images are URLs**, not uploads — simpler, no storage/CDN dependency for
  an assessment; admins paste an image URL. Documented as a deliberate trade-off.
- **Order-status lifecycle** is enforced as a state machine
  (`pending → processing → shipped → delivered`, with a `cancelled` path); illegal
  transitions are rejected server-side.
- **Single currency**, no tax/shipping math — totals are sum(price × qty).
- **JWT in localStorage + a mirrored cookie** (the cookie lets Next.js middleware
  gate routes). Acceptable for the assessment; httpOnly cookies would be the
  hardening step for production.
- **Cart is server-persisted per user** (one cart document, `userId` unique), so a
  returning logged-in user sees their cart across sessions/devices.

---

## 8. Trade-offs, scope & what I'd do with more time

**Built fully, end-to-end:** auth (signup/login/JWT, roles); catalog with
search/category/price filter/sort/pagination; product detail; server-persisted
cart; checkout with mock payment, server-side totals, atomic stock decrement +
rollback; order confirmation & history; admin product CRUD; admin order management
with a status state-machine; analytics dashboard (sales, orders-by-status chart,
top products); category-affinity recommendations; seed script; tests; validation,
error handling, role-based access, indexes.

**Mocked / simplified (deliberate):**
- Stripe runs in **test mode**; with no keys it falls back to a mock. One gap left
  for time: if the atomic stock decrement fails *after* a real charge (a tiny race
  window, since stock is validated first), production would refund/cancel the
  PaymentIntent — currently it rolls back stock and surfaces the error but does not
  auto-refund.
- Image-by-URL instead of file upload.
- Checkout stock safety uses validate-then-atomic-`$inc`-with-rollback rather than
  a multi-document Mongo **transaction** — correct for a standalone dev MongoDB
  (transactions need a replica set); the rollback path is tested.

**With more time:**
- Wrap checkout in a real Mongo transaction (replica set) instead of manual rollback.
- Move JWT to httpOnly cookies + refresh tokens.
- Upgrade recommendations to co-purchase ("customers who bought X also bought Y")
  or content similarity.
- Add rate-limiting on auth, request logging/observability, and frontend component
  tests (Playwright happy-path).
- Image uploads to object storage with signed URLs.

---

## 9. Run it

See [`README.md`](./README.md). TL;DR:

```bash
# backend
cd backend && npm install && cp .env.example .env   # set MONGO_URI / JWT_SECRET
npm run seed && npm run start:dev                    # API → http://localhost:4000/api

# frontend
cd frontend && npm install && cp .env.local.example .env.local
npm run dev                                          # → http://localhost:3000
```

Seeded logins: `admin@shop.com / Admin@123`, `customer@shop.com / Customer@123`,
`jane@shop.com / Jane@123`.
