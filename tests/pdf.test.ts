import test from "node:test";
import assert from "node:assert/strict";
import { PDFDocument } from "pdf-lib";
import { mkdir, writeFile } from "node:fs/promises";
import { createNewspaperPdf } from "../src/lib/pdf/newspaper";
import type { DailyEdition } from "../src/types/paper";
import { parsePdfEdition } from "../src/lib/pdf/edition-input";

const edition: DailyEdition = {
  id: "pdf-test-edition", readerId: "test", date: "2026-10-17", generatedAt: "2026-10-17T06:00:00Z",
  preferences: { topics: ["Science", "Technology"], readingMinutes: 20, timezone: "Asia/Karachi" }, sourceNotice: null,
  articles: Array.from({ length: 6 }, (_, i) => ({
    id: `story-${i}`, title: ["A new perspective on the world around us", "The science behind a quieter morning", "Ideas worth taking into your day"][i % 3],
    summary: i === 2 ? "" : "Researchers are exploring new ways to understand our changing world. This sample publisher excerpt demonstrates the newspaper’s column layout, with clear typography and room to read. The saved edition keeps its original content and ordering, even when tomorrow’s headlines change.",
    url: `https://example.com/story-${i}`, source: "Sample Publisher", publishedAt: "2026-10-17T04:00:00Z", topics: ["Science"], matchedTopics: ["Science"], reason: "Matches Science", estimatedReadingMinutes: 3,
  })),
};

test("browser PDF input preserves displayed content and rejects unsafe or excessive input", () => {
  const parsed = parsePdfEdition(edition);
  assert.deepEqual(parsed.articles, edition.articles);
  assert.equal(parsed.readerId, "browser-export");
  assert.throws(() => parsePdfEdition({ ...edition, articles: Array(21).fill(edition.articles[0]) }));
  assert.throws(() => parsePdfEdition({ ...edition, articles: [{ ...edition.articles[0], url: "javascript:alert(1)" }] }));
  assert.throws(() => parsePdfEdition({ ...edition, articles: [{ ...edition.articles[0], summary: "x".repeat(5001) }] }));
});
test("PDF renders the immutable edition, links, multiple pages, and missing summaries", async () => {
  const before = JSON.stringify(edition);
  const bytes = await createNewspaperPdf(edition);
  const doc = await PDFDocument.load(bytes);
  assert.equal(JSON.stringify(edition), before);
  assert.equal(doc.getSubject(), "Saved edition pdf-test-edition");
  assert.ok(doc.getPageCount() >= 2);
  assert.equal(doc.getPages().reduce((count, page) => count + (page.node.Annots()?.size() ?? 0), 0), 6);
  if (process.env.PDF_VISUAL_CHECK) {
    await mkdir("tmp/pdfs", { recursive: true });
    await writeFile("tmp/pdfs/newspaper.pdf", bytes);
  }
});
test("empty edition and very long text paginate without throwing", async () => {
  assert.equal((await PDFDocument.load(await createNewspaperPdf({ ...edition, articles: [] }))).getPageCount(), 1);
  const long = { ...edition, articles: [{ ...edition.articles[0], title: "Long headline ".repeat(30), summary: "Longword".repeat(800) }] };
  assert.ok((await PDFDocument.load(await createNewspaperPdf(long))).getPageCount() > 1);
});
