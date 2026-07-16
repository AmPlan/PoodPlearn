# Whisper STT: Python model + TypeScript library

This splits your original script into two pieces:

1. **`whisper-service/`** — a small FastAPI app that loads your CT2 model
   *once* at startup and exposes `POST /transcribe`. It reuses the same
   model loading, loudness normalization, and prompt-handling logic from
   your original script, unchanged in behavior. This still has to run as
   a separate Python process since the CT2 model can't load inside Node.
2. **`nextjs-api/lib/whisperClient.ts`** + **`nextjs-api/types/whisper.ts`**
   — a plain TypeScript library (no HTTP route) that you import and call
   directly from server-side code (server actions, route handlers you
   write yourself, scripts, etc). It sends the audio over to the Python
   service under the hood and returns the parsed result.

## Where each file goes

| File | Goes into your Next.js project at |
|---|---|
| `nextjs-api/lib/whisperClient.ts` | `lib/whisperClient.ts` |
| `nextjs-api/types/whisper.ts` | `types/whisper.ts` |
| `whisper-service/main.py` | its own location — **not** inside the Next.js project. Run it as a standalone Python process/service (its own folder, VM, or container) wherever the model files and GPU/CPU live. |
| `whisper-service/requirements.txt` | same folder as `main.py` |

(The `@/` import alias in `whisperClient.ts` assumes your `tsconfig.json`
has `"@/*": ["./*"]` — adjust the import paths if your alias differs.)

## 1. Run the Python model service

```bash
cd whisper-service
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt

# Place your pathumma-whisper-ct2 model directory here, or point to it:
export MODEL_DIR=/path/to/pathumma-whisper-ct2

uvicorn main:app --host 0.0.0.0 --port 8000
```

Check it's up: `curl http://localhost:8000/health`

## 2. Use the library from your Next.js code

Add to your `.env.local`:

```
WHISPER_SERVICE_URL=http://localhost:8000
```

Then call it directly wherever you have server-side code (a server action,
a route handler, a script):

```ts
import { transcribeWithService } from "@/lib/whisperClient";

const result = await transcribeWithService(audioBlob, "recording.wav", {
  prompt: "",
  language: "th",
});
// result.text, result.durationSeconds, result.language
```

This is server-side only — it needs to run somewhere with network access
to `WHISPER_SERVICE_URL`, not in a browser component.

## Notes / things to decide for production

- **Concurrency**: FastAPI handles requests one at a time per worker against
  a single loaded model. For real concurrency, run multiple `uvicorn`
  workers each with their own model copy (GPU memory permitting), or queue
  requests.
- **File size limits**: Next.js route handlers buffer the upload in memory
  by default; for large audio files consider streaming or a direct
  upload-to-storage + background job pattern instead.
- **Auth**: the Python service has no auth — keep it on a private network
  or add an API key check if it's reachable from the internet.
- **Batch processing**: the original `batch_transcribe` (watching an
  `Input/` folder) wasn't ported, since it doesn't fit a request/response
  API model. If you still want folder-based batch processing, that's best
  kept as a separate Python script/cron job calling the same `WhisperSTT`
  class directly, or hitting this service file-by-file.
