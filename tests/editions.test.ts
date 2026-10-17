import { createLocalStorage } from "../src/lib/storage/local";
import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { createEditionStore, localEditionDate, validEditionDate } from "../src/lib/editions/store";
import type { ReaderPreferences } from "../src/types/paper";
import type { createAggregator } from "../src/lib/news/aggregate";

const now = Date.parse("2026-10-17T20:00:00Z");
const preferences: ReaderPreferences = { id: randomUUID(), topics: ["Science"], readingMinutes: 10, timezone: "Asia/Karachi" };
const aggregate: ReturnType<typeof createAggregator> = async () => ({
  articles: [{ id: "story", title: "A science story", url: "https://example.com/story", source: "Test", summary: "A short excerpt.", publishedAt: "2026-10-17T18:00:00Z", topics: ["Science"] }],
  feeds: [{ id: "test", name: "Test", status: "fresh", fetchedAt: new Date(now).toISOString(), articleCount: 1 }],
});

test("edition dates use reader timezone and reject impossible dates", () => {
  assert.equal(localEditionDate(now, "Asia/Karachi"), "2026-10-18");
  assert.equal(localEditionDate(now, "America/New_York"), "2026-10-17");
  assert.equal(validEditionDate("2026-02-30"), false);
  assert.equal(validEditionDate("../../other"), false);
});

test("editions are immutable, survive reopening, isolate readers, and resolve concurrent creation", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "morning-editions-test-"));
  try {
    const store = createEditionStore(createLocalStorage(directory));
    assert.deepEqual(await store.list(preferences.id), []);
    const results = await Promise.all([store.today(preferences, aggregate, now), store.today(preferences, aggregate, now)]);
    assert.equal(results[0].status, "ready");
    assert.deepEqual(results[0], results[1]);
    const offline = async () => { throw new Error("Feed must not be called for existing edition"); };
    const reloaded = await createEditionStore(createLocalStorage(directory)).today({ ...preferences, topics: ["Sports"] }, offline, now);
    assert.deepEqual(reloaded, results[0]);
    assert.equal((await store.list(preferences.id)).length, 1);
    assert.equal(await store.read(randomUUID(), "2026-10-18"), null);
    assert.deepEqual(await store.list(randomUUID()), []);
    await assert.rejects(store.read("../bad", "2026-10-18"));
    await store.today(preferences, aggregate, now + 86_400_000);
    assert.deepEqual((await store.list(preferences.id)).map((edition) => edition.date), ["2026-10-19", "2026-10-18"]);
  } finally {
    assert.ok(path.resolve(directory).startsWith(path.resolve(os.tmpdir()) + path.sep));
    await rm(directory, { recursive: true, force: true });
  }
});

test("empty and unavailable results are retryable and never saved", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "morning-editions-test-"));
  try {
    const store = createEditionStore(createLocalStorage(directory));
    const unavailable: ReturnType<typeof createAggregator> = async () => ({ articles: [], feeds: [{ id: "test", name: "Test", status: "unavailable", fetchedAt: null, articleCount: 0 }] });
    assert.equal((await store.today(preferences, unavailable, now)).status, "unavailable");
    assert.equal((await store.today({ ...preferences, topics: ["Sports"] }, aggregate, now)).status, "empty");
    assert.deepEqual(await store.list(preferences.id), []);
    assert.equal((await store.today(preferences, aggregate, now)).status, "ready");
  } finally {
    assert.ok(path.resolve(directory).startsWith(path.resolve(os.tmpdir()) + path.sep));
    await rm(directory, { recursive: true, force: true });
  }
});
