# Storage setup: local development and Supabase on Vercel

## Structure

```text
.github/workflows/ci.yml       Checks every branch push and PRs into main
.env.example                  Configuration template; no credentials
src/lib/storage/
  types.ts                    Shared five-method persistence contract and keys
  config.ts                   Driver selection and deployment guards
  index.ts                    Lazy server-only entry point
  local.ts                    JSON adapter; existing data layout preserved
  supabase.ts                 Supabase PostgREST adapter with bounded requests
src/lib/preference-store.ts   Cookie identity and preference service
src/lib/editions/store.ts     Daily edition generation independent of persistence
src/lib/editions/service.ts   Storage-backed edition access
supabase/migrations/
  202610170001_storage.sql     PostgreSQL schema, constraints, permissions, RLS
tests/storage.test.ts         Shared adapter contract and mocked REST checks
```

The existing Next.js app and completed features are retained. Routes and components
use the services, never the database directly. Both adapters implement preference
reads/upserts, edition reads/listing, and insert-if-absent edition writes.

## Instant local testing

No account is needed. With no environment variables, the app uses `data/*.json`
and `data/editions/*.json`, preserving existing reader cookies and saved files.
Run `npm run dev`. Optionally copy `.env.example` to `.env.local` and leave
`STORAGE_DRIVER=local`. Restart the dev server after changing drivers.

Local JSON requires a writable persistent disk and one application process for
serialized preference updates. It is not a fallback for an unavailable cloud database.

## Connect a Supabase project

1. Create your own Supabase project (the Free plan can be used for this MVP).
2. In its SQL editor, run `supabase/migrations/202610170001_storage.sql` once.
   Then run `supabase/migrations/202610170002_signals.sql` for reader learning.
   Alternatively apply both with your normal Supabase migration workflow.
3. Ensure the Data API is enabled for the `public` schema. Set these server-only
   variables in `.env.local` for local cloud testing, or Vercel Project Settings →
   Environment Variables for Preview/Production:

```dotenv
STORAGE_DRIVER=supabase
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

Use the project's server-side service-role JWT key, not an anon/publishable key.
Do not paste real keys into chat, commit them, or prefix them with `NEXT_PUBLIC_`.
There is no browser Supabase client. The server sends REST requests over HTTPS;
no TCP PostgreSQL connection or native SQLite dependency is required.

Tables have RLS enabled, no public policies, and explicit grants for `service_role`.
The service-role key bypasses RLS, so the server always scopes reads to the reader
ID from its HttpOnly cookie. This remains an anonymous browser-identity MVP, not
Supabase Auth or cross-device sign-in. Treat the reader cookie as a bearer credential.

`reader_preferences` uses a UUID primary key and JSONB preference payload.
`daily_editions` uses `(reader_id, edition_date)` as a composite primary key and
stores the complete edition snapshot in JSONB. Conflict-ignore insertion preserves
the first edition across concurrent Vercel instances; it never updates an edition.
Preference writes are last-write-wins. Archive reads paginate in batches of 100.

Changing drivers does not migrate data: local files stay on disk, and an empty
Supabase project starts with no profiles or archives. Complete onboarding again
on the target host, or implement an explicit migration before moving real reader data.

## Vercel configuration

Import the existing GitHub repository using the Next.js preset, Node.js 24,
`npm ci` for installation, and `npm run build` for the build. Use the root directory
containing `package.json`; leave the output directory at the framework default.
The app uses normal Next.js output on Vercel and standalone output for CI/local packaging.

Set all three variables above for each deployed environment and redeploy after
changes. Do not carry `STORAGE_DRIVER=local` into Vercel. When `VERCEL` is present,
the app defaults to Supabase and rejects local storage. Missing credentials or
database failures return errors; there is no silent fallback to ephemeral files.
RSS cache is best-effort in-memory per function instance; preferences and editions
are persistent in Supabase. Article generation remains on demand, not scheduled.

After connecting, verify: save preferences, open today's paper, revisit its archive,
restart/redeploy, and confirm the same browser sees the same edition. A fresh browser
must not see another reader's archive. No Supabase project or Vercel deployment has
been created by this code change, and a real database connection is not yet verified.

## CI and tests

`npm test` runs shared local-adapter and mocked Supabase-REST contract tests plus
the existing news/edition tests. It covers updates, reader isolation, immutable
concurrent editions, pagination, configuration guards, and error handling.
Mocks verify request semantics; they do not substitute for applying the SQL and
testing PostgreSQL/RLS against a real Supabase project. CI needs no database secrets.

References: [Supabase Data API security](https://supabase.com/docs/guides/api/securing-your-api),
[Supabase upserts](https://supabase.com/docs/reference/javascript/upsert).

## Browser preference backup

Onboarding backs up validated choices in localStorage. Pending browser choices
take precedence on reload; otherwise server preferences are preferred. If the
server read fails or returns no profile, the browser backup restores the form.
Blocked/quota-limited browser storage is handled without crashing.

When a server read or write fails during save, the API returns HTTP 200 with
`persisted: false` and the validated choices. It does not issue a new reader
cookie. The UI confirms browser-only saving only after localStorage succeeds,
and always offers Read my paper alongside editing/retry. The API includes
`success: true, synced: false, message: "Saved locally"` for the browser fallback.
The server cannot write localStorage itself: the client confirms that backup.
The reading link is also available for restored or locally selected preferences.
Navigation alone does not sync preferences or make server storage available.
A successful server save returns `persisted: true` and the normal reader cookie.
Validation and origin failures remain errors.

This preserves onboarding choices during outages; it does not replace Supabase
for editions, archives, PDFs, or signals on Vercel. Configure `STORAGE_DRIVER=supabase`,
`SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY`, apply both migrations, and redeploy.
No live deployment has been verified by the local tests.

After building, run `node tests/preferences-fallback.mjs` to simulate unavailable
storage under Vercel settings without changing the normal dev server.

## Client-first reading without server storage

`/paper` renders a client shell with no server-side onboarding redirect. It reads
the validated browser backup before attempting a server preference request. The
client passes topics, readingMinutes and timezone to `GET /api/paper`. These
parameters are validated preferences, never reader IDs or archive access tokens.

A valid server profile continues to use the immutable persisted daily edition.
If no profile is available or storage fails, the API ranks public feed articles
using the browser choices; absent choices default to World/Technology, 10 minutes,
UTC. Invalid parameters return 400; feed outages return an explicit empty/retry
state, never an onboarding redirect. Browser-only results are labeled previews
and can change on reload. They are not saved to the server archive. Print-to-PDF
and headline digest work on the displayed preview. AI summaries and recommendation
learning require server sync; device reading badges are kept locally.

The preference page is `/onboarding`; its Read my paper CTA targets `/paper`.
