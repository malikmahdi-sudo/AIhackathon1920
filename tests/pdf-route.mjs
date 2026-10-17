import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { PDFDocument } from "pdf-lib";

test("PDF route reads only the cookie owner's saved edition and returns a download", async () => {
  const id = randomUUID(), date = "2026-01-02";
  const url = `http://localhost:3000/api/editions/${date}/pdf`;
  const preferences = { id, topics: ["Science"], readingMinutes: 5, timezone: "UTC" };
  const edition = { id: randomUUID(), readerId: id, date, generatedAt: `${date}T06:00:00Z`, preferences, sourceNotice: null,
    articles: [{ id: "fixture", title: "Saved story, not a fresh feed", summary: "", url: "https://example.com/story", source: "Fixture", publishedAt: `${date}T05:00:00Z`, topics: ["Science"], matchedTopics: ["Science"], reason: "Matches Science", estimatedReadingMinutes: 3 }] };
  await mkdir("data/editions", { recursive: true });
  await writeFile(`data/${id}.json`, JSON.stringify(preferences));
  await writeFile(`data/editions/${id}_${date}.json`, JSON.stringify(edition));
  try {
    assert.equal((await fetch(url)).status, 200);
    const headers = { Cookie: `morning-reader=${id}` };
    const response = await fetch(url, { headers });
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type"), /application\/pdf/);
    assert.match(response.headers.get("content-disposition"), /attachment/);
    assert.match(response.headers.get("cache-control"), /no-store/);
    const doc = await PDFDocument.load(await response.arrayBuffer());
    assert.equal(doc.getSubject(), `Saved edition ${edition.id}`);
    assert.equal((await fetch(url.replace(date, "2026-01-03"), { headers })).status, 200);
    assert.equal((await fetch(url.replace(date, "2026-02-30"), { headers })).status, 400);
    assert.equal((await fetch(url, { headers: { Cookie: `morning-reader=${randomUUID()}` } })).status, 200);
  } finally {
    await rm(`data/${id}.json`, { force: true });
    await rm(`data/editions/${id}_${date}.json`, { force: true });
  }
});
