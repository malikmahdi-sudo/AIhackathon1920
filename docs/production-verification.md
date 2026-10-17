# Production verification: self-contained mode

Run `node scripts/verify-production.mjs` with Node.js 22+. The default URL is
https://a-ihackathon1920.vercel.app. Set `PRODUCTION_URL` for another deployment
or local production build. Authorized share links are accepted in that variable;
access tokens are sent only to that host and are not printed. Alternatively set
`VERCEL_AUTOMATION_BYPASS_SECRET` privately. Never commit secrets.

The script verifies 200 responses for four HTML pages, preferences, paper data,
mock signals, direct PDF export, dated PDF export and displayed-edition POST
export. PDF MIME type and `%PDF-` signatures are checked. No login response is
counted as app success. An empty/unavailable feed response remains LIMITED rather
than claiming articles were verified. Exit code is zero only when all checks pass.

## No external database required

Vercel preferences are browser-owned. The API validates input and returns a 200
acknowledgement with `synced: false`; the UI writes localStorage. Signals accept
`{ articleId, action }` and return `success: true`, `message: "Signal logged locally"`,
`synced: false` and `saved: false`. That response does not claim server persistence.
The browser stores bounded feedback history and calculates decaying weights for
future paper requests. Anonymous HTTP tests cannot verify localStorage itself.

PDF POST accepts the exact displayed edition, bounds the request size and fields,
and rejects unsafe links. It performs no database reads, writes or news refetch.
GET uses saved local data if present on the dated route, otherwise current feeds
and supplied/default interests. Feed failure produces a readable empty PDF, never
fabricated news. Fonts are bundled for both PDF routes; rendering is in memory.

Local JSON persistence remains optional for development. Vercel preference flows
do not use the retained legacy Supabase adapter. Browser learning and preferences
are device-specific; clearing site data removes them. Server archives are not
available in browser-only mode.

The verification script creates a QA profile/edition if run against local JSON
mode. There is no deletion endpoint; it never modifies an existing user's profile.
Native fetch verifies HTTP contracts, not browser layout or PDF visual fidelity.
