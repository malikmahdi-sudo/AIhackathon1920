import test from "node:test";
import assert from "node:assert/strict";
import { readPreferenceBackup, writePreferenceBackup } from "../src/lib/preference-backup";

test("browser backup validates data, restores pending changes and handles blocked storage", () => {
  let stored = "";
  const storage = { getItem: () => stored, setItem: (_key: string, value: string) => { stored = value; } };
  const preferences = { topics: ["Science"], readingMinutes: 10, timezone: "UTC" };
  assert.equal(writePreferenceBackup(storage, preferences, true), true);
  assert.deepEqual(readPreferenceBackup(storage), { preferences, pending: true });
  assert.equal(writePreferenceBackup(storage, preferences, false), true);
  assert.equal(readPreferenceBackup(storage)?.pending, false);
  stored = '{"preferences":{"topics":[]},"pending":true}';
  assert.equal(readPreferenceBackup(storage), null);
  stored = "bad json";
  assert.equal(readPreferenceBackup(storage), null);
  assert.equal(readPreferenceBackup({ getItem: () => { throw new Error("Denied"); } }), null);
  assert.equal(writePreferenceBackup({ setItem: () => { throw new Error("Quota"); } }, preferences, true), false);
});
