---
name: smoke-test
description: Run a full-stack smoke test of ShopFlow's critical path (build, tests, seed, and the storefront→checkout→admin flow). Use after any backend/frontend change before considering it done, or when asked to verify the app still works end-to-end.
---

# ShopFlow smoke test

Verify the app holds together end-to-end. Run the cheap gates first; only do the
manual flow if code in those paths changed.

## 1. Static gates (always)
```bash
cd backend  && npx tsc --noEmit -p tsconfig.build.json && npm test
cd ../frontend && npx tsc --noEmit && npm run build
```
All must pass. Backend should report all unit tests green.

## 2. Data (if schema/seed changed)
```bash
cd backend && npm run seed
```
Expect: 3 users (1 admin, 2 customers), 5 categories, 20 products, 15 orders,
1 pre-filled cart, no errors.

## 3. Critical flow (if cart/checkout/order/auth/admin code changed)
With backend (`npm run start:dev`) and frontend (`npm run dev`) running:

**Storefront (as `customer@shop.com / Customer@123`)**
1. Browse `/products`; exercise search, category filter, price range, sort, paging.
2. Open a product detail; add to cart with a quantity.
3. Cart shows correct line totals + order total; update qty and remove work.
4. Checkout → mock payment → order confirmation is shown.
5. `/orders` lists the new order; opening it shows items + status.

**Admin (as `admin@shop.com / Admin@123`)**
6. `/admin/products`: create, edit, delete a product.
7. `/admin/orders`: advance an order through pending→processing→shipped→delivered;
   confirm an illegal jump is rejected.
8. `/admin/dashboard`: totals, orders-by-status chart, and top products render.

## 4. Authorization (if guards/roles changed)
- A customer token must get **403** on every `admin/*` endpoint.
- A user must not be able to read another user's cart/orders.

Report exactly what passed, what failed (with output), and what was skipped.
