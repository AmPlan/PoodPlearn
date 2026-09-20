# Localhost
npm run dev

postgresql://myuser:mysecretpassword@localhost:51214/mydatabase?schema=public
docker exec -i nsc_web-db-1 pg_dump -U myuser -d mydatabase > export.sql

## Better Auth

Create the initial admin user with the locally pinned Better Auth CLI:

```bash
pnpm auth:create-admin --email admin@example.com --password "<password>"
```

The command loads `src/lib/auth.ts` explicitly. Ensure `DATABASE_URL` and
`BETTER_AUTH_SECRET` are set in `.env` before running it.

Google sign-in is restricted to the exact, comma-separated Gmail addresses in
`GOOGLE_ALLOWED_EMAILS`. Email matching is case-insensitive and ignores
surrounding whitespace:

```dotenv
GOOGLE_ALLOWED_EMAILS=first@gmail.com,second@gmail.com
```

If `GOOGLE_ALLOWED_EMAILS` is unset or empty, Google sign-in is denied for all
accounts.

Google accounts are also controlled by the `AllowedGoogleEmail` table. An
administrator can allow a therapist's Gmail address through:

```http
POST /api/v1/auth/therapists
Content-Type: application/json

{"allowGoogleEmail":"therapist@gmail.com"}
```

The request must use an authenticated admin session. The endpoint only adds
the allowlist entry; it does not create a password account. When that person
signs up through Google, Better Auth creates the user and the linked
`Therapist` record automatically. Email/password signup does not create a
therapist.
