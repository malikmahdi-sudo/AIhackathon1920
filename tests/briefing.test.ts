import test from "node:test";
import assert from "node:assert/strict";
import { createBriefing } from "../src/lib/briefing";
import type { DailyEdition } from "../src/types/paper";

const edition: DailyEdition = {
  id: "edition", readerId: "private-reader", date: "2026-10-17", generatedAt: "2026-10-17T06:00:00Z",
  preferences: { topics: ["Science"], readingMinutes: 5, timezone: "Asia/Karachi" }, sourceNotice: null,
  articles: [{ id: "a", title: "Scientists study rain", summary: "", url: "https://example.com/rain", source: "Publisher", publishedAt: "2026-10-17T05:00:00Z", topics: ["Science"], matchedTopics: ["Science"], reason: "Matches Science", estimatedReadingMinutes: 3 }],
};
function response(items: unknown, status = "completed") {
  return Response.json({ status, output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify({ items }) }] }] });
}
test("briefing falls back without keys and handles empty snapshots", async () => {
  const result = await createBriefing(edition, {});
  assert.equal(result.mode, "digest"); assert.equal(result.items[0].text, edition.articles[0].title);
  assert.equal((await createBriefing({ ...edition, articles: [] }, {})).items.length, 0);
});
test("AI receives only bounded headline/excerpt data and links to immutable original sources", async () => {
  const before = JSON.stringify(edition);
  const fetcher: typeof fetch = async (_url, init) => {
    const body = JSON.parse(String(init?.body));
    assert.equal(body.store, false);
    assert.deepEqual(JSON.parse(body.input), [{ index: 0, headline: "Scientists study rain", excerpt: "" }]);
    assert.ok(!String(init?.body).includes("private-reader"));
    return response([{ index: 0, text: "Researchers are studying rain." }]);
  };
  const result = await createBriefing(edition, { apiKey: "test", model: "test", fetcher });
  assert.equal(result.mode, "ai"); assert.equal(result.items[0].url, edition.articles[0].url);
  assert.equal(JSON.stringify(edition), before);
});
test("invalid sources, refusals, incomplete responses, long output and outages use digest", async () => {
  const invalid = [response([{ index: 9, text: "Invented source" }]), response([{ index: 0, text: "a ".repeat(161) }]), response([{ index: 0, text: "Valid" }], "incomplete"), response([]), Response.json({ status: "completed", output: [{ type: "message", content: [{ type: "refusal" }] }] }), new Response("Unavailable", { status: 503 })];
  for (const result of invalid) assert.equal((await createBriefing(edition, { apiKey: "test", model: "test", fetcher: async () => result })).mode, "digest");
  assert.equal((await createBriefing(edition, { apiKey: "test", model: "test", fetcher: async () => { throw new Error("Timeout"); } })).mode, "digest");
});
