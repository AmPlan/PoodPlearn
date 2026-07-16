# Run Postgres locally with Docker Compose

1. Copy the example env file and customize if needed:

```powershell
copy .env.example .env
```

2. Start Postgres in detached mode:

```powershell
docker compose up -d
```

3. Verify Postgres is running (port 5432):

```powershell
docker compose ps
```

4. (Optional) Run Prisma migrate (ensure `prisma/schema.prisma` exists and `DATABASE_URL` is set in `.env`):

```powershell
npx prisma migrate dev --name init
```

5. Stop and remove containers when finished:

```powershell
docker compose down
```
