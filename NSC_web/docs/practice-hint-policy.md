# Approved practice hint sequence

Owner instruction: Spontaneous replays the question once, then reveals the answer. Comprehension replays the instruction twice, then reveals the answer. Repetition plays the approved original recording at 75%, 50%, then 100% speed. Naming uses a feature cue, a verified first syllable, then the answer to repeat.

Implemented for the four training modules. The standard assessment's existing hints remain separate; this change does not silently redefine a standardized assessment protocol.

- Replays use owner-supplied recordings only. Repetition preserves pitch when the browser supports it.
- Cues reset with each question; revealing an answer does not submit a response or mark it correct.
- Spontaneous and Repetition submit actual cue counts instead of always sending zero.
- Personal answers require Backend data; do not substitute invented identity details.
- Naming's former first-letter text is removed. Add reviewed text under `patientAudioManifest.namingInitialSyllables[questionId]`, and/or approved recordings under `namingHints[questionId + "-2"]`.
- Naming answer recordings play on reveal when supplied. No answer recordings are activated by filename guessing.

## Recording pack correction

The earlier `gemini-recording-pack` is an inventory, not the final cue protocol. Its Naming first-letter suggestions must not be recorded as first-syllable cues. All Naming cue wording still needs review. For Spontaneous and Comprehension, reuse the approved question/instruction recording for the repeat stages. Repetition can reuse one normal-speed recording for all three stages; no newly synthesized audio is needed.

Pending: Gemini files, verified Naming first-syllable data, patient-specific answer data, real browser/device audio-speed listening tests. Automated state tests do not verify intelligibility of slowed audio.
