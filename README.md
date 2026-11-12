# Express Task API

An API-only account-management backend built with Express, TypeScript, PostgreSQL, and Drizzle ORM. It includes profiles, JWT authentication, account lifecycle operations, database-backed role authorization, and administrator user management.

## Features

- Strict request validation with Zod
- Password hashing with bcrypt
- Short-lived HS256 access tokens
- Database-backed `user` and `admin` roles
- Immediate session invalidation through `tokenVersion`
- Profile creation and updates
- Gmail password-reset links with single-use tokens
- Password change, signout, deactivation, reactivation, and deletion
- Admin user search, filtering, pagination, role changes, status changes, and deletion
- Last-active-admin protection
- OpenAPI documentation, Swagger UI, and a Postman QA collection

The project remains API-focused, with one small server-rendered password-reset form opened from emailed reset links. The health and echo demonstration endpoints are retained.

## Technology

- Node.js and TypeScript
- Express 5
- PostgreSQL 16
- Drizzle ORM and Drizzle Kit
- Zod
- JSON Web Tokens
- bcrypt
- Nodemailer
- Swagger UI

## Architecture

Requests pass through a small layered structure:

```text
HTTP request
  -> Express route
  -> authentication/authorization middleware when required
  -> controller and Zod validation
  -> service and transaction logic
  -> Drizzle ORM
  -> PostgreSQL
  -> centralized error response
```

Important directories:

```text
src/
  config/       Environment parsing and validation
  controllers/  HTTP request and response handling
  db/           Drizzle connection and table schemas
  docs/         Runtime OpenAPI loader
  middlewares/  Authentication, authorization, and errors
  routes/       Public, user, profile, and admin routers
  scripts/      Trusted administrator bootstrap
  services/     Account, password-reset email, profile, and admin logic
  validators/   Zod request schemas
drizzle/        Append-only SQL migrations and snapshots
postman/        Importable collection, environment, and instructions
```

## Prerequisites

- Node.js 20 or newer
- npm
- Docker with Docker Compose, or a compatible PostgreSQL instance

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create the local environment file:

   ```bash
   cp .env.example .env
   ```

3. Replace the example database password and generate a JWT secret of at least 32 characters. For example:

   ```bash
   openssl rand -hex 32
   ```

4. Start PostgreSQL:

   ```bash
   docker compose up -d db
   ```

5. Apply every migration:

   ```bash
   npx drizzle-kit migrate
   ```

6. Start the API:

   ```bash
   npm run dev
   ```

The default server URL is `http://localhost:5000`. Check it with:

```bash
curl http://localhost:5000/api/v1/health
```

## Run the API and database with Docker

This option runs both the compiled Express API and PostgreSQL in containers. It does not require Node.js on the host. The existing `npm run dev` workflow above remains useful for development with live reload.

1. Create `.env` from `.env.example` if you have not already, and configure the PostgreSQL values and a `JWT_SECRET` of at least 32 characters. For password-reset emails, configure both SMTP values and set `APP_BASE_URL` to the address that users can open.

2. Start PostgreSQL and run migrations as a one-off tools container:

   ```bash
   docker compose up -d db
   docker compose --profile tools run --rm tools
   ```

3. Start the API:

   ```bash
   docker compose up -d --build api
   ```

4. Test the running API and documentation:

   ```bash
   curl http://localhost:5000/api/v1/health
   ```

   Open `http://localhost:5000/api-docs/` for Swagger. If port 5000 is already in use by a locally running API, stop that process or set `API_PORT` to another host port. If you change the host port, use it in Postman and update `APP_BASE_URL` so reset links point to the correct address.

To create the initial administrator inside the tools container, set `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `ADMIN_DISPLAY_NAME` in `.env`, then run:

```bash
docker compose --profile tools run --rm tools npm run seed:admin
```

Remove the seed password from `.env` after bootstrapping. The tools container is also useful for rerunning migrations after schema changes. Migrations are intentionally a separate step; starting the API does not automatically apply them.

The host-side `DATABASE_URL` can keep using `localhost:5432`. Inside Compose, the API and tools use the `db` service name instead. By default Compose builds their connection URL from `POSTGRES_USER`, `POSTGRES_PASSWORD` and `POSTGRES_DB`; if credentials contain URL-special characters, set `DOCKER_DATABASE_URL` explicitly with URL-encoded credentials and host `db`. The `.env` file supplies runtime configuration and is excluded from the image.

To inspect or stop the services:

```bash
docker compose ps
docker compose logs -f api
docker compose down
```

The last command stops the services without deleting the PostgreSQL volume. Avoid `docker compose down -v` unless you intend to delete its stored database data.

## Environment variables

| Variable              | Required       | Purpose                                                                     |
| --------------------- | -------------- | --------------------------------------------------------------------------- |
| `POSTGRES_USER`       | Docker         | PostgreSQL container user                                                   |
| `POSTGRES_PASSWORD`   | Docker         | PostgreSQL container password                                               |
| `POSTGRES_DB`         | Docker         | Initial PostgreSQL database                                                 |
| `DATABASE_URL`        | Yes            | Full PostgreSQL connection URL used by the app and Drizzle                  |
| `DOCKER_DATABASE_URL` | No             | Override for the API/tools connection inside Compose; use `db` as the host  |
| `PORT`                | No             | HTTP port; defaults to 5000                                                 |
| `API_PORT`            | No             | Host port mapped to the Dockerized API; defaults to 5000                    |
| `JWT_SECRET`          | Yes            | Access-token signing secret; minimum 32 characters                          |
| `JWT_EXPIRES_IN`      | No             | Token duration such as `15m`, `1h`, or `1d`; defaults to `15m`              |
| `JWT_ISSUER`          | No             | Expected JWT issuer                                                         |
| `JWT_AUDIENCE`        | No             | Expected JWT audience                                                       |
| `BCRYPT_SALT_ROUNDS`  | No             | Integer from 10 through 15; defaults to 12                                  |
| `SMTP_USER`           | Password reset | Dedicated Gmail address used to send reset links                            |
| `SMTP_APP_PASSWORD`   | Password reset | Gmail App Password; never use the normal account password                   |
| `APP_BASE_URL`        | No             | Public application origin used in reset links; defaults to the local server |
| `ADMIN_EMAIL`         | Admin seed     | Trusted initial administrator email                                         |
| `ADMIN_PASSWORD`      | Admin seed     | Initial administrator password                                              |
| `ADMIN_DISPLAY_NAME`  | Admin seed     | Initial administrator profile name                                          |

Do not commit `.env`. The repository ignores it and only tracks `.env.example`.

## Database and migrations

The PostgreSQL container persists data in the `postgres_data` Docker volume. Stop the service without deleting data using:

```bash
docker compose down
```

Generate a migration after changing a Drizzle schema:

```bash
npx drizzle-kit generate
```

Apply pending migrations:

```bash
npx drizzle-kit migrate
```

Check that schemas and migration metadata agree:

```bash
npx drizzle-kit check
```

Applied migrations are append-only project history. Create a new migration instead of editing an already-applied migration.

The current schema contains:

- `users`
- `profiles`
- `password_reset_tokens`

Profiles and password-reset tokens reference users with `ON DELETE CASCADE`.

## Making the first administrator

There is no public promotion or administrator-creation endpoint. Configure these values temporarily in `.env`:

```dotenv
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=replace-with-a-strong-password
ADMIN_DISPLAY_NAME=Initial Administrator
```

Then run:

```bash
npm run seed:admin
```

The seed creates an active administrator and profile in one transaction. It is a no-op when that email already belongs to an administrator and refuses to promote an existing normal account.

Remove `ADMIN_PASSWORD` from `.env` after the bootstrap is complete. Keep at least one active administrator: the API rejects demotion, deactivation, or deletion that would remove the final active admin.

## Gmail password reset

Password reset is the only email feature. It uses Nodemailer and a dedicated Gmail account, so a custom sending domain is not required for this training project.

1. Enable 2-Step Verification on the Gmail account.
2. Create a 16-character Gmail App Password.
3. Configure `.env`:

   ```dotenv
   SMTP_USER=your-project-email@gmail.com
   SMTP_APP_PASSWORD=your-gmail-app-password
   APP_BASE_URL=http://localhost:5000
   ```

4. Restart the API.

Use an App Password, not the Gmail account password. App Password availability depends on the Google account configuration. See [Google App Passwords](https://support.google.com/accounts/answer/185833) and [Nodemailer Gmail guidance](https://nodemailer.com/guides/using-gmail).

The flow is intentionally small:

1. `POST /api/v1/auth/forgot-password` accepts an email.
2. The server creates a random token, stores only its SHA-256 hash, and emails a link.
3. The link opens `/reset-password?token=...`, a minimal HTML form served by this app.
4. Submitting the form changes the password, consumes all outstanding reset tokens for the user, and invalidates existing JWTs.

Tokens expire after 30 minutes and are single-use. Forgot-password returns a generic success response for unknown or ineligible accounts. When Gmail is not configured, it returns 503 for every address without looking up the account. Gmail is convenient for a demonstration project but should be replaced by a transactional provider for production-scale delivery.

## Authentication and authorization

Authentication proves which account made the request. Authorization decides whether that authenticated account may perform an action.

Access tokens contain the user ID in `sub` and a numeric `tokenVersion`. Roles are deliberately not embedded in or trusted from JWTs. On every authenticated request, `authenticate`:

1. Requires a correctly formed Bearer token.
2. Verifies the HS256 signature, issuer, audience, expiry, subject, and payload.
3. Loads the current user from PostgreSQL.
4. Rejects missing users, stale token versions, and deactivated accounts.
5. Attaches the database role to `req.user`.

`authorizeRoles("admin")` then returns 403 when an authenticated user lacks the required role. Public signup and profile APIs reject role input.

Signout, password changes/resets, role changes, deactivation, and reactivation increment `tokenVersion`, immediately invalidating previously issued access tokens.

## Account lifecycle

- Signup creates the user and profile transactionally.
- Password changes and resets invalidate existing sessions.
- Password-reset tokens are hashed, single-use, and expire after 30 minutes.
- Deactivation retains account/profile data and blocks signin until reactivation.
- Reactivation requires the account credentials and invalidates older sessions.
- Self-deactivation and self-deletion require the current password.
- Permanent deletion removes the user and cascades to the profile. It cannot be undone.

## API overview

All application endpoints are under `/api/v1`.

### Authentication

| Method | Path                    | Purpose                          |
| ------ | ----------------------- | -------------------------------- |
| `POST` | `/auth/signup`          | Create an account and profile    |
| `POST` | `/auth/signin`          | Receive an access token          |
| `POST` | `/auth/signout`         | Invalidate existing sessions     |
| `POST` | `/auth/forgot-password` | Email a password-reset link      |
| `POST` | `/auth/reset-password`  | Reset a password with a token    |
| `POST` | `/auth/reactivate`      | Reactivate a deactivated account |

The emailed link opens `GET /reset-password`; its form submits to `POST /reset-password`.

### Current user and profile

| Method   | Path                   | Purpose                        |
| -------- | ---------------------- | ------------------------------ |
| `GET`    | `/users/me`            | Read safe account fields       |
| `PATCH`  | `/users/me/password`   | Change password                |
| `POST`   | `/users/me/deactivate` | Deactivate own account         |
| `DELETE` | `/users/me`            | Permanently delete own account |
| `GET`    | `/users/me/profile`    | Read own profile               |
| `PATCH`  | `/users/me/profile`    | Update own profile             |

### Administration

Every admin route requires authentication and the current database role `admin`. Admin routes cannot target the calling administrator's own ID.

| Method   | Path                              | Purpose                            |
| -------- | --------------------------------- | ---------------------------------- |
| `GET`    | `/admin/users`                    | Search, filter, and paginate users |
| `GET`    | `/admin/users/:userId`            | Read safe account/profile details  |
| `PATCH`  | `/admin/users/:userId/role`       | Assign `user` or `admin`           |
| `POST`   | `/admin/users/:userId/deactivate` | Deactivate another account         |
| `POST`   | `/admin/users/:userId/reactivate` | Reactivate another account         |
| `DELETE` | `/admin/users/:userId`            | Permanently delete another account |

User-list query defaults are `page=1` and `limit=20`. The maximum limit is 100. Optional filters are `search`, `role`, and `status`; ordering is deterministic and newest-first.

Expected error categories include 400 for validation, 401 for failed authentication, 403 for insufficient authorization, 404 for a missing target, and 409 for conflicts such as invalid state transitions or last-admin protection.

## API documentation

With the server running:

- Swagger UI: `http://localhost:5000/api-docs/`
- OpenAPI YAML: `http://localhost:5000/openapi.yaml`

Swagger retains an entered Bearer token while the page is open. The source specification is `openapi.yaml`.

## Postman

Import both files from `postman/`:

- `Express Task API.postman_collection.json`
- `Express Task API.postman_environment.json`

Select the imported environment, set `adminEmail` and `adminPassword`, and run folders 01 and 02 in order. The collection generates a disposable user, captures tokens and IDs, tests RBAC/session invalidation, and deletes the disposable account.

The manual folder contains forgot/reset-password requests. The emailed link can be used directly in a browser, or its token can be copied into the Postman environment. See `postman/README.md` for collection details.

## Scripts and checks

```bash
npm run dev          # Development server with watch mode
npm run typecheck    # TypeScript check without output
npm run build        # Compile to dist/
npm start            # Run compiled server
npm run seed:admin   # Bootstrap the trusted initial administrator
npx drizzle-kit check
npm audit --omit=dev
```

The current `npm test` script is only a placeholder; automated unit/integration test infrastructure has not been added. The Postman collection provides executable API regression coverage.

## Security notes and limitations

- Password hashes, token versions, and security-token hashes are never returned by account/admin APIs.
- Password-reset email failures do not log recipients, message contents, credentials, or tokens.
- Roles are trusted only from the database, not request data or JWT claims.
- Admin-sensitive mutations use transactions and row locks. Active administrators are locked in deterministic order before last-admin checks.
- User deletion is irreversible and uses database cascades.
- Request bodies are limited to 100 KB.
- Error responses avoid leaking SQL or sensitive account details.
- This training project has no persistent administrator audit-log table.
- Production deployments should additionally consider rate limiting, abuse protection, key rotation, refresh-token strategy, structured observability, backups, HTTPS enforcement, CORS policy, and automated unit/integration testing.
