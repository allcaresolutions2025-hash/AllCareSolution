# ACHT MART — Direct Selling E-commerce Platform

A production-ready Next.js application for **All Care Herbal Traders / ACHT MART**:
e-commerce storefront for Ayurvedic & herbal products, plus a **2-level affiliate program**
designed to comply with India's *Consumer Protection (Direct Selling) Rules, 2021*.

## What this is — and what it isn't

**This is** a legal, single + two-level referral commission system tied strictly to
real product sales. Affiliates earn:

- **20%** on direct (L1) referral purchases
- **5%** on indirect (L2) referral purchases (their referrals' referrals)
- **Nothing** on signups, recruitment, or anything beyond 2 levels

**This is not** a binary MLM, pyramid scheme, or money-circulation system. There is
deliberately no binary tree, no pair-matching, no daily payouts on enrollment, no
rank-based rewards, no joining fee, and no level-3+ commissions anywhere in this
codebase.

Every payout is tied 1:1 to an `Order` row. If the order is returned or refunded
within the 30-day buyback window, the commission is automatically reversed.

---

## Tech stack

- **Framework**: Next.js 14 (App Router) + TypeScript
- **Styling**: Tailwind CSS + custom green/accent palette
- **Auth**: NextAuth.js (Credentials provider, JWT session)
- **Database**: PostgreSQL via Prisma 6
- **Payments**: Razorpay (server-side order create + webhook signature verification)
- **Email/SMS**: (TODO — bring your own provider; hooks are in place)

## Project structure

```
prisma/
  schema.prisma         # Full data model (Users, Products, Orders, Commissions, Payouts, KYC...)
  seed.ts               # Bootstraps admin + 6 sample products + business settings
scripts/
  release-commissions.ts # Cron script — releases matured commissions after buyback window
src/
  lib/
    db.ts               # Prisma singleton
    auth.ts             # NextAuth config
    admin.ts            # Admin guard helper
    commission.ts       # Commission engine (accrue, release, reverse, TDS)
    referral.ts         # Referral code gen + chain resolution
    razorpay.ts         # Razorpay client + signature verification
    settings.ts         # DB-backed business settings
    money.ts            # Paise<->Rupee helpers
    validation.ts       # Zod schemas for all forms/APIs
  components/           # UI primitives (header, footer, dashboard shell, cart, etc.)
  app/
    page.tsx            # Home
    products/           # Catalog + product detail
    cart/               # Cart
    checkout/           # Checkout + Razorpay integration
    login/, register/   # Auth pages
    account/            # Customer dashboard (orders, addresses, profile)
    affiliate/          # Public info + affiliate dashboard (commissions, referrals, KYC, payouts)
    admin/              # Admin panel (products, orders, users, KYC, payouts, settings)
    legal/              # Terms, Privacy, Buyback, Direct-Selling
    api/                # All API routes
```

---

## Local development

### Prerequisites

- Node.js 20+ (already installed at `~/.local/node/bin/node` from setup)
- PostgreSQL 14+ (locally or hosted, e.g. Neon, Supabase, Railway)

### Setup

```bash
# 1. From the project root
cd /Users/admin/achtmart

# 2. Configure environment
cp .env.example .env
# Edit .env and set DATABASE_URL, NEXTAUTH_SECRET, and Razorpay keys

# 3. Push schema to your DB
npm run db:push

# 4. Seed admin user + sample products
npm run db:seed

# 5. Start dev server
npm run dev
```

Visit http://localhost:3000.

### Default admin login (after seed)

- Email: `admin@achtmart.com`
- Password: `ChangeMe@2026` (override via `SEED_ADMIN_PASSWORD` env)

**Change this password immediately after first login.**

---

## Deploying to Vercel + Neon (recommended)

This is the lowest-friction path and what the project is configured for.

### 1. Create a Postgres database on [Neon](https://neon.tech)

- Sign up (free tier is plenty for getting started)
- Create a new project. Copy the connection string — it looks like:
  `postgresql://user:pwd@ep-xxx.neon.tech/neondb?sslmode=require`

### 2. Get Razorpay API keys

- Sign up at [razorpay.com](https://razorpay.com) (use Test Mode keys first)
- Dashboard → Settings → API Keys → Generate Key
- Copy both the Key ID (starts with `rzp_test_` or `rzp_live_`) and the Secret

### 3. Push schema to Neon

From your local machine, with the Neon `DATABASE_URL` in `.env`:

```bash
npm run db:push      # creates tables
npm run db:seed      # admin + products
```

### 4. Deploy to Vercel

```bash
# Push code to GitHub first
git init && git add . && git commit -m "Initial commit"
gh repo create achtmart --private --source=. --push
# (or push manually to any GitHub repo)

# Then on vercel.com:
#  - Import the GitHub repo
#  - Add the env vars below
#  - Deploy
```

Required Vercel env vars:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Your Neon connection string |
| `NEXTAUTH_URL` | `https://your-vercel-domain.vercel.app` |
| `NEXTAUTH_SECRET` | Run `openssl rand -base64 32` and paste |
| `RAZORPAY_KEY_ID` | From Razorpay dashboard |
| `RAZORPAY_KEY_SECRET` | From Razorpay dashboard |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Same as `RAZORPAY_KEY_ID` |

Optional overrides (defaults shown in `.env.example`):
`COMMISSION_L1_PERCENT`, `COMMISSION_L2_PERCENT`, `BUYBACK_DAYS`,
`TDS_PERCENT`, `TDS_THRESHOLD_INR`, `GST_DEFAULT_PERCENT`, `SHIPPING_COST_INR`.

### 5. Set up the commission-release cron

Commissions move from `PENDING` → `AVAILABLE` automatically after the
30-day buyback window. You need a daily job to actually flip them.

**Vercel Cron** — add to `vercel.json`:
```json
{ "crons": [{ "path": "/api/cron/release-commissions", "schedule": "0 2 * * *" }] }
```

Or for any VPS, run `npm run db:release-commissions` daily via system cron.

---

## Razorpay webhook (recommended but optional)

To handle async events (auto-capture, refunds, payment failures), add a webhook
in your Razorpay dashboard pointing at `https://yourdomain.com/api/webhooks/razorpay`
(to be implemented — scaffold is in `src/lib/razorpay.ts`).

---

## Operations cheat-sheet

| Task | Where |
|---|---|
| Add/edit products | Admin → Products |
| Approve KYC | Admin → KYC Reviews |
| Process payout request | Admin → Payouts → enter UTR after bank transfer |
| Change commission % | Admin → Settings |
| View an order's commissions | Admin → Orders → [order] → "Commissions accrued" section |
| Audit log | Auto-logged in `AuditLog` table — query via Prisma Studio |
| Database GUI | `npm run db:studio` |

---

## Legal compliance notes

This implementation is structured around the following Indian regulatory framework:

1. **Consumer Protection (Direct Selling) Rules, 2021** — Rule 7 (no compensation
   tied to recruitment). Our commissions are 100% tied to actual `Order` rows.
2. **Prize Chits and Money Circulation Schemes (Banning) Act, 1978, Sec 2(c)** —
   we deliberately do not implement a money-circulation scheme. Two referral
   levels, no enrollment-based payouts, no binary tree.
3. **Income-tax Act, 1961, Sec 194H** — TDS at 5% on commission income above
   ₹15,000/year per payee. Implemented in `lib/commission.ts → computeTdsForPayout`.
4. **Sec 60 of CGST Act + Goods and Services Tax Act, 2017** — GST collected
   on the product price; affiliate commission base is the pre-GST line value.
5. **30-day buyback** — required by Rule 8 of the Direct Selling Rules. Enforced
   via the `Order.buybackUntil` field, set automatically on delivery.

**Before going live**, please:

- Consult a CA for your specific GST registration (mandatory above ₹40 lakh turnover for goods)
- Register as a "Direct Selling Entity" with the MCA if applicable
- Get your products' AYUSH/FSSAI licences in order if claiming Ayurvedic / wellness
- Review the affiliate Terms & Conditions in `src/app/legal/terms/page.tsx` with a lawyer

---

## Things to add before launch (recommended)

These are intentionally not built in v1 to keep the codebase focused, but are
common next steps:

- [ ] Email/SMS notifications for order placed/shipped/delivered, KYC approval, payout paid
- [ ] OTP-based phone verification at signup
- [ ] Razorpay webhook handler for auto-refunds and payment retries
- [ ] Shiprocket / Delhivery API integration for tracked shipping label generation
- [ ] PDF invoice generation (GST-compliant)
- [ ] Search and category filters on products page
- [ ] Customer reviews & ratings
- [ ] Forgot-password / reset-password flow
- [ ] Two-factor authentication for admins
- [ ] Sentry / error reporting
- [ ] Rate limiting on auth endpoints (e.g. Upstash Redis)

---

## License

Proprietary — All Care Herbal Traders, Madurai.
