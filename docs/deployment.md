# EstateStay Deployment Guide

This guide covers the current deployment topology: a Vercel project for the
Express API, a separate Vercel project for the React frontend, and MongoDB Atlas
for persistence. It is written for the repository's `main` branch and current
project domains; update the origins below if custom domains change.

**GitHub repository:** [https://github.com/kartikay-k/Estate-resort-Booking](https://github.com/kartikay-k/Estate-resort-Booking)

**Live application:** [https://estate-resort-booking-jind.vercel.app](https://estate-resort-booking-jind.vercel.app)

> **Do not commit secrets.** Never add `.env` files, MongoDB URIs, passwords,
> JWT secrets, or AI provider keys to Git or frontend variables.

## 1. Deployment topology

| Component    | Hosting                      | Project root                 | Production URL                                  |
| ------------ | ---------------------------- | ---------------------------- | ----------------------------------------------- |
| Backend API  | Vercel Node/Express function | `backend`                    | `https://estate-resort-booking.vercel.app`      |
| Frontend SPA | Vercel static deployment     | `frontend`                   | `https://estate-resort-booking-jind.vercel.app` |
| Database     | MongoDB Atlas                | Database selected by the URI | No public application URL                       |

The frontend calls the API at `https://estate-resort-booking.vercel.app/api`.
The backend allows browser requests only from origins configured in `CLIENT_URL`.

## 2. Prerequisites

- The GitHub repository is connected to both Vercel projects.
- The production code is pushed to the tracked branch (`main`).
- A MongoDB Atlas cluster and **Database Access** user are available.
- Use a unique, rotated Atlas database-user password and URL-encode it in the
  connection URI if it contains URI-reserved characters.
- Vercel Production environment variables are configured for both projects.

Atlas website sign-in credentials and Atlas database-user credentials are
different. `MONGO_URI` must use the database user's username and password.

## 3. Run locally

1. Install Node.js 22 (the tested version) and npm 10 or newer. Start a local MongoDB
   instance or prepare a MongoDB Atlas database.
2. Clone the repository and enter its folder:

   ```powershell
   git clone https://github.com/kartikay-k/Estate-resort-Booking.git
   Set-Location Estate-resort-Booking
   ```

3. Install dependencies:

   ```powershell
   npm ci
   npm ci --prefix backend
   npm ci --prefix frontend
   ```

4. Create local environment files from the templates:

   ```powershell
   Copy-Item backend\.env.example backend\.env
   Copy-Item frontend\.env.example frontend\.env
   ```

   Configure the backend names `MONGO_URI`, `JWT_SECRET`, `CLIENT_URL`,
   `SEED_RESERVATIONS_STAFF_EMAIL`, and
   `SEED_RESERVATIONS_STAFF_PASSWORD` in the ignored backend `.env` file.
   Configure `VITE_API_BASE_URL` in the frontend `.env` file. Use unique local
   values and never commit either `.env` file.

5. To load sample rooms and inventory, use a new, empty, disposable database
   and run the seed command only after reviewing its destructive effects:

   ```powershell
   npm run seed --prefix backend
   ```

   Do not run this command against the deployed database.

6. Start the API and frontend in separate terminals:

   ```powershell
   npm run dev --prefix backend
   ```

   ```powershell
   npm run dev --prefix frontend
   ```

7. Open `http://localhost:5173` and verify the API at
   `http://localhost:5001/api/health`. For request-level checks, run
   `npm run test:api --prefix backend` after preparing the test data and
   credentials required by the smoke script.

## 4. MongoDB Atlas setup

1. In Atlas, create or select the intended production cluster and database
   user.
2. Configure **Network Access** so the deployed backend can connect. Prefer a
   hosting plan/network configuration with stable, restricted egress. Do not
   keep a `0.0.0.0/0` allowlist entry as the permanent production policy.
3. Copy the Atlas driver URI and store it only in the backend's protected
   environment-variable settings. Do not paste it in tickets, chat, source
   code, documentation, or build logs.

### Database name continuity

Mongoose uses the database named in the URI path. If the path is omitted, the
MongoDB driver uses its default database (commonly `test`). The currently
seeded deployment has used that default database. **Do not add or change the
database path on the live URI without migrating the existing collections**;
otherwise the application will connect to a different, apparently empty
database.

### Existing data and seeding

The current Atlas database has been seeded with the resort catalogue, rates,
inventory, promo data, staff records, and sample enquiries. Do not run
`npm run seed --prefix backend` against this live database: the script deletes
and rebuilds the room, rate-plan, daily-rate, allotment, and promo-code
collections, and resets the configured bootstrap staff account. Use backups
and an approved migration process for production data changes.

The seed command is only for a new, empty, disposable database after explicit
review. It must have a unique `SEED_RESERVATIONS_STAFF_EMAIL` and a strong,
unique `SEED_RESERVATIONS_STAFF_PASSWORD`. The command fails before changing
data if either credential is not provided.

## 5. Deploy the backend to Vercel

Create or configure the backend Vercel project:

| Setting           | Value                           |
| ----------------- | ------------------------------- |
| Git repository    | EstateStay repository           |
| Production branch | `main`                          |
| Root Directory    | `backend`                       |
| Framework Preset  | Express                         |
| Install Command   | `npm ci --include=dev`          |
| Build Command     | `npm run build`                 |
| Output Directory  | Leave unset / framework default |

The Express application is exported from `backend/app.ts`; the API connects to
MongoDB on demand before serving database-backed requests. The backend build
pins TypeScript 5.9.3 for Vercel compatibility.

### Backend environment variable names

Add these in **backend Vercel project → Settings → Environment Variables**.
Select Production, and Preview only when you have separate, safe preview
configuration.

```text
NODE_ENV
MONGO_URI
JWT_SECRET
JWT_EXPIRES_IN
CLIENT_URL
AI_PROVIDER (optional)
AI_MODEL (optional)
AI_API_KEY (optional; secret)
SEED_RESERVATIONS_STAFF_EMAIL (seed only)
SEED_RESERVATIONS_STAFF_PASSWORD (seed only; secret)
PORT (Render only)
```

Set `CLIENT_URL` to the exact frontend origin that should be allowed. It may
contain a comma-separated list of approved origins; avoid wildcard origins
with credentialed CORS. `PORT` is not required for the Vercel function; it is
used by the local server and alternative Render deployment.

Generate and store a unique `JWT_SECRET` directly in the hosting provider's
environment-variable settings. Do not copy secret values into this document,
source control, tickets, or build logs.

After saving environment variables, deploy the latest `main` commit. Do not
assume an existing deployment automatically receives changed environment
variables.

## 6. Deploy the frontend to Vercel

Create or configure a separate Vercel project:

| Setting           | Value                 |
| ----------------- | --------------------- |
| Git repository    | EstateStay repository |
| Production branch | `main`                |
| Root Directory    | `frontend`            |
| Install Command   | `npm ci`              |
| Build Command     | `npm run build`       |
| Output Directory  | `dist`                |

Add this name in **frontend Vercel project → Settings → Environment
Variables**:

```text
VITE_API_BASE_URL
```

Set it to the deployed API base URL ending in `/api`. `VITE_*` variables are
embedded in the frontend bundle and visible to users; never put passwords or
private keys in them. Redeploy the frontend after changing this variable.

The tracked `frontend/vercel.json` sends SPA routes to `index.html`, so paths
such as `/rooms`, `/booking`, and `/admin` work on direct browser navigation.

## 7. Deploy order and verification

1. Configure the Atlas database and backend environment variables.
2. Deploy the backend from `main`.
3. Open the health endpoint:

   ```text
   https://estate-resort-booking.vercel.app/api/health
   ```

   Confirm HTTP 200, `environment` is `production`, and
   `data.database.state` is `connected`.

4. Check the public catalogue endpoint:

   ```text
   https://estate-resort-booking.vercel.app/api/rooms?page=1&limit=2
   ```

   Confirm HTTP 200 and a nonzero `data.total`.

5. Configure `CLIENT_URL` with the frontend's exact production origin and
   redeploy the backend if it changed.
6. Configure `VITE_API_BASE_URL` in the frontend project to use the deployed
   API base URL and deploy the frontend.
7. Open the deployed frontend and verify the home and rooms pages load without
   a network error or “Live catalogue unavailable” alert.
8. Check browser developer tools for CORS errors and failed API requests. Test
   staff sign-in only with the intended bootstrap staff account.

The health endpoint can return HTTP 200 when MongoDB is disconnected; always
inspect the `data.database.state` value as well as the HTTP status. For
database-backed routes, a connection failure is returned as HTTP 503.

## 8. Reviewer demo login

- Staff account email: `Admin@gmail.com`
- Password: karthik@123456789
- This is a privileged Reservations Staff account. Share the password only
  with the intended reviewer and rotate it after the review if it will remain
  active.
- Confirm the account password is unique and rotated before sharing it.
  Removing an old credential from current files does not remove it from Git
  history.

Guests can also register on the live application. The test-payment flow is
simulated and does not charge a payment method.

## 9. Continuous deployment and rollback

- A push to `main` triggers a deployment in each Vercel project connected to
  that branch.
- Frontend and backend are independent projects; each has its own build logs,
  environment variables, deployment history, and rollback controls.
- Confirm each deployment's source commit and status before diagnosing a
  runtime issue.
- Environment-variable changes require a new deployment for the affected
  project.
- To roll back application code, promote a previously known-good deployment
  using Vercel's deployment controls. Recheck health, database connectivity,
  and frontend-to-API behavior afterward.
- Code rollback does not roll back MongoDB writes or schema/data changes.
  Database changes require a separately planned backup and recovery procedure.

## 10. Troubleshooting

| Symptom                                               | Checks                                                                                                                                                                   |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Cannot find type definition file for 'node'`         | Confirm backend root is `backend`, the install command includes dev dependencies, and the deployment uses the committed backend package lockfile.                        |
| Vercel TypeScript checker crashes                     | Confirm the deployment uses the backend lockfile with TypeScript pinned to `5.9.3`; redeploy without stale build cache.                                                  |
| API returns `FUNCTION_INVOCATION_FAILED`              | Inspect that deployment's runtime logs for the startup exception. Verify exact Production environment-variable names and values without exposing them.                   |
| `/api/health` reports database disconnected           | Check the backend Production `MONGO_URI`, Atlas Database Access username/password, URI encoding, Atlas network access, and the Vercel runtime logs.                      |
| `/api/rooms` returns `503 Database unavailable`       | The API could not connect to MongoDB during the request. Resolve the health/database issue first.                                                                        |
| Browser shows a network error but API works in `curl` | Check the browser request URL and the backend `CLIENT_URL`. CORS must include the exact frontend origin, including scheme and hostname, with no trailing slash.          |
| Rooms endpoint returns `total: 0`                     | Verify the URI points to the database containing the seeded collections. Do not rerun the destructive seed as a diagnostic.                                              |
| Frontend still calls the wrong API                    | Verify the frontend Production `VITE_API_BASE_URL`, redeploy the frontend, then inspect the browser Network panel for the actual request URL.                            |
| Admin login fails while database is connected         | Verify the account exists, is active, and has the `reservations_staff` role. Confirm the login uses the database user's account email and its configured staff password. |
| Frontend changes do not appear                        | Verify the deployment source commit and branch; clear the browser cache or open a fresh session.                                                                         |

Never include secret values in shared logs or screenshots. Share only redacted
error messages, request paths, status codes, and deployment commit identifiers.

## 11. Alternative Render backend

`render.yaml` is an alternative API hosting configuration; it is not used by
the Vercel projects. If deploying the backend to Render instead, configure a
Render Node web service with:

- Root Directory: `backend`
- Build Command: `npm ci && npm run build`
- Start Command: `npm start`
- Health Check Path: `/api/health`
- `MONGO_URI`, `JWT_SECRET`, `CLIENT_URL`, and `PORT` as service environment
  variables

Set the frontend `VITE_API_BASE_URL` to the Render API origin ending in `/api`,
update the API `CLIENT_URL` to the deployed frontend origin, then redeploy both
affected services. Do not point the frontend at both the Vercel and Render API
unless the application is intentionally being migrated.

## 12. Production limitations

The test-payment endpoint simulates payment outcomes and does not charge a
payment method. Do not accept real payments until a payment provider, signed
webhook verification, idempotency, refunds, and booking/payment reconciliation
are implemented. Review [`TECHNICAL_DESIGN.md`](TECHNICAL_DESIGN.md) for further
security, operational, and production-readiness considerations.
