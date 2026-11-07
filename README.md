# EstateStay

Coffee-estate resort in Chikkamagaluru, Karnataka, with **64 rooms, 12 villas (76 keys), and lawns for weddings and offsites**. The MERN foundation includes:
a React (Vite + TypeScript) client, a Node.js (Express + TypeScript) API,
a MongoDB (Mongoose) connection layer, a shared design-system, and a live
health check on both sides.

```
Resort/
├── frontend/             # React 19 + Vite 8 + Tailwind v4 + Framer Motion + Axios
│   └── src/
│       ├── components/   # shared UI, site, layout, motion and admin widgets
│       ├── pages/        # Home/ · Rooms/ · Booking/ · Confirmation/ · Admin/
│       ├── layouts/      # GuestLayout
│       ├── hooks/        # shared React hooks
│       ├── services/     # Axios + typed EstateStay API client
│       ├── context/      # shared booking search state
│       ├── types/        # shared API and domain contracts
│       ├── App.tsx       # providers and app entry
│       └── index.css     # design tokens (@theme: brand/gold/sand, fonts)
├── backend/              # Express 5 + TypeScript + Mongoose (modules at backend root)
│   ├── config/           # env.ts · db.ts
│   ├── controllers/      # health and feature controllers
│   ├── models/           # User, Room, RatePlan, DailyRate, Allotment, Booking, Payment, Enquiry, PromoCode
│   ├── routes/           # authentication, catalogue, bookings, admin and enquiries
│   ├── middleware/       # authentication, validation and error handling
│   ├── services/         # enquiry AI provider and classification
│   ├── utils/            # typed errors, schemas, response envelope
│   ├── seed/              # MongoDB seed data
│   ├── scripts/           # API smoke tests
│   ├── app.ts
│   └── server.ts
└── package.json          # root scripts (parallel dev via concurrently)
```

## Prerequisites

- **Node.js ≥ 20** (tested on 22)
- **npm ≥ 10**
- **MongoDB** — either a local daemon (`mongod`) or a free [Mongo Atlas](https://www.mongodb.com/atlas) cluster.
  The API is *fail-soft*: without Mongo it still boots and reports the
  database as `disconnected` in `GET /api/health`.

## Quick start

```bash
# 1. Install everything (root tooling + backend + frontend)
npm run install:all

# 2. Configure the API
#    Copy backend/.env.example to backend/.env and set MONGO_URI.

# 3. Run BOTH apps in parallel
npm run dev
#   api → http://localhost:5001  (health: /api/health)
#   web → http://localhost:5173
```

Per-app commands:

| Action        | API (`backend/`)             | Client (`frontend/`)        |
| ------------- | -------------------------- | --------------------------- |
| Develop       | `npm run dev:backend`      | `npm run dev:frontend`      |
| Type-check    | `npm run typecheck --prefix backend` | `npm run build --prefix frontend` |
| Build (prod)  | `npm run build --prefix backend` → `dist/` | `npm run build --prefix frontend` → `dist/` |
| Serve build   | `npm start --prefix backend` | `npm run preview --prefix frontend` |

## Environment variables

Copy `backend/.env.example` → `backend/.env` and `frontend/.env.example` → `frontend/.env`
(both already exist with development defaults):

| Variable            | Where    | Purpose                                       |
| ------------------- | -------- | --------------------------------------------- |
| `PORT`              | backend  | API port (default `5001`)                     |
| `NODE_ENV`          | backend  | `development` / `production`                  |
| `MONGO_URI`         | backend  | MongoDB connection string                     |
| `CLIENT_URL`        | backend  | CORS origin(s) of the frontend                |
| `JWT_SECRET`        | backend  | Signing key; set a unique long random value in production |
| `JWT_EXPIRES_IN`    | backend  | Token lifetime (default `7d`) |
| `AI_PROVIDER`       | backend  | `off`, `openai`, or `gemini` |
| `AI_API_KEY`        | backend  | Optional provider key; never expose in frontend |
| `AI_MODEL`          | backend  | Provider model name |
| `SEED_RESERVATIONS_STAFF_EMAIL` / `SEED_RESERVATIONS_STAFF_PASSWORD` | backend | Local seed account credentials; use unique values for demos |
| `VITE_API_BASE_URL` | frontend | Axios base URL (`http://localhost:5001/api`)  |

## Health check

```bash
curl http://localhost:5001/api/health
```

```json
{
  "success": true,
  "message": "EstateStay API is running",
  "data": {
    "status": "ok",
    "service": "estatestay-api",
    "version": "1.0.0",
    "environment": "development",
    "uptimeSeconds": 42,
    "timestamp": "2026-11-03T09:00:00.000Z",
    "database": { "state": "connected", "name": "estatestay" }
  }
}
```

The Home page (`http://localhost:5173`) renders this live via Axios —
a "API online" card with the MongoDB state included.
The API also initializes the MongoDB connection on demand, so serverless
deployments such as Vercel connect before serving database-backed requests.

## Design system

Defined token-first in `frontend/src/index.css` (`@theme`, Tailwind v4):

- **Palette** — Evergreen `brand` (primary), Gilded Sand `gold` (accent),
  Warm Stone `sand` (neutrals), each with 11 steps (50–950).
- **Typography** — *Fraunces* display serif (`font-display`) +
  *Inter* body sans (`font-sans`), loaded via Google Fonts.
- **Components** — `Button` (6 variants × 3 sizes + loading),
  `Input`/`Textarea`/`Select` (label/hint/error), compound `Card`,
  `Badge` (7 variants), `Alert`, `Spinner`, `Container`,
  `SectionHeading`, `Logo`, and a `FadeIn` scroll-reveal motion wrapper.
  All wired with `class-variance-authority` + `tailwind-merge` and
  showcased on the Home page.

## Booking API (Phase 2)

The API includes nine Mongoose models: `User`, `Room`, `RatePlan`, `DailyRate`,
`Allotment`, `Booking`, `Payment`, `Enquiry`, and `PromoCode`. Seed data includes
**64 room units, 12 villas, 2 rate plans, and 365 days** of per-unit pricing and
inventory. `npm run seed --prefix backend` rebuilds the room/rate/inventory seed
collections (do not run against production).
Default room tariffs average ₹9,500 to match the case assumptions. To safely
align an existing untouched demo catalogue without deleting collections, run
`npm run align:demo-rates --prefix backend`; it updates only standard seeded
room prices and daily rates that still match their original defaults.

EstateStay's core inventory is **64 room keys + 12 villa keys = 76 keys**. Guest
search and booking decisions require dated `Allotment` records; catalogue records
and base tariffs alone never make a room sellable. The seeded future allotment is
the explicit website allocation. Reservations Staff can reduce it only to booked/held
capacity; blackouts stop new website sales while preserving existing stays.

Authentication is JWT Bearer-token based; public registration always creates a
`guest`. The other core role is `reservations_staff`; staff operate the management
console, and GM complaint/low-confidence visibility is provided within that same
role. Staff users are seeded, never self-registered. Set `JWT_SECRET`,
`SEED_RESERVATIONS_STAFF_EMAIL`, and `SEED_RESERVATIONS_STAFF_PASSWORD` in
`backend/.env` before deployment. The default local Reservations Staff login is
`admin@estatestay.local` / `EstateStay-Admin-2026!`.

There are no separate required administrator or GM roles: the core role set is
`guest` and `reservations_staff`.
For an existing development database that still stores the old role labels, run
`npm run migrate:roles --prefix backend` once to normalize them.

### Endpoints

| Method | Path | Access | Purpose |
| ------ | ---- | ------ | ------- |
| GET | `/api/health` | Public | API and MongoDB status |
| POST | `/api/auth/register` | Public | Create guest account + JWT |
| POST | `/api/auth/login` | Public | Authenticate + JWT |
| GET | `/api/auth/me` | Guest/Reservations Staff | Current account |
| GET | `/api/rooms` | Public | Paginated rooms/villas (`kind`, `category`, `page`, `limit`) |
| GET | `/api/rooms/:id` | Public | Active room detail |
| GET | `/api/availability` | Public | Search dated inventory and rates |
| GET | `/api/rates?roomId=…&from=YYYY-MM-DD&to=YYYY-MM-DD` | Public | Daily rate plans (up to 90 days) |
| POST | `/api/bookings` | Guest | Claim inventory and create pending booking/payment |
| POST | `/api/bookings/:id/promo` | Owner/Reservations Staff | Apply/remove a promo and recalculate discount, GST and payable total |
| POST | `/api/bookings/:id/test-payment` | Owner/Reservations Staff | Record test outcome: `success`, `failure`, or `pending` |
| GET | `/api/bookings` | Guest/Reservations Staff | Own bookings (staff sees all) |
| GET | `/api/bookings/:id` | Owner/Reservations Staff | Booking detail |
| POST | `/api/bookings/lookup` | Public + verification | Look up by booking reference and matching booking email; returns limited fields |
| POST | `/api/bookings/:id/cancel` | Owner/Reservations Staff | Cancel and release inventory |
| POST | `/api/enquiries` | Public | Save and route enquiry |
| GET | `/api/admin/enquiries?status=…&category=…&source=…&alertGM=true&search=…` | Reservations Staff | Unified inbox and unsorted queue |
| POST | `/api/admin/enquiries/simulate` | Reservations Staff | Simulate website/email/WhatsApp intake |
| POST | `/api/admin/enquiries/:id/classify` | Reservations Staff | Structured category/extraction/priority classification |
| POST | `/api/admin/enquiries/:id/draft-reply` | Reservations Staff | Generate and save a reply draft (never sent) |
| PATCH | `/api/admin/enquiries/:id` | Reservations Staff | Correct category, assign staff/team, update status/GM alert/draft |
| GET | `/api/admin/:kind` | Reservations Staff | List `rooms`, `bookings`, `enquiries`, `payments`, `promos`, `users`, `rateplans` |
| GET | `/api/admin/analytics` | Reservations Staff | Revenue, booking, occupancy metrics and chart series |
| GET | `/api/admin/bookings?status=…&from=…&to=…&search=…` | Reservations Staff | Filtered booking management list |
| GET | `/api/admin/bookings/export.csv?date=YYYY-MM-DD` | Reservations Staff | Daily check-in CSV download |
| POST/PATCH | `/api/admin/rooms[/:id]` | Reservations Staff | Create/update room |
| GET | `/api/admin/rates?from=…&to=…&roomId=…` | Reservations Staff | Daily rate calendar data |
| POST | `/api/admin/rates` | Reservations Staff | Upsert dated rate |
| GET | `/api/admin/allotments?from=…&to=…&roomId=…` | Reservations Staff | Website inventory calendar data |
| POST | `/api/admin/allotments` | Reservations Staff | Upsert dated inventory |
| POST | `/api/admin/blackouts` | Reservations Staff | Close/reopen date ranges for selected/all residences |
| POST | `/api/admin/rateplans` | Reservations Staff | Create rate plan |
| POST | `/api/admin/promocodes` | Reservations Staff | Create promo code |
| PATCH | `/api/admin/promocodes/:id` | Reservations Staff | Update promo fields or active state |
| PATCH | `/api/admin/bookings/:id` | Reservations Staff | Update booking status |
| PATCH | `/api/admin/payments/:id` | Reservations Staff | Record payment status; marking paid confirms booking |

All responses use `{ "success": true, "message": string|null, "data": ... }`;
validation errors return HTTP 422 in the shared error envelope. Guest registration
and website enquiries require affirmative privacy consent; a consent timestamp is
stored for guest accounts and submitted website enquiries.

### Sample requests

```bash
# Find villas for 2 adults over two nights
curl "http://localhost:5001/api/availability?checkIn=2026-12-12&checkOut=2026-12-14&adults=2&children=0&kind=villa"

# Register, then use the returned JWT
curl -X POST http://localhost:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Asha Rao","email":"asha@example.com","password":"a-long-password-123","privacyAccepted":true}'

# Create a reservation (use a room _id from /rooms or /availability)
curl -X POST http://localhost:5001/api/bookings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <guest-token>" \
  -d '{"roomId":"<room-id>","ratePlanCode":"FLEX","checkIn":"2026-12-12","checkOut":"2026-12-14","adults":2,"children":0}'

# Guest self-service lookup requires BOTH the booking reference and booking email
curl -X POST http://localhost:5001/api/bookings/lookup \
  -H "Content-Type: application/json" \
  -d '{"reference":"<booking-reference>","email":"asha@example.com"}'

# Send an event enquiry; structured classifier routes it to Events
curl -X POST http://localhost:5001/api/enquiries \
  -H "Content-Type: application/json" \
  -d '{"name":"Asha Rao","email":"asha@example.com","subject":"Wedding in February 2027","message":"Venue for a wedding in Feb 2027, about 250 guests, 2 nights.","category":"wedding","privacyAccepted":true}'
```

Availability response excerpt:

```json
{
  "success": true,
  "message": null,
  "data": {
    "nights": 2,
    "guests": { "adults": 2, "children": 0 },
    "items": [{ "code": "V-01", "name": "Cedar Ridge Villa 01", "available": true,
      "totalFrom": 144000, "currency": "INR",
      "nightlyRates": [{ "date": "2026-12-12", "amount": 72000 }] }]
  }
}
```

The booking API rechecks inventory and daily rates before creating the booking.
It atomically increments each nightly `Allotment.booked` only when
`total - held - booked > 0`; if any night cannot be claimed, already-claimed
nights are rolled back. This protects the final room when requests race. Booking
records snapshot nightly tariff/GST lines. The current server GST schedule uses
5% for a nightly tariff up to ₹7,500 and 18% above ₹7,500; verify the applicable
tax schedule with the resort's tax advisor before production.

Payment outcome example (test endpoint only):

```bash
curl -X POST http://localhost:5001/api/bookings/<booking-id>/test-payment \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <guest-token>" \
  -d '{"outcome":"success"}'
```

Only `success` marks the payment paid and the booking confirmed. `failure` and
`pending` remain persisted payment states; a failed/pending payment does not
release the inventory claim, and a failed payment may be retried.

The client now consumes the live room catalogue and availability API. The booking
dialog registers/signs in guests and creates bookings; the enquiry form posts to
the enquiry API and displays the selected department. The protected admin
dashboard is backed by the same typed `estateApi` client.

### Admin dashboard

Open `http://localhost:5173/admin` while `npm run dev` is running. Sign in with
the seeded Reservations Staff account (local development only, credentials listed
above). The protected dashboard provides Recharts analytics, booking search and
status management, daily booking CSV download, room CRUD/activation, daily rates,
website allotment calendars, blackout ranges, and promo-code create/activation.
The React gate checks `/api/auth/me`; each admin data mutation is separately
protected by backend JWT role middleware.

### AI enquiry routing

Set these in `backend/.env` to enable a hosted provider (keys stay server-side):

```env
AI_PROVIDER=openai # or gemini; off uses deterministic local fallback
AI_API_KEY=your-provider-key
AI_MODEL=gpt-4o-mini # Gemini example: gemini-2.0-flash
```

The backend requests **structured JSON** for category, confidence, summary,
priority, ISO stay dates, guest count, budget/currency, and a reply draft. If the
provider is disabled/unavailable, safe local triage keeps enquiries flowing and
low-confidence items remain in the unsorted queue. Seed fixtures demonstrate:

| Reference | Expected classification | Extracted fields / action |
| --------- | ----------------------- | -------------------------- |
| `ENQ-4410` | Wedding → Events | February 2027 (date unspecified), 250 guests, 2 nights |
| `ENQ-4411` | Room booking → Reservations | 14–16 November (next upcoming occurrence), 2 adults + 1 child |
| `ENQ-4412` | Corporate offsite → Corporate Sales | January (next upcoming month), team of 45, conference hall |

To refresh only these three fixtures in an existing demo database without
rebuilding rooms, rates, or allotments, run `npm run seed:enquiries --prefix backend`.

AI-generated replies are **drafts only**; there is no send endpoint or automatic
email/WhatsApp sending. The draft service supplies MongoDB room/rate/allotment
context and rejects currency/price/numeric claims from generated text. For
unmatched commercial details, the draft asks staff to verify. Staff can correct
category, assign a seeded staff member/team, edit the draft, and resolve alerts.
Website, email, and WhatsApp are simulated intake sources; no live channel
provider has been connected.

**Payment note:** the test-payment endpoint persists controlled test outcomes; it
does not collect card details or charge money. An actual gateway integration and
webhook verification must be added before accepting money.

No OTA connectivity, restaurant reservations, loyalty programme, or online
passport/Form C collection is implemented. Email and WhatsApp inbox entries are
simulated; no real channel sender or outbound reply integration is enabled.

## Deployment (Vercel + Render + MongoDB Atlas)

### 1. MongoDB Atlas

Create a production cluster and database user, allow network access from Render
(prefer Render's static outbound IPs or a carefully scoped allow-list), and copy
the `mongodb+srv://` connection string. Keep credentials out of source control.
Seed the database once from a trusted local machine or a Render shell configured
with production environment values:

```bash
npm ci --prefix backend
npm run seed --prefix backend
```

Set unique `SEED_RESERVATIONS_STAFF_EMAIL` and
`SEED_RESERVATIONS_STAFF_PASSWORD` before seeding. Never use the documented local
demo password on a public deployment. Do not re-run the seed command against a
live database without reviewing its effects first.

### 2. Render API

Connect the repository to Render and use the included `render.yaml` Blueprint,
or create a Node web service with root directory `backend`, build command
`npm ci && npm run build`, start command `npm start`, and health check
`/api/health`. Configure `MONGO_URI` with the Atlas URI and `CLIENT_URL` with the
exact deployed Vercel origin (comma-separated if using multiple origins).
`JWT_SECRET` is generated by the Blueprint; verify it is not replaced by a weak
value. Configure optional `AI_PROVIDER`, `AI_API_KEY`, and `AI_MODEL` only if
hosted AI is desired. The Render service must reach Atlas; its health endpoint
reports database connectivity. In production the backend refuses localhost
database/CORS defaults.

### 3. Vercel frontend

Create a Vercel project from the same repository and set its **Root Directory**
to `frontend`. Vercel will run the frontend package build and publish `dist/`;
`frontend/vercel.json` rewrites deep links to the SPA entry point. Set the build
environment variable `VITE_API_BASE_URL` to
`https://<your-render-service>.onrender.com/api` (no trailing slash). Redeploy
after changing this variable because Vite embeds it at build time. Add the final
Vercel domain to the Render `CLIENT_URL`, including any custom domain, then
redeploy the API.

### Demo checklist / credentials

- Guest: register through the website with a fresh email, then sign in and book.
- Reservations Staff local seed default: `admin@estatestay.local` /
  `EstateStay-Admin-2026!`. This is for local demonstrations only; set unique
  seed credentials before seeding any remote demo environment.
- Test payment is simulated only and never charges money. Test the `success`,
  `failure`, and `pending` outcomes; never enter real card details.
- Change rates/allotments in staff console and verify availability from a guest
  session; run the last-room concurrency API check before a demonstration.
- AI provider setup is optional. With `AI_PROVIDER=off`, deterministic fallback
  classification works; AI-generated replies are drafts and are never sent.

### Endpoint smoke tests

With the API and MongoDB running and sample data seeded:

```bash
npm run test:api --prefix backend
```

This runs request-level checks for health, catalogue, rates, availability,
guest/Reservations Staff authentication and authorization, per-tariff GST, concurrent attempts
to claim the same last room, success/failure/pending test payments, booking
cancellation, AI/fallback classification and extraction for all three sample
enquiries, GM alerts, MongoDB-grounded unsent drafts, simulated channel intake,
manual corrections/assignment, and admin endpoints. It removes temporary
test users, bookings, payments, enquiries, and QA catalogue records afterward.
