---
name: security-review
description: Review ShopFlow changes for security and data-integrity issues — auth enforcement, authorization, money/stock/state correctness, secret handling, and input validation. Use before committing changes that touch auth, cart, checkout, orders, admin, or any new endpoint.
---

# ShopFlow security & data-integrity review

Review the current diff against this checklist. For each item, cite the file/line
and state pass/fail; for fails, propose the minimal fix.

## Authentication & authorization
- [ ] New endpoints are protected by default (global `JwtAuthGuard`); only
      genuinely public ones carry `@Public()`, and they don't expose private data.
- [ ] Admin functionality is gated by `@Roles(Role.ADMIN)` on the controller —
      not just hidden in the UI.
- [ ] Every customer query is scoped by `userId`; no endpoint lets a user read or
      mutate another user's cart/orders by guessing an id.
- [ ] JWTs are verified (signature + expiry); `jwtSecret` comes from config/env.

## Data integrity (money / stock / state)
- [ ] Prices and order totals are computed **server-side from DB values**, never
      taken from the client payload.
- [ ] Money is integer cents end-to-end; no float arithmetic on prices.
- [ ] Stock is validated before decrement, decremented atomically
      (`$inc` with a `stockQuantity >= qty` guard), and rolled back on failure.
- [ ] Cart quantities are validated against available stock (including the
      cumulative case: existing line qty + new qty).
- [ ] Order status changes respect `VALID_STATUS_TRANSITIONS`.

## Input validation & error handling
- [ ] Every write endpoint has a `class-validator` DTO; `whitelist` strips unknown
      fields; ids go through `ParseObjectIdPipe`.
- [ ] Errors return sensible HTTP status codes via `HttpExceptionFilter`; no raw
      stack traces or internal messages reach the client.

## Secrets & storage
- [ ] No secrets, tokens, or real credentials committed; `.env` is gitignored and
      `.env.example` carries placeholders only.
- [ ] Passwords are bcrypt-hashed (cost ≥ 12); `passwordHash` is never returned in
      any API response.

Summarise: blockers first, then nits.
