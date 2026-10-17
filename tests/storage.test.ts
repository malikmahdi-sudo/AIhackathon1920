import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createLocalStorage } from "../src/lib/storage/local";
import { createSupabaseStorage } from "../src/lib/storage/supabase";
import { storageConfig } from "../src/lib/storage/config";
import type { Storage } from "../src/lib/storage/types";
import type { DailyEdition, ReaderPreferences } from "../src/types/paper";

type Row = { reader_id: string; edition_date?: string; payload: ReaderPreferences | DailyEdition };
function mockSupabase() {
  const rows = new Map<string, Row>();
  const fetcher = (async (input: URL, options: RequestInit) => {
    const url = new URL(String(input));
    const headers = new Headers(options.headers);
    assert.equal(headers.get("apikey"), "test-key");
    assert.equal(headers.get("authorization"), "Bearer test-key");
    assert.equal(options.cache, "no-store");
    assert.equal(options.redirect, "error");
    const table = url.pathname.split("/").pop();
    if (options.method === "POST") {
      const row = JSON.parse(options.body as string) as Row;
      const key = `${table}:${row.reader_id}:${row.edition_date ?? ""}`;
      if (table === "daily_editions") {
        assert.equal(url.searchParams.get("on_conflict"), "reader_id,edition_date");
        assert.match(headers.get("prefer")!, /ignore-duplicates/);
        if (!rows.has(key)) rows.set(key, row);
      } else { assert.match(headers.get("prefer")!, /merge-duplicates/); rows.set(key, row); }
      return new Response(null, { status: 201 });
    }
    const id = url.searchParams.get("reader_id")?.slice(3);
    assert.ok(id, "Every read must be scoped to a reader");
    const date = url.searchParams.get("edition_date")?.slice(3);
    const selected = [...rows.entries()].filter(([key, row]) => key.startsWith(`${table}:`) && row.reader_id === id && (!date || row.edition_date === date)).map(([, row]) => row).sort((a, b) => (b.edition_date ?? "").localeCompare(a.edition_date ?? ""));
    const offset = Number(url.searchParams.get("offset") ?? 0);
    const limit = Number(url.searchParams.get("limit") ?? 100);
    return Response.json(selected.slice(offset, offset + limit).map((row) => ({ payload: row.payload })));
  }) as typeof fetch;
  return createSupabaseStorage("https://test.supabase.co", "test-key", fetcher);
}

async function contract(storage: Storage) {
  const id = randomUUID();
  const preferences: ReaderPreferences = { id, topics: ["Science"], readingMinutes: 10, timezone: "Asia/Karachi" };
  assert.equal(await storage.getPreferences(id), null);
  await storage.savePreferences(preferences);
  assert.deepEqual(await storage.getPreferences(id), preferences);
  const updated = { ...preferences, readingMinutes: 20 };
  await storage.savePreferences(updated);
  assert.deepEqual(await storage.getPreferences(id), updated);
  const edition: DailyEdition = { id: randomUUID(), readerId: id, date: "2026-10-17", generatedAt: "2026-10-17T06:00:00Z", articles: [], preferences, sourceNotice: null };
  const saved = await Promise.all([storage.saveEditionIfAbsent(edition), storage.saveEditionIfAbsent({ ...edition, id: randomUUID() })]);
  assert.equal(saved[0].id, saved[1].id);
  assert.deepEqual(await storage.getEdition(id, edition.date), saved[0]);
  assert.equal(await storage.getEdition(randomUUID(), edition.date), null);
  assert.deepEqual(await storage.listEditions(randomUUID()), []);
  assert.equal((await storage.listEditions(id)).length, 1);
  await assert.rejects(storage.getEdition("../bad", edition.date));
  await assert.rejects(storage.getEdition(id, "2026-02-30"));
  await assert.rejects(storage.savePreferences({ ...preferences, topics: [] }));
}

test("local storage meets the shared persistence contract", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "morning-storage-test-"));
  try { await contract(createLocalStorage(directory)); }
  finally {
    assert.ok(path.resolve(directory).startsWith(path.resolve(os.tmpdir()) + path.sep));
    await rm(directory, { recursive: true, force: true });
  }
});

test("Supabase adapter meets the same contract through a mocked REST transport", async () => {
  await contract(mockSupabase());
});

test("Supabase archives paginate beyond 100 editions", async () => {
  const storage = mockSupabase();
  const id = randomUUID();
  const preferences = { id, topics: ["Science"], readingMinutes: 10, timezone: "UTC" };
  await storage.savePreferences(preferences);
  for (let i = 0; i < 101; i++) {
    const date = new Date(Date.UTC(2026, 0, i + 1)).toISOString().slice(0, 10);
    await storage.saveEditionIfAbsent({ id: randomUUID(), readerId: id, date, generatedAt: `${date}T00:00:00Z`, articles: [], preferences, sourceNotice: null });
  }
  const editions = await storage.listEditions(id);
  assert.equal(editions.length, 101);
  assert.ok(editions[0].date > editions[100].date);
});

test("configuration fails closed on Vercel or incomplete Supabase setup", () => {
  assert.equal(storageConfig({}).driver, "local");
  assert.throws(() => storageConfig({ VERCEL: "1", STORAGE_DRIVER: "local" }));
  assert.throws(() => storageConfig({ VERCEL: "1" }));
  assert.throws(() => storageConfig({ STORAGE_DRIVER: "supabase" }));
  assert.throws(() => storageConfig({ STORAGE_DRIVER: "typo" }));
  assert.equal(storageConfig({ VERCEL: "1", SUPABASE_URL: "https://test.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "test-key" }).driver, "supabase");
});

test("remote failures never fall back to local data or expose credentials", async () => {
  const storage = createSupabaseStorage("https://test.supabase.co", "secret", async () => new Response("secret details", { status: 401 }));
  await assert.rejects(storage.getPreferences(randomUUID()), /^Error: Persistent storage request failed \(401\)\.$/);
  const offline = createSupabaseStorage("https://test.supabase.co", "secret", async () => { throw new Error("secret"); });
  await assert.rejects(offline.getPreferences(randomUUID()), /^Error: Persistent storage is unreachable/);
});
