# Program quality review — 2026-11-17

This review supersedes earlier reports of TypeScript/lint failures.

## Completed

- `npm run check`: ESLint without warnings/errors, Next route type generation, TypeScript and 40 automated tests passed.
- `npm run build`: production build passed (41 static pages).
- Local production HTTP checks: login `/` returned 200; development previews returned 404; anonymous assessment/session CSV exports returned 401.
- Clinical CSV exports now require a therapist session and escape spreadsheet formula prefixes in text cells.
- Missing clinical data stays ungraded. Failed requests no longer look like empty patient histories. Invalid patient IDs cannot drop the patient filter.
- Browser-local review notes cannot overwrite backend grades, transcripts or recordings. Storage failures are shown.
- Production authentication requires AUTH_SECRET. Generated Next/TypeScript files are excluded from version control.
- Removed unused imports and a training-plan debug log. No database schema, clinical scoring rules or exercise content changed.

## Still required

- Supply and verify Gemini recordings; see `gemini-recording-pack/README.md`. No synthetic speech was added.
- Agree on remaining hints and clinically review the Naming cue hierarchy.
- Connect and verify patient-specific prompts, real speech grading and assigned training plans with Backend.
- Test real PN/Google authentication, microphone permissions and uploads on physical phones/tablets/computers. This review does not establish physical-device compatibility.
- Verify full live Backend workflows, refresh/resume and network retry idempotency. Therapist review notes are browser-local until persistence is connected.

Automated tests and local production HTTP checks are not a substitute for clinical review or end-to-end testing with the real services. No new browser visual/hardware test was performed in this quality-fix pass.
