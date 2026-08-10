# Hosting detail
uvicorn main:app --host localhost --port 8000
cloudflared tunnel --url http://localhost:8000