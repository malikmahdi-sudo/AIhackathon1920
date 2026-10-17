# Five-minute demonstration and submission guide

## Before recording

Run `npm ci` and `npm run dev` in the repository root. Use local mode for a demo
without cloud setup. Keep internet available for the first edition; saved editions
can be reopened without feed access. Use a fresh browser profile for onboarding.
Do not delete existing reader data to reset a demonstration.

If demonstrating Vercel, first apply both Supabase migrations, configure its
server-only environment variables, deploy, and verify persistence across redeploys.
Do not describe a local demo or CI artifact as a deployed service.

## Recording outline (under five minutes)

| Time | Demonstration |
| --- | --- |
| 0:00–0:30 | Explain scattered news and the goal of one personal morning paper. |
| 0:30–1:10 | Select interests, reading time, and timezone; save preferences. |
| 1:10–2:00 | Open the daily edition; explain source attribution and match reasons; open an original article. |
| 2:00–2:40 | Download the PDF; show matching headlines, newspaper columns, and source links. |
| 2:40–3:15 | Reopen the same edition through archives; explain immutable daily snapshots. |
| 3:15–3:50 | Like/dislike or skip a story and undo feedback. Explain that future rankings change, not today's saved paper. |
| 3:50–4:30 | Show the architecture diagram and local/Supabase storage boundary. |
| 4:30–4:55 | Show milestone commits and the successful CI run for the submitted commit. |

For immediate learning evidence, the recommendation preview at `/api/recommendations`
recalculates scores. Do not promise an obvious reorder from one click: bounded
feedback competes with interest matches, recency, and source diversity.
The automated learning test demonstrates score-driven reordering deterministically.

## Verification commands

```sh
npm run lint
npm test
npm run build
npm run typecheck
npm run package:release
npm run test:release
```

With a local dev server on port 3000, run integration checks separately:

```sh
node --test tests/preferences.mjs tests/recommendations.mjs tests/reading.mjs tests/pdf-route.mjs tests/signals.mjs tests/briefing-route.mjs
```

Recommendation and reading integration tests need working live feeds. Tests create
and remove their own profiles; do not run filesystem-based integration tests against
Supabase mode. CI runs deterministic tests and a packaged-server smoke test instead.

## Submission checklist

- [ ] Repository visibility is public and its submitted URL is correct.
- [ ] Final milestone is committed and pushed; latest submitted SHA has green CI.
- [ ] Loom video is under five minutes and its viewing permissions work.
- [ ] Architecture diagram is included; see `architecture-diagram.svg` and `architecture.md`.
- [ ] Demonstrated PDFs and archives correspond to the same saved edition.
- [ ] Any live deployment URL has been tested in a fresh browser.
- [ ] Report limitations honestly: anonymous identity, on-demand daily generation,
  rule-based learning, Latin PDF fonts, and pending cloud verification if not completed.

The project brief asks for the public repository, Loom video, and architecture
diagram. This guide does not upload or submit any materials on your behalf.

## Room to Explore demo

Show **Create my briefing** on an archive. With credentials it returns an AI
briefing; without them demonstrate the honestly labeled headline digest. Open a
source link and show that the paper and PDF retain their original content.
Budget about 30 seconds for this within the five-minute recording.
