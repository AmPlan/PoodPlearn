# Hosting detail
## Localhost
uvicorn main:app --host localhost --port 8000
## Server
cloudflared tunnel --url http://localhost:8000