# NOTES - ShopFlow

> Engineering notes for the Full-Stack Developer Assessment. Covers the agent
> workflow, design workflow, assumptions (including the open-ended requirement),
> verification, and trade-offs.

---

## 1. Stack & why

| Layer         | Choice                                                             | Reason                                                                                                                                                                                    |
| ------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend       | **NestJS 11** (TypeScript)                                         | Opinionated module/DI structure keeps a multi-feature API coherent rather than stitched-together; guards/interceptors/pipes give clean cross-cutting auth, validation and error handling. |
| Database      | **MongoDB + Mongoose**                                             | Product/order/cart documents are naturally document-shaped; order items are snapshotted inline, so a document store fits without join gymnastics.                                         |
| Auth          | **JWT in httpOnly cookie** (Bearer still accepted for API tooling) | Global guard verifies the same JWT, but the browser session is not readable from JS; the Next same-origin `/api` rewrite keeps the cookie same-site.                                      |
| Frontend      | **Next.js 16 (App Router) + React 19**                             | Route grouping splits `(storefront)` and `admin` cleanly; server/client component split for read-heavy catalog pages.                                                                     |
| Data fetching | **React Query**                                                    | Cache + invalidation for cart/orders without hand-rolled state.                                                                                                                           |
| Styling       | **Tailwind v4 + a CSS design-token layer**                         | Tokens (`styles/tokens.css`) give one source of truth for color/radius/shadow so storefront and admin stay visually consistent.                                                           |

Money is stored as **integer cents** throughout (DB, API, totals) and only formatted to currency at the UI edge - avoids floating-point drift on prices and order totals.

---

## 2. Agent workflow

**Tool:** Claude Code (agent-driven). Work was scoped in vertical slices that each
go end-to-end (schema -> service -> controller -> API client -> UI) rather than
building all of one layer first, so every increment was runnable and reviewable.

**How the agent was scoped & steered**

- Skimmed the whole spec first, sketched the data model (User, Category, Product,
  Cart, Order) and the endpoint list, then drove the build in the checklist order:
  auth -> catalog read paths -> cart -> checkout/orders -> admin -> recommendations -> dashboard.
- Each task was given to the agent as a narrow, verifiable unit ("add server-side
  stock validation + atomic stock decrement with rollback to checkout", not
  "build checkout").
- **Context files** keep the agent on-rails:
  - `frontend/AGENTS.md` (+ `frontend/CLAUDE.md` which `@`-imports it) pins a hard
    rule: _Next.js 16 has breaking changes vs. training data - read the bundled
    docs in `node_modules/next/dist/docs/` before writing code._ This was added
    after the agent repeatedly reached for outdated App-Router/`next.config` APIs.
  - `.claude/` (skills + subagents) encodes the project's repeated review and
    verification routines so they're invoked consistently - see section 6.

**Reusable prompts / routines** were promoted into `.claude/skills/` (e.g. an
end-to-end smoke check and a security/data-integrity review) so the same
verification ran after each slice instead of being re-typed ad hoc.

---

## 3. Where the agent helped - and where it failed

**Helped**

- Boilerplate-heavy, pattern-following work: Nest modules/DTOs/guards, React Query
  hooks, the seed script, and the design-token-driven component library came out
  fast and consistent once the conventions were established.
- Larger features landed quickly once scoped tightly: the guest cart (4h
  sessionStorage + merge-on-login), the Stripe-with-mock-fallback payment path,
  and the premium design pass were all one-pass-then-review.

**Failed / needed correction - actual moments from this build, with how I caught them:**

- **DI miss that tests didn't catch.** After `OrdersService` gained a
  `PaymentsService` dependency, the unit tests still passed (they inject a mock),
  but the app **crashed on boot** with `UnknownDependenciesException` because
  `OrdersModule` didn't import `PaymentsModule`. Green tests are not a running app -
  caught only by actually starting the server. Fix: import the module
  (commit `f272740`). Lesson: run the app, don't trust the unit suite alone.
- **Cart stock edge case (boundary bug).** `addItem` validated only the
  _incremental_ quantity against stock, so repeated adds could stack a line above
  available stock. Happy path passed; the boundary was wrong. Caught by reading
  the diff and reasoning about cumulative state; fixed to validate the **resulting**
  line quantity + added `cart.service.spec.ts`.
- **Predictable input -> 500.** `GET /products?category=<garbage>` reached
  `new Types.ObjectId()` and threw a BSONError surfaced as a 500. Caught in an
  adversarial self-review pass (not the happy-path testing). Fixed with
  `@IsMongoId()` on the query DTO -> 400, plus an e2e test.
- **Checkout crash window (honest residual).** The manual stock rollback + refund
  covers *caught* errors, but would not run if the Node process were killed between
  the stock decrement and order creation. Surfaced by the adversarial review
  question. Hardened as far as the dev deployment allows (validate stock first,
  verify payment before any stock changes, roll back stock + refund on failure);
  the complete fix is a MongoDB multi-document **transaction**, which requires a
  replica set (the local dev Mongo is standalone) — documented as a follow-up in §8.
- **`setState` during render.** The checkout page called `router.replace('/cart')`
  in the render body, tripping React's "cannot update a component while rendering"
  warning. Caught from the browser console; moved the redirect into `useEffect`.
- **A secret nearly committed.** A real Stripe `sk_test_...` key got pasted into the
  git-tracked `.env.example` (and it would not even work there - the app reads
  `.env`). Caught before commit; moved to the gitignored `.env` and blanked the
  example. Reinforced the "secrets only in `.env`" rule.
- **Config mismatch debugging.** "Backend not reachable" and a Stripe "Missing
  payment confirmation" both turned out to be _configuration_ (wrong port; backend
  keyed while frontend was not), not code - diagnosed by curling the API directly
  and checking which port answered rather than guessing.

**How these were caught:** reading the diff rather than the agent's summary,
**running the app** through the real flow, an explicit adversarial review pass,
and unit/e2e tests around money/stock/auth/state.

---

## 4. Supervision & verification

- **Tests** target the logic most worth protecting (quality over quantity):
  - `orders.service.spec.ts` - empty cart, **409** insufficient stock, **rollback on
    a mid-checkout race** (conditional `$inc` guard), server-computed totals, payment
    verified with the server total, **restock + refund when order creation fails
    after payment**, and cart cleared only after the order persists.
  - `cart.service.spec.ts` - cumulative-stock edge cases (the boundary bug above).
  - `auth.service.spec.ts` - signup/login, hashing, invalid-credential paths.
  - `recommendations.service.spec.ts` - affinity vs. fallback behaviour.
  - `test/app.e2e-spec.ts` - against in-memory Mongo: auth, dup-email 409, admin
    403 for a customer, **malformed category -> 400**, and **one customer cannot read
    another's order** (404 for B, 200 for the owner).
  - Frontend (Vitest, `cd frontend && npm test`): guest-cart cumulative-stock guard
    + persistence, `cartTotal`, and `formatCurrency` (cents→display).
  - Run: `cd backend && npm test` (21) + `npm run test:e2e` (11); `cd frontend &&
    npm test` (6) are the verification gates.
- **Type safety as a gate:** `tsc --noEmit` should be clean on both backend and frontend;
  `next build` should succeed.
- **Manual flow checks:** signup -> browse/filter/sort/paginate -> add to cart ->
  checkout (mock pay) -> order confirmation -> order history; admin: product CRUD ->
  order status transitions -> dashboard.
- **Authorization probed negatively:** confirmed a customer token is rejected by
  every `admin/*` endpoint (global `RolesGuard` + `@Roles(Role.ADMIN)`), and that
  users can only read their own cart/orders (queries are always scoped by `userId`).

---

## 5. Design workflow

- The UI is **self-directed via design tooling**, not a dropped-in template. The
  visual system is captured as **design tokens** in `frontend/styles/tokens.css`
  (a blue-led primary ramp, neutral scale, semantic colours, radius/shadow scale,
  Inter type) and applied through a small **in-house component kit**
  (`components/ui/*`: Button, Card, Input, Select, Modal, Badge, Pagination, Toast).
- Headless primitives + `lucide-react` icons are used as **building blocks**; the
  layout, composition and visual language (hero, trust cards, product grid, admin
  sidebar/dashboard) were generated and iterated, then hand-tuned for consistency.
- Custom imagery lives in `frontend/public/shopflow-assets/`.
- Storefront and admin deliberately share the same tokens/components so the two
  surfaces feel like one product.
- Design iteration happened through **Claude Code as the design/code agent**, not a
  separate Figma export or UI template. The look went through three review loops:
  base functional UI, premium storefront polish, then admin/storefront consistency
  and motion/accessibility cleanup.

---

## 6. `.claude/` - project agent config

To make the agentic workflow repeatable and auditable, the repo ships a
`.claude/` directory:

- **`skills/`** - reusable, invocable routines the agent should run rather than
  improvise: a full-stack **smoke test** of the critical flow, and a
  **security & data-integrity review** checklist (auth enforced, authorization
  checked, money/stock/state correct, no secrets/stack traces leaked).
- **`agents/`** - focused subagents (e.g. a backend reviewer and a frontend
  reviewer) with tight tool scopes, used to review diffs from an independent angle.
- **`CLAUDE.md`** - project-level context: architecture map, conventions
  (cents-as-integers, error-handling shape, guard model) and "definition of done".

---

## 7. Assumptions

- **Open-ended requirement - "product suggestions relevant to them":** interpreted
  as **category-affinity recommendations**. For a logged-in user we look at their
  recent orders, rank the categories they buy from, and surface in-stock products
  in those categories that they _have not_ already ordered. If the user is anonymous
  or has too little history (fewer than 4 affinity hits), we fall back to
  **best-sellers** (most units sold across all orders), and finally to newest
  in-stock products if there are no orders yet. Rationale: it is genuinely
  personalised when we have signal, degrades gracefully when we do not, needs no
  extra ML infra, and reuses data we already store. Implementation:
  `backend/src/recommendations/`. In addition, the **product detail page** shows a
  content-based **"related products"** baseline (same category, in stock, newest
  first - `GET /products/:id/related`): cheap, deterministic, and free of any
  cold-start problem.
- **Payments - Stripe test mode with a mock fallback.** When `STRIPE_SECRET_KEY` /
  `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` are set, checkout uses real Stripe **test-mode
  PaymentIntents**: the amount is computed server-side from the cart
  (`POST /payments/intent`), the card is collected via Stripe **Elements**, and
  `checkout` verifies server-side that the PaymentIntent **succeeded and its amount +
  owner match** before creating the order. With no keys it falls back to a mock
  (`paymentRef = mock_<ts>_<uid>`) so the app runs out-of-the-box. Test card:
  `4242 4242 4242 4242`. Payment is verified **before any stock is decremented**,
  so a failed payment moves no stock and creates no order.
- **Product images are URLs**, not uploads - simpler, no storage/CDN dependency for
  an assessment; admins paste an image URL. Documented as a deliberate trade-off.
- **Order-status lifecycle** is enforced as a state machine
  (`pending -> processing -> shipped -> delivered`, with a `cancelled` path); illegal
  transitions are rejected server-side.
- **Single currency**, no tax/shipping math - totals are sum(price \* qty).
- **Auth session storage:** login/signup set the JWT in an httpOnly `access_token`
  cookie. The browser calls same-origin `/api/*` through the Next rewrite, so API
  requests carry the cookie automatically. Bearer tokens are still accepted for
  Swagger/e2e/API tooling, but the SPA no longer stores the JWT in `localStorage`.
- **Cart is server-persisted per user** (one cart document, `userId` unique), so a
  returning logged-in user sees their cart across sessions/devices.
- **Concurrency without a transaction:** overselling is prevented with a
  conditional atomic update (`updateOne({_id, stockQuantity:{$gte:qty}}, {$inc:-qty})`
  + matched-count check) and a manual rollback + refund on failure — a spec-accepted
  method that works on standalone Mongo. A true multi-document transaction (which
  needs a replica set) is the production upgrade — see §8.

---

## 8. Trade-offs, scope & what I'd do with more time

**Built fully, end-to-end:** auth (signup/login/JWT cookie, roles); catalog with
search/category/price filter/sort/pagination; product detail; server-persisted
cart; checkout with mock/Stripe-test payment, server-side totals, atomic
conditional stock decrement + order creation with rollback + refund on failure;
order confirmation & history;
admin product CRUD; admin order management with a status state-machine; analytics
dashboard (sales, orders-by-status chart, top products); category-affinity
recommendations; seed script; tests; validation, error handling, role-based access,
indexes.

**Mocked / simplified (deliberate):**

- Stripe runs in **test mode**; with no keys it falls back to a mock. Checkout verifies
  payment before any stock changes, and on a caught post-payment failure it rolls back
  stock and refunds. If the Node process is killed mid-checkout (after a real charge,
  before the rollback runs), that residual window needs a MongoDB transaction (replica
  set) plus Stripe webhook/reconciliation — noted below.
- Image-by-URL instead of file upload.

**With more time:**

- Run checkout inside a **MongoDB multi-document transaction** (Atlas/replica set)
  so stock decrement + order creation + cart clear commit atomically and the
  hard-crash window closes.
- Add Stripe webhooks/idempotency + manual-capture flow so payment/order recovery
  survives process death.
- Add refresh-token rotation and shorter access-token lifetime.
- Upgrade recommendations to co-purchase ("customers who bought X also bought Y")
  or content similarity.
- Add request logging/observability and frontend component tests (Playwright happy-path).
- Image uploads to object storage with signed URLs.

---

## 9. Run it

See [`README.md`](./README.md). TL;DR:

```bash
# backend
cd backend && npm install && cp .env.example .env   # set MONGO_URI / JWT_SECRET
npm run seed && npm run start:dev                    # API -> http://localhost:4001/api

# frontend
cd frontend && npm install && cp .env.local.example .env.local
npm run dev                                          # -> http://localhost:3000
```

Seeded logins: `admin@shop.com / Admin@123`, `customer@shop.com / Customer@123`,
`jane@shop.com / Jane@123`.
