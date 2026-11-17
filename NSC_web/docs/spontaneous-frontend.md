# Spontaneous frontend

The supplied standalone Spontaneous table contains 9 sets × 10 items = 90 items. It is separate from standard-assessment Spontaneous questions. Patient groups are เรื่องของฉัน / เติมคำ / ตอบคำถามและเติมประโยค; difficulty values remain internal.

## Prompt and answer separation

`sourceText` preserves the owner's wording, order and parenthetical answers. `text` strips only the trailing parenthetical annotation for display and audio. `referenceAnswers` preserves the supplied key for content review without showing it to patients or sending it as their answer. For example, “เกลือมีรส…(เค็ม)” renders “เกลือมีรส…”. A blank is completed by speech, never a text input.

The first eight items of each personal set contain no fixed answer key. Their field metadata identifies first/last name, province, gender, occupation, birth day/month and Buddhist-calendar birth year. These prompts ask the patient to speak their answer; they do not show profile values or fictitious examples. Backend must resolve the correct answer from the authenticated patient's actual profile. The existing backend currently has name/surname/province custom resolvers; gender, occupation and birth-date scoring/format handling still need integration verification. No backend code, schema, profile data or speech-analysis code was changed.

All responses are real voice Blobs, including fill-the-blank items. Reference words, synthesized transcripts, typed answers and client-supplied grades are never submitted. Frontend uses only backend `isCorrect`; ungraded catalog/preview practice never invents a speech score. Accepted answers advance immediately, with encouragement at 5 and 10, unfinished-item reminders and automatic return before completion. Revisited answered items are read-only; retry/repeat does not count the same response twice or reuse a completed daily-plan schedule.

## Audio and readiness

All 90 question recordings remain pending in `patientAudioManifest.spontaneousQuestions`. `docs/spontaneous-audio-checklist.csv` lists the exact spoken prompt without its answer, a separate review-only answer column, field metadata and suggested filenames. Gemini prompt recordings must not read out the parenthetical answer. No Repetition or Naming recordings are silently substituted, and no speech synthesis is added.

The real introduction waits for approved prompt audio. Development preview can open a set with pending audio and record a spoken response to the visible question, as in standard-assessment Spontaneous. The missing audio is explicit and playback is disabled. This is different from Repetition, where recording remains blocked without an approved word/sentence to repeat. Preview does not create backend sessions, transmit recordings or save patient scores.

## Routes and verification

- Library: `/dev/preview/spontaneous`
- Sets: `/dev/preview/spontaneous/sets/spontaneous-easy-1`, `spontaneous-medium-1`, `spontaneous-hard-3`
- Production routes under `/patient/training/spontaneous` use the existing assessment gate. Daily-plan routing supports all four training categories.
- Backend adapter requires a one-to-one match of ten `SPONTANEOUS` questions, rejects duplicate/wrong-category sets, maps real IDs in catalog order, and accepts database prompt text with or without the supplied answer annotation.
- 36 frontend tests pass, including exact 90-item order, annotation removal, 24 personal-answer fields without guessed answers, all 90 rendered prompts, no typed substitute, exactly-once real voice submission and strict API mapping. The shared flow tests cover ten-item milestones, skipped-item recovery and completion gating.
- Changed-file lint passes. Library and three sample set routes return HTTP 200. TypeScript retains the existing unrelated `therapistClinicalService.ts:255` `mockAnswer` error.
- Chrome desktop review verified the fill-word introduction and training screen: “เกลือมีรส…” is large, “เค็ม” is absent, the microphone is available in preview and pending playback is visibly disabled. Real audio capture was not exercised during this visual review.

Real microphone hardware, audible Gemini playback, authenticated grading/completion and physical mobile/tablet coverage remain unverified. Backend sets must contain the correct questions/IDs and grading rules, including accepted alternative answers/number formats. Refresh resume is not implemented; ambiguous network retry idempotency remains a backend concern.
