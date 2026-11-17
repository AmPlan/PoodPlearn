# Repetition frontend

The owner-supplied standalone Repetition catalog contains 9 sets × 10 items = 90 items. Wording/order are preserved exactly, including numbers, “เด็กๆไปเดินเล่น”, “เก่าเก่า”, and the different final sentences ending ชัดขึ้น / เก่งขึ้น. This is separate from the 7 Repetition items in the standard assessment.

## Patient flow

The existing assessment-status gate protects `/patient/training/repetition`. Returning patients enter through their backend-assigned daily plan. The frontend loads the real set, requires exact one-to-one matching of 10 Repetition questions to a catalog set, maps real IDs in catalog order, starts a session, sends a real voice Blob per item, and calls completion only after all answers are accepted. No database seeds, API handlers, grading or backend permissions were changed.

Patient labels are คำ / วลี / ประโยค, never ง่าย / ปานกลาง / ยาก. The training screen shows a large target word/sentence, large microphone and replay control. It shares Naming's mint theme, media cleanup, hidden numbered navigation, supportive five-answer milestones, unfinished-item reminders and automatic progression without a per-answer feedback overlay. Revisited answered items are read-only. Repeat starts a fresh round and does not reuse the daily-plan schedule.

The initial listen button plays the owner's approved prompt recording. Recording requires an approved audio entry; without one, the mic and playback button stay disabled and “ยังไม่มีเสียงโจทย์” is shown. No speech synthesis, images or Naming recordings are substituted. The patient can skip to inspect later questions in preview; an all-skipped round cannot finish.

## Audio handoff

All 90 standalone prompt recordings are pending. `docs/repetition-audio-checklist.csv` lists the exact text, stable question ID and suggested filename for each. Map supplied recordings in `patientAudioManifest.repetitionQuestions` by question ID, e.g. `repetition-easy-1-1`. Verify the spoken content and local file before mapping. Assessment recordings remain in the separate `assessmentQuestions` dictionary.

The real introduction prevents starting an incomplete audio set. Development preview allows opening the screen for review, but still prevents recording without approved audio. Library readiness is explicit. This is not complete production/audio readiness.

## Preview and checks

- Library: `/dev/preview/repetition`
- Example: `/dev/preview/repetition/sets/repetition-easy-1`
- Longer sentences: `/dev/preview/repetition/sets/repetition-hard-3`
- Preview is development-only, never creates backend sessions, never submits recordings or grades.
- 28 frontend tests pass, including exact 90-item ordering, strict backend set matching, real multipart voice submission, blocked recording without audio, no typed substitute/difficulty labels, and a 10-item round with skipped-item recovery and milestones at 5/10.
- Changed-file ESLint passes. TypeScript retains the existing unrelated `therapistClinicalService.ts:255` `mockAnswer` error.
- Preview library and example sets return HTTP 200. Authenticated backend sessions, microphone hardware, audible playback and physical phone/tablet coverage remain unverified. Backend content must independently contain the correct Repetition sets/IDs.
- Chrome desktop visual review covered the sentence-set introduction and practice screen, including the large target, disabled mic/playback without audio, hidden navigation and visible Skip control. Final speech timing remains unverified until the owner supplies recordings.

Frontend state is in memory; refresh-resume is not implemented. Network retry idempotency remains a backend concern. No fake clinical scores are generated.
