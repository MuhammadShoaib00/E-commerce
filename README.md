# ShopFlow — Full-Stack E-Commerce

A mini e-commerce platform with a customer storefront and an admin panel, sharing one API.

- **Frontend** — Next.js 16 (App Router, TypeScript, React 19, Tailwind CSS, React Query)
- **Backend** — NestJS 11 (TypeScript) + MongoDB (Mongoose), JWT auth, role-based access

```
shopFlow/
├── frontend/   # Next.js storefront + admin UI
└── backend/    # NestJS REST API (/api)
```

## Prerequisites

- Node.js 20+
- MongoDB - Atlas, or a local replica set (checkout uses MongoDB transactions)

## Getting started

### 1. Backend (API → http://localhost:4001/api)

```bash
cd backend
npm install
cp .env.example .env        # then set MONGO_URI / JWT_SECRET
npm run seed                # seed categories, products, users, orders
npm run start:dev
```

### 2. Frontend (→ http://localhost:3000)

```bash
cd frontend
npm install
cp .env.local.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:4001/api
npm run dev
```

Open **http://localhost:3000**.

## Environment variables

**backend/.env**
| Key | Example | Notes |
|-----|---------|-------|
| `PORT` | `4001` | API port |
| `MONGO_URI` | `mongodb://127.0.0.1:27017/ecommerce?replicaSet=rs0` | Atlas or local replica-set URI; required for checkout transactions |
| `JWT_SECRET` | `long-random-string` | JWT signing secret |
| `FRONTEND_URL` | `http://localhost:3000` | CORS origin |
| `STRIPE_SECRET_KEY` | `sk_test_...` | Optional — enables Stripe test payments; blank = mock |
| `CURRENCY` | `usd` | ISO currency for charges |

**frontend/.env.local**
| Key | Example | Notes |
|-----|---------|-------|
| `NEXT_PUBLIC_API_URL` | `/api` | Same-origin; Next rewrites `/api` → backend (keeps the auth cookie same-site) |
| `BACKEND_ORIGIN` | `http://localhost:4001` | Where the rewrite proxy forwards `/api` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_...` | Optional — pair with `STRIPE_SECRET_KEY`; blank = mock |

## Seeded accounts (after `npm run seed`)

| Role     | Email               | Password       |
| -------- | ------------------- | -------------- |
| Admin    | `admin@shop.com`    | `Admin@123`    |
| Customer | `customer@shop.com` | `Customer@123` |
| Customer | `jane@shop.com`     | `Jane@123`     |

## Notes

- Prices are stored as **integer cents** to avoid floating-point drift.
- Checkout supports **Stripe test mode** (set `STRIPE_SECRET_KEY` + `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`; pay with test card `4242 4242 4242 4242`). With no keys it falls back to a **mock payment**. Either way the payment is verified before stock decrement, order creation, and cart clearing run inside one MongoDB transaction.
- Admin routes/endpoints are restricted to admins (server-enforced via role guards).
