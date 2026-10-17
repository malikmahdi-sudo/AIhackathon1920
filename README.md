# The Morning Paper

A personal daily newspaper for NaSCon '26, built one committed milestone at a time.

## Run locally

Requires Node.js 22+ and npm. Developed with Node.js 24.

```sh
npm ci
npm run dev
```

Open http://localhost:3000. No API keys or environment variables are needed yet.
Choose "Make it your morning" to set preferences at `/onboarding`.

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
  types/paper.ts   Shared preference, article, edition, and signal types
data/              Local reader preferences (ignored by Git)
tests/             Preferences API integration checks
```

## Milestones

- [x] 1. Foundation: Next.js, TypeScript, Tailwind, responsive welcome page
- [x] 2. Onboarding and preference persistence
- [ ] 3. RSS aggregation and relevance scoring
- [ ] 4. Daily reading interface and historical editions
- [ ] 5. Traditional newspaper PDF from the same saved edition
- [ ] 6. Reader signals and adaptive recommendations
- [ ] 7. Architecture diagram and final documentation

The welcome page is a preview, not a live news feed. Readers can select 1–5 topics,
a 5/10/20-minute reading time, and a timezone, then save or edit their choices.
Article recommendations, archives, PDF export, and AI features are future milestones.

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

## Commit checkpoints

Pause after each working milestone, review and commit its files, then push to
`origin main` before starting the next milestone. Do not squash milestone history.
