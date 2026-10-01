# PoodPlearn Web

PoodPlearn is a web application for speech and language assessment and training.
It includes patient assessment and naming-training experiences, therapist
patient management and progress reports, and a REST API backed by PostgreSQL.

## Requirements

- Node.js and npm
- PostgreSQL
- The separate ASR service for audio transcription and grading features

Google OAuth credentials are needed only if Google sign-in is enabled.

## Local development

From this directory, install the locked dependencies and create a local
environment file:

```bash
npm ci
cp .env.example .env
```

Configure `.env` before starting the application:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string used by Prisma |
| `BETTER_AUTH_SECRET` | Secret used by Better Auth to sign sessions |
| `BETTER_AUTH_URL` | Base URL of this app, for example `http://localhost:3000` |
| `ASR_SERVICE_URL` | Base URL of the ASR service; needed for speech features |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID; needed for Google sign-in |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret; needed for Google sign-in |

Better Auth reads `BETTER_AUTH_SECRET`. If you copied the current template,
rename its `AUTH_SECRET` entry to `BETTER_AUTH_SECRET` in `.env`.

Generate the Prisma client, apply the checked-in migrations to your development
database, then start Next.js:

```bash
npx prisma generate
npx prisma migrate dev
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). To run a production build,
use `npm run build`; it generates the Prisma client before building Next.js.

## Useful commands

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Generate Prisma client and build the app |
| `npm start` | Start the production server after building |
| `npm run lint` | Run Oxlint |
| `npm run fmt` | Format files with Oxfmt |
| `npm run api:docs` | Generate `public/openapi.json` from API routes |
| `npm run auth:create-admin -- --email admin@example.com --password "<password>"` | Create the initial admin user |

The interactive API reference is available at `/api-docs` while the app is
running. The generated OpenAPI document is served at `/openapi.json`.

## Authentication

Better Auth supports email/password and Google sign-in. Passwords must be
between 8 and 128 characters.

Google sign-in is allowed only for addresses present and enabled in the
`AllowedGoogleEmail` database table. An administrator can allow a therapist's
Google account with an authenticated admin session:

```http
POST /api/v1/auth/therapists
Content-Type: application/json

{"allowGoogleEmail":"therapist@gmail.com"}
```

The endpoint adds the address to the allowlist; it does not create a user.
When the allowed person signs up with Google, the app creates the user and
linked therapist record. Email/password signup does not create a therapist.

## Database backup

With the repository's PostgreSQL Compose service running, run this command
from the repository root to export the database:

```bash
docker compose exec -T db pg_dump -U myuser -d mydatabase > export.sql
```
