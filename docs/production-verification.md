# Live production verification

Run `node scripts/verify-production.mjs` with Node.js 22+.
The default target is the main-branch Vercel URL. Override `PRODUCTION_URL` to test
another deployment, including a local server. For an authorized protected
deployment, set `VERCEL_AUTOMATION_BYPASS_SECRET` in the process environment.
Never commit or paste that secret into logs/chat. The script does not follow
authentication redirects or log cookies, response bodies, or credentials.

Results distinguish PASS, LIMITED (a fallback or prerequisite prevents full
feature verification), BLOCKED (deployment authentication), and FAIL. Exit code
is nonzero unless all checks pass. A login page, empty feed result, or controlled
authorization failure is not reported as a working core feature.

The test creates one anonymous QA reader when storage works and may persist its
daily edition and one like. It uses its own cookie, never an existing reader's
session. There is no public deletion API; administrators can remove QA data if
needed. The script does not invent news or weaken signal ownership validation.

Contracts tested:

- `/`, `/preferences`, `/onboarding`, `/paper`: HTML and HTTP 200.
- Preferences: Technology/World, readingMinutes 10, Asia/Karachi. `schedule` is
  not implemented and does not replace required fields.
- `/api/paper`: real feed articles and persisted/preview status.
- Signals: date, real articleId and `type: like` for the QA reader's saved paper.
  If unavailable, the incomplete mock `{articleId: "test-1", action: "like"}`
  must return a controlled 400; this is LIMITED, not a successful learning test.
- PDF: `/api/editions/[date]/pdf` using the same reader cookie, MIME type and
  `%PDF-` signature. Without persistence, a controlled denial is LIMITED.

Native fetch verifies HTTP contracts, not hydration, localStorage, click behavior,
visual layout, or PDF visual fidelity. Those require separate browser/PDF checks.
