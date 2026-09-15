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
