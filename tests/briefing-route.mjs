import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile, readFile, rm } from "node:fs/promises";


test("Briefing route enforces origin and reader ownership without changing the edition", async () => {
  const id = randomUUID(), date = "2026-01-02";
  const url = `http://localhost:3000/api/editions/${date}/briefing`;
  const preferences = { id, topics: ["Science"], readingMinutes: 5, timezone: "UTC" };
  const edition = { id: randomUUID(), readerId: id, date, generatedAt: `${date}T06:00:00Z`, preferences, sourceNotice: null,
    articles: [{ id: "fixture", title: "Saved story, not a fresh feed", summary: "", url: "https://example.com/story", source: "Fixture", publishedAt: `${date}T05:00:00Z`, topics: ["Science"], matchedTopics: ["Science"], reason: "Matches Science", estimatedReadingMinutes: 3 }] };
  await mkdir("data/editions", { recursive: true });
  await writeFile(`data/${id}.json`, JSON.stringify(preferences));
  await writeFile(`data/editions/${id}_${date}.json`, JSON.stringify(edition));
  try {
    assert.equal((await fetch(url, { method: "POST", headers: { Origin: "http://localhost:3000" } })).status, 401);
    assert.equal((await fetch(url, { method: "POST", headers: { Origin: "https://other.example" } })).status, 403);
    const headers = { Origin: "http://localhost:3000", Cookie: `morning-reader=${id}` };
    const response = await fetch(url, { method: "POST", headers });
    assert.equal(response.status, 200);
    assert.match(response.headers.get("cache-control"), /no-store/);
    const briefing = await response.json();
    assert.ok(["digest", "ai"].includes(briefing.mode));
    assert.equal(briefing.items[0].url, edition.articles[0].url);
    assert.equal(await readFile(`data/editions/${id}_${date}.json`, "utf8"), JSON.stringify(edition));
    assert.equal((await fetch(url.replace(date, "2026-01-03"), { method: "POST", headers })).status, 404);
    assert.equal((await fetch(url.replace(date, "2026-02-30"), { method: "POST", headers })).status, 400);
    assert.equal((await fetch(url, { method: "POST", headers: { Origin: "http://localhost:3000", Cookie: `morning-reader=${randomUUID()}` } })).status, 401);
  } finally {
    await rm(`data/${id}.json`, { force: true });
    await rm(`data/editions/${id}_${date}.json`, { force: true });
  }
});
