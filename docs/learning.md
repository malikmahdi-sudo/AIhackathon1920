# Reader signals and learning

Each story supports More like this, Less like this, Skip, and Undo feedback.
Skip hides the story for the current visit only. Saved editions and PDFs never change.
The selection indicator is per visit; learning records persist across visits.

Clicks on original publisher links and 20 seconds of visible reading in a foreground
tab are weak signals. This measures exposure to the excerpt, not comprehension or
time on a publisher's site. Automatic telemetry is best effort; explicit feedback
shows success or an error and can be retried. No third-party analytics are used.

POST /api/signals verifies origin, reader cookie, date, and article membership in
the reader's saved edition. Topics and timestamps are assigned by the server.
One record per reader/article/kind prevents repeated clicks from accumulating.
Like/dislike/skip/undo share a replaceable feedback record, with values +8/-8/-4/0.
Clicks contribute +2; reading contributes up to +3. Influence decays with a 14-day
time constant, ignores signals older than 30 days, and caps each topic at +/-25.
Signals are retained in storage; the 30-day window is a scoring window, not deletion.

Only explicitly selected interests are eligible for recommendation. Learning adjusts
their scores; it does not introduce unrelated interests. Existing daily editions are
returned before reading signals. New editions and recommendation previews use the
learned scores. Undo clears explicit feedback, not separately captured clicks/time.

Local mode stores atomic JSON records in data/signals/ (ignored by Git). Supabase
mode uses the reader_signals table via server-side REST requests. Apply
supabase/migrations/202610170002_signals.sql before using this feature in Supabase.
The unique key makes retries replace records, and RLS blocks direct browser access.
Live Supabase validation remains pending a configured project.

Run npm test for scoring/validation checks. With the local dev server running, run
`node --test tests/signals.mjs` for ownership, duplicate handling, undo, and immutable
edition checks.

## Browser resilience and reading badges

Read, skipped and bookmark badges are stored per edition/article in localStorage.
Bookmarks are device-only and do not change ranking. Explicit read sends the
existing click signal; 20 seconds of visible reading sends reading-time. Feedback
uses a bounded retry queue (latest feedback, click and time per story). It retries
on reconnect or revisit; unacknowledged feedback is not claimed as server-saved.
Local storage failures leave visit-only state. Clearing browser data removes it.
Skipped articles remain in the immutable edition and are restored in print output.
