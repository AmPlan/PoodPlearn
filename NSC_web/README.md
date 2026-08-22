# Localhost
npm run dev

postgresql://myuser:mysecretpassword@localhost:51214/mydatabase?schema=public
docker exec -i nsc_web-db-1 pg_dump -U myuser -d mydatabase > export.sql
