# Server modules

`preferences.ts` shares options and validation between the form and API.
`preference-store.ts` is server-only and reads/writes local reader profiles.
`news/` contains fixed RSS sources, normalization, caching, and preference-based ranking.
`news/service.ts` exposes the shared aggregator only to server code.
Later milestones add saved editions, PDF generation, and reader signals.
