# Comprehension frontend

## Content and interactions

The supplied table is implemented as 9 sets × 10 items = 90 items, separate from the standard assessment. Patient labels are เลือกภาพ / ฟังแล้วตอบ / ฟังแล้วคิด; internal difficulty labels are hidden.

- First three sets: tap one of three pictures. All 30 target pictures and their distractors reuse existing Naming assets; no new images or voice answers were substituted. Distractors are distinct pictures from the same Naming set and are shuffled by the shared assessment UI.
- Remaining six sets: tap large ใช่ / ไม่ใช่ cards using the same UI as the accepted standard assessment.
- Correct choice → “ถูกต้องค่ะ”; incorrect choice → “ไม่เป็นไรนะคะ ไปต่อกันค่ะ”, soft blue/seedling, no red result or “ผิด”. Auto-advance after the cue or confirmed audio playback; Continue is optional.
- Every five unique accepted answers receives encouragement. Skipped items remain unfinished, are listed at the end of a pass and revisited automatically. Completion requires all 10 accepted answers.
- Typed/voice answer inputs are not used for Comprehension.

The owner confirmed the correction ดื่นน้ำ → ดื่มน้ำ. “เราต้องถุงเท้าก่อนใส่รองเท้า” is preserved as supplied, pending separate wording confirmation.

## Personal questions

Names in parentheses and province examples in the table are examples, not fixed patient facts. The first five medium-set items are templates for name, gender, occupation and province (two separate province items remain). They never display the example names/provinces as actual patient information. Missing personalization displays “รอคำถามของคุณ” and no answer controls. The real introduction also waits until all personal data and approved prompt audio are ready.

`matchComprehensionSet` maps these questions by their one-based `orderIndex`, requires all remaining objective questions to match exactly, and rejects reused/duplicate backend question IDs. The proposed frontend response contract for each personalized `ComprehensionQuestion[0]` is:

```ts
{
  questionText: string; // Original template
  resolvedQuestionText?: string; // Patient-specific question, already resolved by backend
  personalizationComplete?: boolean; // Explicit backend confirmation
  resolvedQuestionAudioSrc?: string; // Approved recording matching the resolved wording
}
```

Only explicitly completed, nonblank, non-placeholder prompts can be shown. A personalized prompt never inherits a fixed template's audio. Backend must ensure resolved text, authenticated patient's profile, audio and grading all agree. The existing training-set API does not currently implement these resolved fields; this update prepares the frontend contract without changing backend/database/grading code. No profile is fabricated or sourced from therapist-only screens.

Eyes-open/closed questions and December weather require context; catalog practice does not invent correctness. The supplied objective statements have a proposed local practice answer key in the content checklist; this is not a clinical rubric. Live sessions always use backend `isCorrect`, including personal/contextual questions. An absent grading result remains ungraded and receives neutral acknowledgment.

## Backend and media boundary

Assigned sets use existing training-set/session APIs and real database IDs. Image sets must have the catalog target image as `correctImageUrl` and three distinct, known Naming picture paths; mismatches stop loading rather than silently submit a picture against a different backend answer. Answer requests contain `answerImageUrl` or `answerBoolean`, never a voice/text substitute or a client-supplied score.

All prompt recordings remain pending in `patientAudioManifest.comprehensionQuestions`. The checklist `docs/comprehension-content-checklist.csv` includes all 90 IDs, templates, original example text, proposed practice answers and suggested filenames. Personal prompts need recordings matching actual resolved wording; do not activate sample-name audio for real patients. No speech synthesis or embedded AI is added.

## Review

- Preview: `/dev/preview/comprehension` (development-only). Sets: `/dev/preview/comprehension/sets/comprehension-easy-1`, `comprehension-medium-1`, `comprehension-hard-3`.
- 33 frontend tests pass, covering exact 90-item content/order, 30 target-image mappings, distinct existing distractors, no fixed personal facts, personalization gating/mapping, actual choice submission and supportive automatic feedback. The existing shared flow tests cover milestones and skipped-item recovery.
- All 67 distinct image URLs referenced by the choice sets returned successful image responses. Library and easy/medium/hard preview routes return HTTP 200.
- Changed-file lint passes. TypeScript retains the existing unrelated `therapistClinicalService.ts:255` `mockAnswer` error.
- Chrome desktop review verified the easy-set introduction, actual Naming pictures, a deliberately non-target choice producing the soft-blue supportive cue, and automatic advancement without pressing Continue. The shared yes/no card layout was reviewed earlier in the standard assessment; this update has not been physically tested on a phone/tablet.
- Real personalized backend responses/grading, audible recordings, hardware and physical phone/tablet coverage are not yet verified. Round state is not persisted across refresh; ambiguous retry idempotency remains a backend integration concern.

Preview practice is labeled as a preview and does not create sessions or save scores. Pending personalization cannot be bypassed to finish a medium preview round. Objective catalog-practice results are local practice counts, not saved patient assessments.
