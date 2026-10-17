import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile, readFile, readdir, rm, rmdir } from "node:fs/promises";
const origin = "http://localhost:3000";
test("signals enforce ownership, replace feedback, and never change saved editions", async () => {
  const id = randomUUID(), date = "2026-10-17";
  const prefs = { id, topics: ["Science"], readingMinutes: 10, timezone: "UTC" };
  const edition = { id: randomUUID(), readerId: id, date, generatedAt: `${date}T06:00:00Z`, preferences: prefs, articles: [{ id: "test-story", topics: ["Science"] }], sourceNotice: null };
  const file = `data/editions/${id}_${date}.json`;
  const before = JSON.stringify(edition);
  await mkdir("data/editions", { recursive: true });
  await writeFile(`data/${id}.json`, JSON.stringify(prefs)); await writeFile(file, before);
  const post = (type, options = {}) => fetch(`${origin}/api/signals`, { method: "POST", headers: { Origin: origin, Cookie: `morning-reader=${id}`, "Content-Type": "application/json", ...options.headers }, body: JSON.stringify({ date, articleId: "test-story", type, ...options.body }) });
  try {
    assert.equal((await post("like", { headers: { Cookie: "" } })).status, 401);
    assert.equal((await post("like", { headers: { Origin: "https://evil.example" } })).status, 403);
    assert.equal((await post("like", { body: { articleId: "other" } })).status, 404);
    assert.equal((await post("reading-time", { body: { durationMs: -1 } })).status, 400);
    assert.equal((await post("like")).status, 200);
    assert.equal((await post("dislike")).status, 200);
    assert.equal((await post("click")).status, 200);
    assert.equal((await post("click")).status, 200);
    const files = await readdir(`data/signals/${id}`);
    assert.equal(files.length, 2);
    const feedback = JSON.parse(await readFile(`data/signals/${id}/test-story_feedback.json`, "utf8"));
    assert.equal(feedback.value, -8); assert.deepEqual(feedback.topics, ["Science"]);
    await post("clear");
    assert.equal(JSON.parse(await readFile(`data/signals/${id}/test-story_feedback.json`, "utf8")).value, 0);
    assert.equal(await readFile(file, "utf8"), before);
  } finally {
    await rm(file, { force: true }); await rm(`data/${id}.json`, { force: true });
    for (const name of await readdir(`data/signals/${id}`).catch(() => [])) await rm(`data/signals/${id}/${name}`, { force: true });
    await rmdir(`data/signals/${id}`).catch(() => {});
  }
});
