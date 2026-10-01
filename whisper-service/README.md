# Whisper STT Service

A FastAPI service for Thai speech transcription and answer grading. The service loads the local CTranslate2 model in `pathumma-whisper-ct2` when it starts.

## Requirements

- Python and `pip`
- The `model.bin` weights (about 2.88 GB) downloaded into `pathumma-whisper-ct2/`; get them from the [model repository](https://huggingface.co/plan12345/pathumma-whisper-ct2/tree/main/pathumma-whisper-ct2)

Install the Python dependencies from the repository root:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

## Run Locally

From the repository root, start the API:

```powershell
uvicorn main:app --host 127.0.0.1 --port 8000
```

The model is loaded during startup. Interactive API documentation is available at <http://127.0.0.1:8000/docs>.

## Configuration

Set these environment variables before starting the service:

| Variable | Default | Purpose |
| --- | --- | --- |
| `DEVICE` | Auto-detect (`cuda` when available, otherwise `cpu`) | Inference device |
| `COMPUTE_TYPE` | `float16` on CUDA, `int8` on CPU | CTranslate2 compute type |
| `TEMP_DIR` | `./temp/` | Directory for temporary audio uploads |
| `LOG_LEVEL` | `INFO` | Python logging level |

The model directory is currently fixed to `pathumma-whisper-ct2` relative to the working directory.

## API

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/health` | Returns service status and whether the model is loaded |
| `POST` | `/transcribe` | Transcribes an audio upload; accepts multipart fields `file` and optional `prompt` |
| `POST` | `/grade` | Compares recognized Thai text with an expected answer |

`/transcribe` accepts `.wav`, `.mp3`, `.m4a`, `.flac`, `.ogg`, and `.aac` files. Its response contains `text`, `duration_seconds`, and `model_used`.

Send `/grade` a JSON body with `asrText`, `expectedAnswer`, and optional `matchThreshold` (defaults to `0.65`):

```json
{
	"asrText": "ข้อความที่รู้จำได้",
	"expectedAnswer": "คำตอบที่คาดหวัง",
	"matchThreshold": 0.65
}
```

The response includes `isCorrect`, `correctness`, matched and missing words, and per-word match scores.

## Public Tunnel

To temporarily expose the local service through Cloudflare Tunnel, keep Uvicorn running and start this in another terminal:

```powershell
cloudflared tunnel --url http://localhost:8000
```

Treat the generated tunnel URL as public: anyone who has it can reach the service endpoints.