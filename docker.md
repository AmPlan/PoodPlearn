# Run Postgres locally with Docker Compose

1. Start Postgres in detached mode:

```powershell
docker compose up -d
```

2. Verify Postgres is running (port 5432):

```powershell
docker compose ps
```

3. (Optional) Run Prisma migrate in the folder "NSC_web"  (ensure `prisma/schema.prisma` exists and `DATABASE_URL` is set in `.env`):

```powershell
npx prisma migrate dev --name init
```

5. Stop and remove containers when finished:

```powershell
docker compose down
```
