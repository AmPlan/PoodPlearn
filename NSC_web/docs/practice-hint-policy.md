# Approved practice hint sequence

Owner instruction: Spontaneous replays the question once, then reveals the answer. Comprehension replays the instruction twice, then reveals the answer. Repetition plays the approved original recording at 75%, 50%, then 100% speed. Naming uses a feature cue, a verified first syllable, then the answer to repeat.

Implemented for the four training modules and, following the owner's clarification, each of the 30 standard assessment questions according to its category. The supplied 30-question membership/order stays unchanged; no new randomization or scoring rubric was added.

- Replays use owner-supplied recordings only. Repetition preserves pitch when the browser supports it.
- Cues reset with each question; revealing an answer does not submit a response or mark it correct.
- Spontaneous and Repetition submit actual cue counts instead of always sending zero.
- Personal answers require Backend data; do not substitute invented identity details.
- Naming's former first-letter text is removed. Add reviewed text under `patientAudioManifest.namingInitialSyllables[questionId]`, and/or approved recordings under `namingHints[questionId + "-2"]`.
- Naming answer recordings play on reveal when supplied. No answer recordings are activated by filename guessing.
- Standard assessment answers include the actual hint count. Image-choice reveals display the correct image without submitting it. Missing personal/contextual answers remain pending.
- Standard Naming previews reuse the matching Naming cue slots. Assessment-specific recordings may be supplied under `assessmentHints[questionId + "-1" / "-2"]` and `assessmentAnswers[questionId]`; only manifest-approved audio plays.

## Recording pack correction

The earlier `gemini-recording-pack` is an inventory, not the final cue protocol. Its Naming first-letter suggestions must not be recorded as first-syllable cues. All Naming cue wording still needs review. For Spontaneous and Comprehension, reuse the approved question/instruction recording for the repeat stages. Repetition can reuse one normal-speed recording for all three stages; no newly synthesized audio is needed.

Pending: Gemini files, verified Naming first-syllable data, patient-specific answer data, real browser/device audio-speed listening tests. Automated state tests do not verify intelligibility of slowed audio.
