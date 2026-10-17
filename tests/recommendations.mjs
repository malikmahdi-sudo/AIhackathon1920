import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const origin = "http://localhost:3000";

test("live recommendations require preferences and follow saved topic changes", async () => {
  let id;
  try {
    assert.equal((await fetch(`${origin}/api/recommendations`)).status, 401);
    const preferences = { topics: ["Science"], readingMinutes: 10, timezone: "Asia/Karachi" };
    const created = await fetch(`${origin}/api/preferences`, { method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body: JSON.stringify(preferences) });
    assert.equal(created.status, 200);
    id = (await created.json()).preferences.id;
    const cookie = created.headers.get("set-cookie").split(";")[0];
    const response = await fetch(`${origin}/api/recommendations`, { headers: { Cookie: cookie } });
    assert.equal(response.status, 200);
    assert.match(response.headers.get("cache-control"), /no-store/);
    const result = await response.json();
    assert.ok(result.articles.length > 0 && result.articles.length <= 3);
    assert.ok(result.articles.every((article) => article.matchedTopics.includes("Science")));
    assert.match(result.date, /^\d{4}-\d{2}-\d{2}$/);
    const updated = await fetch(`${origin}/api/preferences`, { method: "POST", headers: { Origin: origin, "Content-Type": "application/json", Cookie: cookie }, body: JSON.stringify({ ...preferences, topics: ["Sports"], readingMinutes: 5 }) });
    assert.equal(updated.status, 200);
    const changedResponse = await fetch(`${origin}/api/recommendations`, { headers: { Cookie: cookie } });
    assert.equal(changedResponse.status, 200);
    const changed = await changedResponse.json();
    assert.equal(changed.articles.length, 1);
    assert.ok(changed.articles[0].matchedTopics.includes("Sports"));
  } finally {
    if (id) { assert.match(id, /^[0-9a-f-]{36}$/); await rm(path.join("data", `${id}.json`), { force: true }); }
  }
});
