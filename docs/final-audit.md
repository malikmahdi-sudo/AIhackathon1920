# Editorial release audit — 17 October 2026

## Feature verification

| Feature | Local evidence | Deployment dependency |
| --- | --- | --- |
| Onboarding | Validation, cookie isolation, save/load integration; browser backup and unavailable-storage tests | Supabase for durable server profiles |
| Reading and archives | Live-feed integration; immutable snapshots, archive ownership; desktop/mobile browser inspection | Supabase tables and working publisher feeds |
| PDF | PDF generation and download route tests; source links and snapshot identity | Bundled font files; Supabase to read editions |
| Learning | Weight/decay tests; signal ownership and feedback replacement integration | Supabase signals migration; browser queue must sync |
| Briefing | Source validation, refusal/outage tests; route integration; browser headline-digest check | OpenAI key/model for actual AI synthesis |

The real AI provider and deployed Vercel/Supabase project have not been verified
in this audit. A headline digest is not represented as AI-generated content.

## API and serverless audit

The implemented routes are `/api/preferences`, `/api/recommendations`,
`/api/signals`, `/api/editions/[date]/pdf`, and `/api/editions/[date]/briefing`.
Reading itself is the server-rendered `/paper` page; no `/api/paper` or `/api/pdf`
alias is required by the app. Storage uses Supabase on Vercel; local filesystem
storage is explicitly rejected. PDF font reads are read-only and output is in
memory. All routes catch provider/storage failures; sensitive filesystem errors
are not returned to clients. Reader and archive pages render a recovery state.

Onboarding returns validated choices with `persisted: false` after storage
failure and confirms a local backup before displaying browser-only success.
Other APIs retain error status when the operation did not succeed. Neither an
error-free UI nor a browser backup proves cloud persistence is configured.

## Browser recovery

- Preferences: validated browser backup, pending changes restored, bounded network waits.
- Feedback: latest feedback/click/time queued per immutable edition/story; retries
  on reconnect/revisit. Read, skip and bookmark badges survive reload. Bookmarks
  are device-only; no bookmark recommendation weight is claimed.
- Briefing: cached source-validated response or original saved headlines when offline.
- PDF: download errors offer browser print/Save as PDF from the displayed snapshot.
  Skipped stories are included in print. PDF binaries are not put in localStorage.
- Browser storage denied/full/corrupt: controls remain usable with visit-only state
  or an explicit inability-to-save message. Clearing site data removes backups.

Archives are not an offline browser database. New page loads still require a
working server. Anonymous cookie identity and serverless per-instance caches
remain MVP limitations.

## Visual design

Warm newsprint (#FDFBF7), charcoal text and navy accent; serif headlines and
sans-serif body/navigation. Masthead includes date, date-based edition identifier
and profile link. Responsive three/two/one-column layouts, thin dividers, source
pills, visible keyboard focus, reduced-motion support and print rules are included.
Feeds currently do not include an image field: decorative CSS gradient artwork
is used consistently, so there are no remote image requests or broken images.
Missing summaries retain publisher links and a readable fallback.

## Verification commands

```sh
npm run lint -- --max-warnings=0
npm test
npm run build
npm run typecheck
npm run package:release
npm run test:release
node tests/preferences-fallback.mjs
```

With the development server running:

```sh
node --test tests/preferences.mjs tests/recommendations.mjs tests/reading.mjs tests/pdf-route.mjs tests/signals.mjs tests/briefing-route.mjs
```

Before submission: verify the deployed site with Supabase, configure/test AI if
demonstrating it, replace the Loom placeholder, and confirm the submitted commit
has a green GitHub Actions run.
