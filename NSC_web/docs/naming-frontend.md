# Naming Frontend — 17 November 2026

> Updated patient UI and voice-only workflow: see [patient-workflow.md](patient-workflow.md). The original implementation notes below describe the earlier version where they conflict.

## Screens and scope

- `/patient/training/naming`: introduction and existing daily-plan service; no assessment-based recommendation is fabricated.
- `/patient/training/naming/animals`: library of all nine sets (legacy URL retained).
- `/patient/training/naming/sets/easy-1` through `hard-3`: set introduction, local practice and round summary. Medium set 3 is blocked pending a missing image.
- `/patient/training/naming/assigned/[setId]?schedule=...`: introduction for an actual API set; creates a session using the existing frontend service on Start.
- `/patient/training/naming/session/[sessionId]`: existing plan/session flow, with an introduction before practice.
- Legacy `/animals/[setId]` supports catalog IDs and actual numeric database IDs.

Only frontend files, documentation and frontend tests were changed. No database, API routes, grader or OAuth changes.

## Data and media

`src/features/training/data/namingCatalog.ts` contains the exact 135 words and their requested order, feature hints, first-consonant hints, and existing asset paths.

- 9 sets × 15 questions; 3 difficulty levels.
- 135 matching images available. The owner-supplied **ผ้าเช็ดตัว** is stored at `equipments/set3/towel.png`; all nine sets have complete images.
- Medium set 3 has 14/15 images and cannot start, including via a direct URL.
- Animal displayed set 1 uses the existing `animals/set2` files; displayed set 2 uses `animals/set1`. Files were not renamed or replaced.
- Kettle and soap use the accepted original images.
- `phone.png` is used for โทรศัพท์; the extra `telephone.png` is not an additional question or substitute for ผ้าเช็ดตัว.
- Images were visually inspected in nine contact sheets. Some `.png` files contain JPEG data; originals were preserved, and Next Image optimization was checked with the dog image.
- Image display uses `object-contain`, with a neutral question alt label before reveal.
- Existing prompt: `training_sounds/Naming_Question.wav`.
- Existing answer audio: 134 files matched by the exact image stem/folder. No towel answer audio exists. WAV headers, file existence and HTTP delivery were checked.
- Audio only plays on the explicit “ฟังโจทย์” / “ฟังเสียงเฉลย” controls. No speech synthesis, new AI audio, hint narration, milestone voices, navigation narration or autoplay was added.
- Audio is stopped on question change, recording start and unmount. Microphone streams are also stopped after a late permission response if the page was left.
- Listening to every audio file, verifying spoken content and establishing Gemini provenance remain **unverified**; filename correspondence is not proof of spoken content.

## Practice and integration behavior

The interaction follows answer → feature hint → initial-character hint → reveal, with Skip and explicit Next. Reveal unlocks after two hints. States reset per question; synchronous locks plus a short action guard prevent rapid repeated navigation. Recording uses the browser's actual supported MIME type, not a WAV label on WebM bytes.

Library practice keeps answers, recordings and the summary only in component memory. It never sends recordings, marks daily plans complete or computes speech scores. Refreshing/leaving loses this local round.

Assigned sets are matched by all 15 unique answers, then paired with actual backend question IDs in the requested catalog order. Numeric database IDs are never inferred from set numbers. Unmatched sets fail visibly instead of showing unrelated media.

Existing API integration:

- `getTodayTrainingPlan` uses the project's existing daily-plan service (including its existing POST behavior).
- Session creation and lookup use `createNamingSession` / `getNamingSessionById`.
- Answer submission uses `submitNamingAnswer`; only an actual boolean `isCorrect` response is displayed as a correctness result.
- The existing answer endpoint does not define a separate skipped response. Skip and unsubmitted reveals therefore remain local round events. No empty answer is submitted as a fabricated wrong score.
- Summary reports only this round's events, and the latest successful backend result per question when available. A retry does not erase an earlier successful submission.
- Completing a backend session is an explicit summary action available only when all 15 questions have a successful submission. Otherwise the UI states that the daily plan has not been confirmed complete.
- Practice Again uses a fresh round and, for assigned sets, a fresh session; it does not reuse a completed session or complete the original schedule twice.

Backend follow-up: explicit skip/reveal recording, idempotency for answer retries after ambiguous network failures, persisted resume, and confirmed canonical set/media associations. These were not implemented as backend work.

## Validation

- `node --test scripts/naming-frontend.test.mjs`: 8 passing tests covering exact lists/order, IDs, asset signatures, readiness, strict backend mapping, real/unknown summary results, first/last question, hints/reveal, rapid navigation, state reset, repeat/back controls, microphone denial, MIME type, late permission cleanup, and audio cleanup.
- UI event tests use an isolated React hook harness; they do not replace browser testing.
- All 269 declared static assets (134 images + 134 answer WAVs + prompt WAV) returned HTTP 200.
- Introduction, library, easy-set entry, incomplete-set entry and a Next optimized image returned HTTP 200.
- Lint for changed Naming frontend files and the test script passes.
- Full `npm run lint` still reports 13 existing errors and 12 warnings outside the changed Naming files (API `any` annotations, assessment component declaration order, etc.).
- `npx tsc --noEmit --incremental false` still reports the existing `mockAnswer` error in `src/features/therapist/services/therapistClinicalService.ts:255`.
- Browser automation was stopped by the user's physical Escape key before Naming could be inspected. **Desktop/tablet/mobile visual QA, real browser clicks, microphone hardware, audible Thai media verification and authenticated end-to-end backend integration are not tested.** Responsive Tailwind layouts are implemented, but device coverage is not claimed.
