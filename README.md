# The Morning Paper

A personal daily newspaper for NaSCon '26, built one committed milestone at a time.

## Run locally

Requires Node.js 22+ and npm. Developed with Node.js 24.

```sh
npm ci
npm run dev
```

Open http://localhost:3000. No API keys or environment variables are needed yet.
Choose "Read your morning paper". New readers are sent to `/onboarding` first.
Returning readers can open `/paper`, browse `/archives`, and edit preferences anytime.

```sh
npm run typecheck
npm run lint
npm run build
npm start
```

Run `build` before `start`. The lockfile pins installed dependencies.

## Structure

```text
src/
  app/             App Router pages, root layout, global styles
  components/      Masthead, feature card, and interactive onboarding form
  lib/             Preference validation and server-only JSON persistence
    news/          Feed sources, parsing, caching, deduplication, and ranking
    editions/      Immutable daily snapshots and archive storage
  types/paper.ts   Shared preference, article, edition, and signal types
data/              Local reader preferences and editions (ignored by Git)
tests/             Offline engine tests and live integration checks
```

## Milestones

- [x] 1. Foundation: Next.js, TypeScript, Tailwind, responsive welcome page
- [x] 2. Onboarding and preference persistence
- [x] 3. RSS aggregation and relevance scoring
- [x] 4. Daily reading interface and historical editions
- [ ] 5. Traditional newspaper PDF from the same saved edition
- [ ] 6. Reader signals and adaptive recommendations
- [ ] 7. Architecture diagram and final documentation

Readers can select 1–5 topics,
a 5/10/20-minute reading time, and a timezone, then save or edit their choices.
Recommendations are available through `/api/recommendations` after onboarding.
The daily paper and archives are available. PDF export and AI synthesis are future milestones.

MVP persistence uses one JSON file per reader on a single Node.js server with a
writable disk. Writes are serialized within the process and files are replaced
atomically. Ephemeral/serverless or multiple-instance hosting requires persistent
storage such as Supabase. Never commit reader data or secret keys.

An opaque random reader ID in an HttpOnly, SameSite cookie identifies the browser;
HTTPS requests also receive the Secure flag. This is an anonymous MVP, not account
authentication. Clearing cookies loses access to that profile; different devices
do not sync. The API validates all preference fields and checks the request origin
before saving. Timezone selection dates editions; it does not schedule delivery.

With `npm run dev` running on port 3000, run the integration checks in a second terminal:

```sh
node --test tests/preferences.mjs
```

Checks cover invalid inputs, cross-origin rejection, cookie isolation, disk
persistence, updates, and returning-reader rendering. Test-created profiles are removed.

## Content engine (Step 3)

`GET /api/recommendations` uses the reader cookie and saved preferences. It returns
ranked articles, matching topics, reasons, publisher links, a local edition date,
and per-feed availability. It returns 401 before onboarding and 503 if every feed
is unavailable. A successful response can have no matches, with an explicit message.
This is an on-demand recommendation preview; it does not save a daily edition yet.

- Sources: BBC News/Sport, The Guardian (AI and climate), and Dawn (Pakistan),
  configured in `src/lib/news/sources.ts`. No API keys or user-provided feed URLs.
- RSS/Atom input is limited to 2 MB per feed and 100 entries; fetches time out after
  10 seconds. Redirects and XML entity declarations are rejected.
- Article links must belong to the configured publisher domains. HTML is reduced
  to plain text, publisher excerpts are capped at 400 characters, tracking parameters
  are removed, and duplicate URLs or normalized titles are merged. No full-text scraping.
- Missing dates, dates more than 5 minutes in the future, and articles older than
  7 days are excluded. No synthetic news or fabricated publication timestamps.
- Feed categories provide topic tags; keyword matching adds AI and climate tags.
  Each matching interest adds 100 points, and freshness adds up to 20 points with
  a 48-hour exponential decay. Selection subtracts 12 points per already selected
  story from the same publisher to encourage variety. Returned `score` is the base
  score before this selection penalty. Unrelated stories are excluded.
- Reading budgets use a clearly labeled estimate of 3 minutes per original article:
  5/10/20-minute preferences select at most 1/3/6 articles. This is not measured reading time.
- Public feed results are cached in memory for 15 minutes, concurrent refreshes are
  shared, and failed refreshes can use a cache up to 6 hours old marked `stale`.
  Failures retry after 60 seconds. Restarting the server clears the cache.
- Personalized API responses are private and never cached. Learning from reader
  signals will be added in Step 6; ranking currently uses explicit preferences only.

Run deterministic tests without a server or internet:

```sh
npm run test:news
```

Live publisher smoke test (internet required):

```sh
npm run test:news:live
```

With the dev server running on port 3000, test the API end-to-end:

```sh
node --test tests/recommendations.mjs
```

The live tests depend on publisher availability. Offline tests cover RSS/Atom parsing,
unsafe input, duplicate merging, ranking, budgets, partial outages, cache expiry,
oversized feeds, and timeouts. Publisher content remains attributed to its source;
review each publisher's feed terms before public/commercial deployment.

## Daily reading and archives (Step 4)

- `/paper` creates an edition on the first visit for the reader's local date. Later
  visits return the identical saved snapshot without needing news feeds. No background
  scheduler is implemented; days never visited do not get an edition.
- `/archives` lists the reader's saved editions newest first; `/archives/YYYY-MM-DD`
  opens one. Archive access always uses the browser's reader cookie, never a reader ID
  from the URL. Invalid dates or editions belonging to another reader show not found.
- Editions store article excerpts, original publisher links, recommendation reasons,
  and a snapshot of preferences and timezone. Changes to preferences affect the next
  unsaved local date; today’s saved paper is not rewritten. Changing timezone may
  select a different calendar date, while existing date-keyed snapshots remain intact.
- Files live in `data/editions/` and are excluded from Git. A complete temporary file
  is published with an atomic filesystem hard link, so concurrent requests cannot
  overwrite a day's winner. This requires a local filesystem supporting hard links
  (tested on Windows NTFS); migrate to transactional database storage for deployment.
- Empty matches or total source outages are never saved as editions. Loading, empty,
  retry, storage-error, and missing-archive states are included.
- The reading page presents publisher excerpts and opens original articles in new
  tabs; PDF downloads and reader-signal tracking arrive in the following milestones.

```sh
npm run test:editions
```

These offline tests cover local-date boundaries, concurrent creation, immutable
snapshots, reloads, reader isolation, archive order, and empty/outage retries.
With the dev server on port 3000 and internet available:

```sh
node --test tests/reading.mjs
```

This integration test exercises onboarding redirects, first-read creation, archive
navigation, unchanged editions after preference edits, and cross-reader isolation.

## Commit checkpoints

Pause after each working milestone, review and commit its files, then push to
`origin main` before starting the next milestone. Do not squash milestone history.
