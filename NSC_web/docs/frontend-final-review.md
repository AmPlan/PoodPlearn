# Patient frontend review — 17 November 2026

## Confirmed interaction contract

| Assessment items | Interaction |
| --- | --- |
| 1–6 Spontaneous | Record the patient's spoken answer; no typed substitute |
| 7–10 Comprehension images | Tap a picture; target and distractors are shuffled together |
| 11–16 Comprehension yes/no | Tap one of two large, separated cards; no microphone |
| 17–23 Repetition | Display the actual word/sentence and record speech; approved prompt audio is required |
| 24–30 Naming | Display the full picture and record its name; no answer shown initially |

Item 19 remains “โทรศัพท์”, matching the supplied 30-item specification. The chair item includes chair/table/bed. No answer content, question order or backend rubric was changed during polish.

Naming training retains 9 sets × 15 words, exactly 135 entries. All nine sets now have all 135 images, including the owner-supplied towel added on 17 November 2026. Image readiness does not imply audio/backend readiness. This does not claim all four standalone training modules are implemented: current daily-plan UI exposes Naming and explicitly marks unsupported modules unavailable. The assessment itself includes all four categories.

## Polish and workflow

- Slightly deeper mint canvas distinguishes white cards without adding nested frames. Full images use `object-contain`.
- Yes/no cards use the available width, large icons and a larger gap; image choices still submit a selected image, never a fabricated voice response.
- Numbered navigation stays hidden until opened. Skip never counts as a completed answer.
- At the end of a pass, a reminder shows only unfinished numbers and automatically returns to the first. Skipping advances among unfinished questions; completion requires all accepted answers.
- Feedback advances automatically; Continue remains optional, matching the restored workflow. Five unique answers trigger encouragement. Patient completion does not expose a fabricated speech score.

## Evidence and limits

- 22 frontend tests pass, including catalog order/media checks, all interaction modes, actual Blob submission once, microphone permission failure/cleanup, 30-item skip-8/15 recovery, milestones and completion gating.
- Changed-file ESLint passes. Whole-project lint has 12 existing errors in API/daily-plan files. TypeScript still fails at `therapistClinicalService.ts:255` because of `mockAnswer`.
- Chrome desktop/narrow desktop review verified chair/table/bed, image-answer submission and automatic advancement, and enlarged yes/no cards against the new background. Earlier responsive emulation covered Naming at 400×578 and 400×844. These are not physical-device tests or clinical usability validation.
- No real patient data was submitted. Authenticated PN login, backend grading, real microphone hardware, audible recordings and production deployment were not end-to-end tested in this review.
- Approved Gemini question, hint, answer, feedback and reminder recordings remain incomplete. Repetition waits for approved audio. No speech synthesis or new AI runtime was introduced.
- The 30-item blueprint is complete in development preview; the real assessment still uses backend-supplied questions and IDs. Backend content parity and scoring must be verified separately.
- Round state is not persisted across refresh, and retry idempotency after ambiguous network failures remains a backend integration requirement.

This is a reviewed frontend handoff with explicit integration gaps, not a claim that every system is production-ready.
