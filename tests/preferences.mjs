import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

// Run against the local dev server. Only fresh test profiles are removed.
const origin = "http://localhost:3000";
const ids = new Set();
const valid = { topics: ["Science", "Technology"], readingMinutes: 10, timezone: "Asia/Karachi" };
async function save(body, cookie, customOrigin = origin) {
  return fetch(`${origin}/api/preferences`, {
    method: "POST", headers: { "Content-Type": "application/json", Origin: customOrigin, ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify(body),
  });
}

test("preferences validate, persist, update, and remain isolated by browser", async () => {
  try {
    const empty = await fetch(`${origin}/api/preferences`);
    assert.equal((await empty.json()).preferences, null);
    assert.match(empty.headers.get("cache-control"), /no-store/);
    for (const input of [null, { ...valid, topics: [] }, { ...valid, topics: ["Unknown"] },
      { ...valid, topics: ["Science", "Science"] },
      { ...valid, topics: ["Science", "Technology", "Business", "World", "Pakistan", "Health"] },
      { ...valid, readingMinutes: 7 }, { ...valid, timezone: "not-a-zone" }]) {
      assert.equal((await save(input)).status, 400);
    }
    assert.equal((await save(valid, undefined, "https://other.example")).status, 403);
    const malformed = await fetch(`${origin}/api/preferences`, { method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body: "{" });
    assert.equal(malformed.status, 400);
    const created = await save(valid);
    assert.equal(created.status, 200);
    const first = (await created.json()).preferences;
    assert.match(first.id, /^[0-9a-f-]{36}$/);
    ids.add(first.id);
    const cookieHeader = created.headers.get("set-cookie");
    assert.match(cookieHeader, /HttpOnly/i);
    assert.match(cookieHeader, /SameSite=lax/i);
    const cookie = cookieHeader.split(";")[0];
    const loaded = await fetch(`${origin}/api/preferences`, { headers: { Cookie: cookie } });
    assert.deepEqual((await loaded.json()).preferences, first);
    const changed = { ...valid, topics: ["Health"], readingMinutes: 20 };
    const updated = await save(changed, cookie);
    assert.deepEqual((await updated.json()).preferences, { id: first.id, ...changed });
    const disk = JSON.parse(await readFile(path.join("data", `${first.id}.json`), "utf8"));
    assert.deepEqual(disk, { id: first.id, ...changed });
    const secondResponse = await save(valid);
    const second = (await secondResponse.json()).preferences;
    ids.add(second.id);
    assert.notEqual(second.id, first.id);
    const invalidCookie = await fetch(`${origin}/api/preferences`, { headers: { Cookie: "morning-reader=../../README" } });
    assert.equal((await invalidCookie.json()).preferences, null);
    const page = await fetch(`${origin}/onboarding`, { headers: { Cookie: cookie } });
    assert.equal(page.status, 200);
    assert.match(await page.text(), /Refine your morning/);
  } finally {
    for (const id of ids) {
      assert.match(id, /^[0-9a-f-]{36}$/);
      await rm(path.join("data", `${id}.json`), { force: true });
    }
  }
});
