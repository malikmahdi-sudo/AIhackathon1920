# Room to Explore: your paper in a minute

The reading and archive pages offer an optional text briefing. The server reads
the exact saved edition owned by the browser cookie; it never fetches fresh news
or changes the PDF/edition. POST requests require the same origin, a valid date,
and an existing reader-owned snapshot. Responses are private/no-store.

Set server-only `OPENAI_API_KEY` and `OPENAI_MODEL` using `.env.local` locally or
the hosting dashboard. The model must support the Responses API and structured
JSON output. No keys are required for the rest of the application.

Only numbered headlines (300 characters) and excerpts (400 characters) are sent
to OpenAI. Reader identity, preferences, feedback, and cookies are not sent.
The request uses `store: false`, a 20-second timeout, and bounded output tokens.
It instructs the model to treat news as data, retain uncertainty, and avoid adding
facts. Structured output is checked for valid unique article indexes, nonempty
text, 1–5 items, and at most 160 words. Source links come from the saved snapshot,
never from the model. AI text is rendered as plain React text, not HTML.

Source validation cannot prove factual accuracy: the UI labels AI output and
invites readers to check the original reporting. Missing snippets use headline
information only. Missing credentials, refusals, invalid output, and provider
failures return clearly labeled original headlines. Empty editions return an
explicit message. Storage failures show a retryable error instead.

An in-memory cache shares concurrent requests and retains up to 200 briefings for
one hour (fallbacks for one minute). It is not persistent or a distributed rate
limit; separate serverless instances can generate separate responses. Set a
provider project spending limit before public exposure. Briefings are optional
companions, not part of the immutable archive or PDF. No audio is implemented.

`npm test` checks the real request/validation logic with mocked provider responses,
including missing excerpts, data minimization, bad sources, refusals, and outages.
Live provider verification requires your own key and model. The integration uses
the [official structured output format](https://developers.openai.com/api/docs/guides/structured-outputs).
