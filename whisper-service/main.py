"""
FastAPI microservice that wraps the original faster-whisper CT2 model logic.

This keeps the exact transcription behavior from the original script
(model loading, loudness normalization, prompt handling) but exposes it
over HTTP so a Next.js API route can call it.

Also provides a /grade endpoint that tokenizes Thai text and performs
fuzzy matching to determine answer correctness. Works for both single-word
answers and full sentences: every expected word must have a close fuzzy
match somewhere in the ASR output for the answer to count as correct.

Run with:
    uvicorn main:app --host 127.0.0.1 --port 8000
Env vars:
    MODEL_DIR   - path to the CT2 model directory (default: pathumma-whisper-ct2)
    DEVICE      - "cuda" or "cpu" (default: auto-detect)
    COMPUTE_TYPE- override compute type (default: auto based on device)
"""

import logging
import os
import re
import time
import traceback
import uuid
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from pydantic import BaseModel

from faster_whisper import WhisperModel
import torch

from pythainlp.tokenize import word_tokenize as th_word_tokenize
from pythainlp.util import normalize as th_normalize

from rapidfuzz import fuzz

# --- Logging -----------------------------------------------------------------
# Configure this once, at import time, so every logger.exception() call below
# actually prints a full traceback to the uvicorn console instead of relying
# on print() or FastAPI's default (which only logs *unhandled* exceptions,
# not ones we've already caught and wrapped in an HTTPException).
logging.basicConfig(
    level=os.environ.get("LOG_LEVEL", "INFO"),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("whisper_stt")

ALLOWED_EXT = {".wav", ".mp3", ".m4a", ".flac", ".ogg", ".aac"}
TEMP_DIR = os.environ.get("TEMP_DIR", "./temp/")

# Default fuzzy-match threshold for "is this ASR token close enough to the
# expected word". Tune per-deployment; lower = more lenient.
DEFAULT_MATCH_THRESHOLD = 0.65

language: str = "th"
task: str = "transcribe"
beam_size: int = 5
vad_filter: bool = True

# Grab directories for both models, with fallbacks
# pathumma-whisper-ct2
# distill-whisper-th-large-v3-ct2
# typhoon-whisper-turbo-ct2
MODEL_DIR = "pathumma-whisper-ct2"


def get_default_device() -> str:
    return "cuda" if torch.cuda.is_available() else "cpu"


def choose_compute_type(device: str) -> str:
    if device == "cuda":
        return "float16"
    return "int8"


class WhisperSTT:
    def __init__(self, model_dir: str, device: str = None, compute_type: str = None):
        if device is None:
            device = get_default_device()
        if compute_type is None:
            compute_type = choose_compute_type(device)
        self.model_dir = model_dir
        self.device = device
        self.compute_type = compute_type

        logger.info(
            "Loading WhisperModel: model_dir=%s device=%s compute_type=%s "
            "(resolved from cwd=%s)",
            model_dir,
            device,
            compute_type,
            os.getcwd(),
        )
        if not os.path.isdir(model_dir) and not model_dir.startswith("http"):
            # WhisperModel *can* accept a HF repo id instead of a local path,
            # so this is a warning, not a hard failure -- but it's the #1
            # cause of a silent startup crash when MODEL_DIR is relative and
            # uvicorn was launched from a different working directory.
            logger.warning(
                "model_dir '%s' is not a local directory relative to cwd=%s. "
                "If this isn't a Hugging Face repo id, model loading will fail.",
                model_dir,
                os.getcwd(),
            )

        try:
            self.model = WhisperModel(
                self.model_dir, device=device, compute_type=compute_type
            )
        except Exception:
            logger.exception(
                "Failed to load WhisperModel(model_dir=%s, device=%s, compute_type=%s)",
                model_dir,
                device,
                compute_type,
            )
            raise

    def transcribe(
        self,
        audio_file: str,
        prompt: str,
        language: str = "th",
        task: str = "transcribe",
        beam_size: int = 5,
        vad_filter: bool = True,
    ):
        if prompt and "_" in prompt:
            prompt = ""

        logger.debug(
            "transcribe() called: audio_file=%s size=%s prompt=%r language=%s "
            "task=%s beam_size=%s vad_filter=%s",
            audio_file,
            os.path.getsize(audio_file) if os.path.exists(audio_file) else "MISSING",
            prompt,
            language,
            task,
            beam_size,
            vad_filter,
        )

        start = time.time()
        try:
            segments, info = self.model.transcribe(
                audio_file,
                language=language,
                task=task,
                beam_size=beam_size,
                vad_filter=vad_filter,
                condition_on_previous_text=False,
                no_speech_threshold=0.6,
                repetition_penalty=1.2,
                temperature=[0, 0.2],
                initial_prompt=prompt,
                hotwords=prompt,
                vad_parameters={
                    "threshold": 0.25,
                    "min_silence_duration_ms": 1000,
                    "speech_pad_ms": 400,
                },
                suppress_blank=True,
            )
            # segments is a lazy generator in faster-whisper -- the actual
            # decoding (and therefore most decode-time exceptions, e.g. from
            # ffmpeg/PyAV failing to read a corrupt or empty file) happens
            # here, while consuming it, NOT on the .transcribe() call above.
            text = " ".join([segment.text for segment in segments]).strip()
        except Exception:
            logger.exception(
                "model.transcribe() failed for audio_file=%s (language=%s task=%s)",
                audio_file,
                language,
                task,
            )
            raise

        elapsed = time.time() - start
        logger.info(
            "Transcribed %s in %.2fs -> %d chars (detected_language=%s, prob=%.2f)",
            audio_file,
            elapsed,
            len(text),
            getattr(info, "language", "?"),
            getattr(info, "language_probability", 0.0),
        )
        return text, elapsed


# --- Thai text grading helpers -------------------------------------------------


def tokenize_thai(text: str) -> list[str]:
    if not text or not text.strip():
        return []
    return th_word_tokenize(text, engine="newmm")


def normalize_text(text: str) -> str:
    text = text.strip().lower()
    text = th_normalize(text)
    # NOTE: these must be single backslashes (\s), not \\s, or the regex
    # matches the literal characters "\" + "s" instead of whitespace.
    text = re.sub(r"[^\u0E00-\u0E7Fa-zA-Z0-9\s]", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def tokenize_and_normalize(text: str) -> list[str]:
    norm = normalize_text(text)
    return tokenize_thai(norm)


def best_match_for_word(exp_word: str, asr_tokens: list[str]) -> dict:
    """Find the ASR token closest to a single expected word, with its score."""
    best_token = None
    best_score = 0.0

    for asr_word in asr_tokens:
        # Standard ratio (strict, heavily penalizes length differences)
        # Standard strict comparison
        strict_score = fuzz.ratio(exp_word, asr_word) / 100.0

        # One-Way Partial Match: Only use partial_ratio if the ASR recorded a word
        # that is equal to or longer than the expected word.
        if len(asr_word) >= len(exp_word):
            partial_score = fuzz.partial_ratio(exp_word, asr_word) / 100.0
        else:
            partial_score = 0.0

        # Take the best score (penalizing the partial match slightly to favor exact matches)
        score = max(strict_score, partial_score * 0.95)
        if score > best_score:
            best_score = score
            best_token = asr_word

    return {"expectedWord": exp_word, "matchedToken": best_token, "score": best_score}


def compute_similarity(
    asr_text: str,
    expected_answer: str,
    match_threshold: float = DEFAULT_MATCH_THRESHOLD,
) -> dict:
    """
    Tokenizes both the ASR output and the expected answer into Thai words,
    then checks that every expected word has a close fuzzy match somewhere
    in the ASR token list. Works the same way whether expected_answer is a
    single word ("อาหาร") or a full sentence ("อาหารไทยอร่อยมาก") — the
    sentence just becomes a list of words that must ALL be found.

    Returns a per-word breakdown (wordResults) showing, for every expected
    word, which ASR token it matched best and the similarity score — so the
    caller can see exactly which word(s) failed and why, not just a final
    pass/fail.
    """
    asr_tokens = tokenize_and_normalize(asr_text)
    expected_tokens = tokenize_and_normalize(expected_answer)

    if not asr_tokens or not expected_tokens:
        logger.debug(
            "compute_similarity: empty tokens (asr_tokens=%s, expected_tokens=%s) "
            "raw_asr_text=%r raw_expected_answer=%r",
            asr_tokens,
            expected_tokens,
            asr_text,
            expected_answer,
        )
        return {
            "isCorrect": False,
            "correctness": 0.0,
            "matchedWords": [],
            "missingWords": expected_tokens,
            "wordResults": [],
            "tokenizedAsr": asr_tokens,
            "expected": expected_answer,
        }

    matched_words = []
    missing_words = []
    word_results = []

    for exp_word in expected_tokens:
        match = best_match_for_word(exp_word, asr_tokens)
        is_match = match["score"] >= match_threshold
        word_results.append(
            {
                "expectedWord": exp_word,
                "matchedToken": match["matchedToken"],
                "score": match["score"],
                "isMatch": is_match,
            }
        )
        if is_match:
            matched_words.append(exp_word)
        else:
            missing_words.append(exp_word)

    # Correctness is based on the actual similarity score of each word.
    # A word with a higher fuzzy-match score contributes more to the final score.
    total_score = sum(item["score"] for item in word_results)
    correctness = total_score / len(expected_tokens)

    if len(missing_words) > 0:
        correctness = 0

    # Require every expected word to reach the threshold for a full correct answer.
    is_correct = correctness >= match_threshold

    logger.debug(
        "compute_similarity: expected=%r asr=%r -> correctness=%.3f isCorrect=%s "
        "missingWords=%s",
        expected_answer,
        asr_text,
        correctness,
        is_correct,
        missing_words,
    )

    return {
        "isCorrect": is_correct,
        "correctness": correctness,
        "matchedWords": matched_words,
        "missingWords": missing_words,
        "wordResults": word_results,
        "tokenizedAsr": asr_tokens,
        "expected": expected_answer,
    }


# --- App state -------------------------------------------------------------

stt_model_1: Optional[WhisperSTT] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global stt_model_1
    os.makedirs(TEMP_DIR, exist_ok=True)
    device = os.environ.get("DEVICE") or get_default_device()
    compute_type = os.environ.get("COMPUTE_TYPE") or choose_compute_type(device)

    model1_dir = MODEL_DIR

    logger.info(f"Loading models on device={device}, compute_type={compute_type}...")
    try:
        stt_model_1 = WhisperSTT(
            model_dir=model1_dir, device=device, compute_type=compute_type
        )
    except Exception:
        # Without this, a failed model load at startup just silently leaves
        # stt_model_1 = None, and every /transcribe call will 503 forever
        # with no indication *why* the model never loaded. Fail loudly.
        logger.exception(
            "FATAL: model failed to load at startup (model_dir=%s, device=%s, "
            "compute_type=%s). The app will start, but /transcribe will 503 "
            "on every request until this is fixed.",
            model1_dir,
            device,
            compute_type,
        )
        raise
    logger.info(f"Model 1 ({model1_dir}) loaded.")

    yield


app = FastAPI(title="Whisper STT Service", lifespan=lifespan)


class TranscribeResponse(BaseModel):
    text: str
    duration_seconds: float
    model_used: str


class GradeRequest(BaseModel):
    asrText: str
    expectedAnswer: str
    matchThreshold: Optional[float] = None  # optional override, defaults to 0.6


class WordResult(BaseModel):
    expectedWord: str
    matchedToken: Optional[str]
    score: float
    isMatch: bool


class GradeResponse(BaseModel):
    isCorrect: bool
    correctness: float
    matchedWords: list[str]
    missingWords: list[str]
    wordResults: list[WordResult]
    tokenizedAsr: list[str]
    expected: str


@app.get("/health")
async def health():
    return {"status": "ok", "model_loaded": stt_model_1 is not None}


@app.post("/transcribe", response_model=TranscribeResponse)
async def transcribe_endpoint(
    file: UploadFile = File(...),
    prompt: str = Form(""),
):
    if stt_model_1 is None:
        raise HTTPException(
            status_code=503, detail="Model is still loading, try again shortly"
        )

    _, ext = os.path.splitext(file.filename or "")
    if ext.lower() not in ALLOWED_EXT:
        raise HTTPException(
            status_code=400, detail=f"Unsupported file extension: {ext}"
        )

    os.makedirs(TEMP_DIR, exist_ok=True)
    sound_path = os.path.join(TEMP_DIR, f"upload_{uuid.uuid4().hex}{ext}")
    try:
        contents = await file.read()
        logger.info(
            "Received upload: filename=%r ext=%s size=%d bytes -> %s",
            file.filename,
            ext,
            len(contents),
            sound_path,
        )
        if len(contents) == 0:
            # An empty upload will otherwise fail deep inside ffmpeg/PyAV
            # with a confusing decode error. Catch it here with a clear
            # 400 instead of letting it surface as a mystery 500.
            raise HTTPException(status_code=400, detail="Uploaded file is empty.")

        with open(sound_path, "wb") as f:
            f.write(contents)

        text, duration = stt_model_1.transcribe(
            sound_path,
            prompt=prompt,
            language=language,
            task=task,
            beam_size=beam_size,
            vad_filter=vad_filter,
        )
        return TranscribeResponse(
            text=text, duration_seconds=duration, model_used=stt_model_1.model_dir
        )
    except HTTPException:
        # Already a clean, intentional error (bad extension, empty file) --
        # don't re-wrap it as a 500.
        raise
    except Exception as e:
        # This is the key fix: log the FULL traceback to the server console
        # (uvicorn's console will show file/line/exception chain), not just
        # str(e) in the HTTP response. str(e) is often empty or unhelpful
        # for things like ffmpeg/CUDA errors (e.g. some raise bare
        # RuntimeError() with no message at all).
        logger.error(
            "Unhandled exception in /transcribe for file=%r prompt=%r:\n%s",
            file.filename,
            prompt,
            traceback.format_exc(),
        )
        raise HTTPException(
            status_code=500,
            detail=f"Transcription failed: {type(e).__name__}: {e}",
        )
    finally:
        if sound_path and os.path.exists(sound_path):
            try:
                os.remove(sound_path)
            except OSError as cleanup_err:
                logger.warning(
                    "Failed to remove temp file %s: %s", sound_path, cleanup_err
                )


@app.post("/grade", response_model=GradeResponse)
async def grade_endpoint(req: GradeRequest):
    if not req.expectedAnswer or not req.expectedAnswer.strip():
        raise HTTPException(
            status_code=400, detail="expectedAnswer is required and cannot be empty."
        )

    threshold = (
        req.matchThreshold
        if req.matchThreshold is not None
        else DEFAULT_MATCH_THRESHOLD
    )

    try:
        result = compute_similarity(
            req.asrText, req.expectedAnswer, match_threshold=threshold
        )
    except Exception as e:
        logger.error(
            "Unhandled exception in /grade for asrText=%r expectedAnswer=%r:\n%s",
            req.asrText,
            req.expectedAnswer,
            traceback.format_exc(),
        )
        raise HTTPException(
            status_code=500, detail=f"Grading failed: {type(e).__name__}: {e}"
        )

    return GradeResponse(
        isCorrect=result["isCorrect"],
        correctness=result["correctness"],
        matchedWords=result["matchedWords"],
        missingWords=result["missingWords"],
        wordResults=result["wordResults"],
        tokenizedAsr=result["tokenizedAsr"],
        expected=result["expected"],
    )
