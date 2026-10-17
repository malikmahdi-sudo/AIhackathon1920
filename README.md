# The Morning Paper

A personal daily newspaper for NaSCon '26, built one committed milestone at a time.

## Run locally

Requires Node.js 22+ and npm. Developed with Node.js 24.

```sh
npm ci
npm run dev
```

Open http://localhost:3000. Step 1 needs no API keys or environment variables.

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
  components/      Reusable masthead and feature card
  lib/             Future server modules (storage, feeds, ranking, PDF)
  types/paper.ts   Shared preference, article, edition, and signal types
data/              Future local JSON data (ignored by Git)
```

## Milestones

- [x] 1. Foundation: Next.js, TypeScript, Tailwind, responsive welcome page
- [ ] 2. Onboarding and preference persistence
- [ ] 3. RSS aggregation and relevance scoring
- [ ] 4. Daily reading interface and historical editions
- [ ] 5. Traditional newspaper PDF from the same saved edition
- [ ] 6. Reader signals and adaptive recommendations
- [ ] 7. Architecture diagram and final documentation

The welcome page is a preview, not a live news feed. Personalization, archives,
PDF export, and AI features are not implemented in Step 1.

Planned MVP persistence uses local JSON on a single Node.js server with a writable
disk. It will require serialized writes; ephemeral/serverless hosting will require
persistent storage such as Supabase. Never commit reader data or secret keys.

## Commit checkpoints

Pause after each working milestone, review and commit its files, then push to
`origin main` before starting the next milestone. Do not squash milestone history.
