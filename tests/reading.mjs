import assert from "node:assert/strict";
import { readFile, readdir, rm } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const origin = "http://localhost:3000";
test("reading pages save one edition, show archives, and isolate browser profiles", async () => {
  const readers = [];
  async function createReader() {
    const response = await fetch(`${origin}/api/preferences`, { method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body: JSON.stringify({ topics: ["Science"], readingMinutes: 10, timezone: "Asia/Karachi" }) });
    assert.equal(response.status, 200);
    const id = (await response.json()).preferences.id;
    assert.match(id, /^[0-9a-f-]{36}$/);
    readers.push(id);
    return { id, cookie: response.headers.get("set-cookie").split(";")[0] };
  }
  try {
    const anonymous = await fetch(`${origin}/paper`);
    assert.match(await anonymous.text(), /What sparks your curiosity|NEXT_REDIRECT.*onboarding/);
    const first = await createReader();
    const headers = { Cookie: first.cookie };
    assert.match(await (await fetch(`${origin}/archives`, { headers })).text(), /A collection starts with one morning/);
    const paper = await fetch(`${origin}/paper`, { headers });
    assert.equal(paper.status, 200);
    assert.match(await paper.text(), /End of your edition/);
    const files = (await readdir("data/editions")).filter((name) => name.startsWith(`${first.id}_`));
    assert.equal(files.length, 1);
    const before = await readFile(path.join("data/editions", files[0]), "utf8");
    const edition = JSON.parse(before);
    const archive = await fetch(`${origin}/archives`, { headers });
    assert.ok((await archive.text()).includes(`/archives/${edition.date}`));
    assert.match(await (await fetch(`${origin}/archives/${edition.date}`, { headers })).text(), /End of your edition/);
    await fetch(`${origin}/api/preferences`, { method: "POST", headers: { ...headers, Origin: origin, "Content-Type": "application/json" }, body: JSON.stringify({ topics: ["Sports"], readingMinutes: 5, timezone: "Asia/Karachi" }) });
    await fetch(`${origin}/paper`, { headers });
    assert.equal(await readFile(path.join("data/editions", files[0]), "utf8"), before);
    const second = await createReader();
    const privateArchive = await fetch(`${origin}/archives/${edition.date}`, { headers: { Cookie: second.cookie } });
    assert.match(await privateArchive.text(), /No edition for this date/);
    const invalid = await fetch(`${origin}/archives/2026-02-30`, { headers });
    assert.match(await invalid.text(), /No edition for this date/);
  } finally {
    for (const id of readers) {
      await rm(path.join("data", `${id}.json`), { force: true });
      const files = await readdir("data/editions").catch(() => []);
      for (const file of files.filter((name) => name.startsWith(`${id}_`) && /^.*_\d{4}-\d{2}-\d{2}\.json$/.test(name))) await rm(path.join("data/editions", file), { force: true });
    }
  }
});
