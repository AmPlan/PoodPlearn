# Standard assessment frontend content

This update supersedes earlier three-question preview and unverified audio wiring notes.

The developer preview now uses the owner's complete ordered 30-item list from `standardAssessmentBlueprint.ts`:

| Questions | Category | Interaction |
| --- | --- | --- |
| 1–6 | Spontaneous | Real recording, no typing |
| 7–10 | Comprehension | Choose an image |
| 11–16 | Comprehension | Yes / No |
| 17–23 | Repetition | Repeat after a supplied recording |
| 24–30 | Naming | Name the displayed image using a real recording |

Question count and ordering are tested. Parenthesized answers from the supplied table are stored separately from prompt text. Naming prompts do not show the answer. No invented hints are inherited from the Naming training library into the standard assessment.

## Authorized distractors

Owner authorized choosing distractors. Existing user images were reused; no new images were generated or replaced. Choice positions are shuffled by the existing session UI. Patient-facing image labels are neutral and do not identify correct/wrong choices.

| Question | Target | Distractors |
| --- | --- | --- |
| 7 | กล้วย | แอปเปิ้ล, ส้ม |
| 8 | เก้าอี้ | โต๊ะ, เตียง |
| 9 | แมว | หมา, กระต่าย |
| 10 | พัดลม | โทรทัศน์, ตู้เย็น |

All seven Naming targets and all twelve choice images have matching existing files.

## Prerecorded audio only

The owner will download Gemini recordings and supply them later. No speech synthesis, embedded AI or new AI API is used. Login has been shortened to role icons, PN input, primary action, and the Google button.

`patientAudioManifest.ts` is the explicit activation list. Currently only `/training_sounds/Naming_Question.wav` is active as a shared question prompt for questions 24–30. The assessment question slots 1–23 are unfilled. Do not assume that other WAVs already in the repository are approved or contain the right utterance.

- Fill `assessmentQuestions["standard-ui-1"]` … `["standard-ui-23"]` with supplied local paths after checking spoken content and order.
- Naming hint recordings can later be mapped in `namingHints` using catalog question ID + hint number, e.g. `easy-1-1-1` for the first hint of that question. No unverified hint recording was activated.
- Answer and navigation/milestone clips previously wired by filename have been suspended, without deleting any files. Standard assessment no longer prepends the unapproved image-choice intro sound.
- Naming answer playback remains inactive until its manifest entries are explicitly supplied.
- Repetition without approved audio visibly waits for audio and does not accept a meaningless repeat response. Developer preview can Skip to inspect later screens. Other missing audio is shown explicitly, and unavailable playback controls are disabled.

## Scoring and backend boundary

This is a frontend blueprint with frontend IDs, not a database seed. The real patient route still uses backend questions/IDs; backend data must be populated/mapped to this specification separately. Preview answers and recordings are never sent to backend endpoints.

Only supplied expected answers are retained. Personal name, surname, province, and personalized yes/no outcomes are not fabricated. There is no frontend scoring rubric or fake assessment result. The owner has not supplied a scoring policy for the remaining items; backend scoring remains authoritative.

## Validation

- 14 frontend tests pass, including exact 30-item ordering, category counts (6/10/7/7), distinct choices with exactly one target, asset presence, no inherited assessment hints, and explicit audio activation.
- Lint passes for the changed files. TypeScript retains the pre-existing therapistClinicalService.ts:255 `mockAnswer` error outside this work.
- This update has not been visually or audibly verified in a browser/on physical devices. File existence and automated tests do not establish clinical validity or audio readiness.
