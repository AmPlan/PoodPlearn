# Supportive patient practice interactions

This supersedes earlier progress-bar, manual-send, one-way skip and patient-score-display descriptions. Frontend-only; backend endpoints and grading are unchanged.

## Layout

- Open mint/white canvas without nested white cards or a border around the question image. Desktop Naming places the image left and microphone right; narrow screens stack image above microphone. Full images remain `object-contain`, up to 660 px tall on desktop and 400 px on narrow screens.
- Numbered status circles are hidden inside the “ดูข้อทั้งหมด” dialog, opened from the header (grid icon on small phones). The header retains only the current question count. Dialog targets are 48–56 px; selecting a question closes it and returns focus to the trigger. Escape also closes it.
- Green means **answered**, regardless of correctness. Pink/red is reserved for a skipped question, gray means not yet attempted, and a distinct ring indicates the current question. Labels/check icons support color-independent use.
- Repetition shows both a short “พูดตาม” caption and the actual target word/sentence in large type. Missing audio remains clearly labeled; recordings for repetition stay unavailable until approved prompt audio is supplied.

## Round workflow

1. Stop a recording → submit the real Blob once automatically (or retain the interaction locally in developer/catalog practice).
2. Show supportive feedback. Actual backend `isCorrect=true` → rainbow/mint; `false` → seedling/soft blue with “ไม่เป็นไร ไปต่อกันนะคะ”; missing correctness → neutral “รับคำตอบแล้วค่ะ”. No fabricated success/failure, red wrong-answer panels or answer text.
3. Auto-advance after feedback. An explicit Continue is also available.
4. Every five **unique answered** questions, show a randomized nonconsecutive-repeating encouragement including the actual completed count. Skips/revisits do not increment milestones. “Almost finished” is limited to the last five questions.
5. Skip is local navigation, not a scored empty submission. It stays incomplete. At the end of a pass, a supportive reminder displays only unfinished question numbers, then automatically returns to the earliest unfinished question after four seconds (or after an approved recording finishes). “ไปทำต่อ” also continues immediately. Subsequent skips visit only unfinished items. The round cannot finish until every item has a successfully accepted answer. This shared flow applies to both Assessment and Naming.
6. Completed items are read-only on revisit, preventing duplicate scoring. Item components remount on navigation to reset recording, hint/reveal and transient errors; late microphone permission is cleaned up.
7. On completion, show congratulations. Naming finalization calls the existing backend completion service automatically only after all responses were submitted. Local practice never completes a real daily plan. No scores, correct-count analytics or word-by-word correctness report are displayed to patients.

Clinical scores and progress dashboards remain in the existing therapist system. Hiding them in patient UI is not a replacement for backend access control.

## Audio integration

No new speech generation, embedded AI or unapproved audio was added. The owner supplies Gemini files later.

- `patientAudioManifest.feedback`: keys `correct`, `wrong`, `received`.
- `patientAudioManifest.remainingQuestions`: full reminder recordings keyed by the next question number, e.g. `"8"` for a recording saying to return to question 8. Empty until supplied by the owner. No generated voice or fabricated audio is used.
- `patientAudioManifest.milestones`: keys such as `great-5`, `well-done-10`, `wonderful-15`, `keep-going-20`, `proud-25` or `almost-25`. Use recordings matching the selected phrase and count exactly. All entries are initially empty.
- Without an audio file, feedback/milestone displays for 1.8/2.4 seconds. With a confirmed file, completion of playback continues the workflow, with a 20-second safety timeout and a manual Continue action. Old audio is stopped when the phase/item/page changes.

## Review and validation

Use `/dev/preview/feedback` for explicit mock correct/support/milestone panels. The development-only preview banner prevents these being mistaken for real graded results.

22 automated frontend tests pass, including skip/revisit, no early summary, exactly-once completion, all five-question milestones, nonrepeating encouragement, phase continuation, timer/audio cleanup, supportive colors, numbered navigation, Repetition target visibility, real recording submission, media/data readiness and production preview restrictions. Changed-file lint passes; project TypeScript still has the existing `therapistClinicalService.ts:255` `mockAnswer` error outside this change.

Assessment, Naming and feedback preview routes return HTTP 200. Naming visual QA now includes Chrome desktop at 1280 px and responsive emulation at 400×578 and 400×844, including the native question dialog. This is not physical-phone/tablet coverage. Real microphone hardware, audible playback and authenticated backend grading remain unverified in this review.

Remaining integration limits: no persisted resume on refresh, no new backend skip endpoint, and retries after ambiguous network failures still depend on backend idempotency. Existing missing images/audio remain pending; no replacement media or scores were invented.
