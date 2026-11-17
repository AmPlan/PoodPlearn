# Naming frontend readiness

## Returning-patient flow

Patient login → existing backend assessment status → today's assigned plan → Naming introduction → 15 picture-and-voice questions → completion. The assessment gate and backend-assigned set IDs remain authoritative. Catalog/preview practice does not save real scores or complete a daily plan.

Naming and standard assessment now share the image-scene layout, heading, control spacing, image component, microphone styles, hidden numbered navigation, feedback and round-navigation hook. Naming retains its own two hints and reveal step; these are training assistance, not an assessment answer hint.

## Image audit

| Category | Set | Images loaded over HTTP |
| --- | --- | --- |
| Animals | 1 | 15/15 |
| Animals | 2 | 15/15 |
| Animals | 3 | 15/15 |
| Objects | 1 | 15/15 |
| Objects | 2 | 15/15 |
| Objects | 3 | 15/15 |
| Food/fruit/vegetables | 1 | 15/15 |
| Food/fruit/vegetables | 2 | 15/15 |
| Food/fruit/vegetables | 3 | 15/15 |

All 135 mapped image URLs returned successful image responses from the running development server. No image is missing. The original owner-supplied towel is included. Existing catalog-order tests verify all requested words, including the intentionally reversed animal set1/set2 asset folders.

## Verification

### Final Naming-only flow update

Naming uses `perQuestionFeedback: false`: once the response is accepted, a zero-delay guarded transition advances without a correct/wrong/received overlay or required Next click. The standard assessment retains its previous behavior. Encouragement at every five unique answers and unfinished-question reminders still display and auto-continue. The final milestone leads to congratulations only when all 15 responses are accepted.

The completion page now includes a quiet, collapsed “ผลการฝึกรอบนี้” detail: correct answers out of backend-evaluated answers, plus an explicit count awaiting evaluation. An ungraded local practice round says there is no system score yet. This counts backend boolean results, not a new clinical score, percentage or frontend speech evaluator. Retrying/revisiting does not add an extra response entry.

24 tests pass, including a new Naming-only 15-question run that skips 3 and 8, returns to both, emits milestones exactly at 5/10/15, prevents duplicate acceptance, and counts 10 backend-evaluated results (5 correct) separately from 5 ungraded answers. Changed-file lint passes; the existing unrelated TypeScript error remains. Real microphone/backend and browser timing of this final update have not been rechecked.

- 23 automated frontend tests pass. Added Naming coverage renders all 135 mapped pictures without premature answer text, exercises two hints then reveal, verifies fresh-item state and exactly-once real Blob submission.
- Changed-file ESLint passes.
- TypeScript retains the existing `therapistClinicalService.ts:255` `mockAnswer` error.
- The final shared-spacing update was not visually rechecked in the browser: the prior preview window was closed and its automation handle failed; the refreshed window inventory had no preview browser. Earlier browser review of the underlying design remains documented in `frontend-final-review.md`.

Audio approval/mapping, real microphone hardware, authenticated backend completion and refresh-resume remain integration limits. Image completeness does not imply complete audio or production readiness. No backend code, generated voice, replacement images or scores were added.
