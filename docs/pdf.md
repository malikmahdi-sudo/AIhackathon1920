# Newspaper PDF

Today’s paper and archived editions have a Download PDF button. The server reads
the saved edition by its date and the browser's reader cookie. It does not fetch
feeds, rerank articles, or regenerate an edition. Local and Supabase storage use
the same path. The response is private, uncached, and an attachment.

The A4 PDF uses embedded Noto Serif fonts, a masthead, date, two flowing columns,
headlines, publisher excerpts, recommendation reasons, linked original sources,
and numbered pages. Images are optional by design: this is a typography-led paper
with no remote image downloads. Empty summaries use the same fallback as the web
view. Empty editions render a message; long text continues into further columns/pages.

The bundled Latin font subset targets the English-language feeds currently configured.
Other writing systems need corresponding font coverage before adding multilingual feeds.
PDF generation uses pdf-lib entirely in memory and requires no Chromium executable,
filesystem writes, or external PDF API. Font files are included in deployment traces.

`npm test` includes PDF generation, pagination, source-link, empty-state, and
immutability tests. With the dev server running in local storage mode, run:

```sh
node --test tests/pdf-route.mjs
```

For visual QA, set `PDF_VISUAL_CHECK=1` when running tests; the sample appears in
`tmp/pdfs/newspaper.pdf` (ignored by Git). Tests use synthetic headlines, not live news.
