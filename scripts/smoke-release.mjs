import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import { once } from "node:events";

const directory = path.resolve(".next/release");
const origin = "http://127.0.0.1:3100";
const child = spawn(process.execPath, ["server.js"], {
  cwd: directory, windowsHide: true,
  env: { ...process.env, NODE_ENV: "production", PORT: "3100", HOSTNAME: "127.0.0.1", NEXT_TELEMETRY_DISABLED: "1" },
  stdio: ["ignore", "pipe", "pipe"],
});
let output = "";
let failure;
let id;
child.stdout.on("data", (chunk) => { output = (output + chunk).slice(-8000); });
child.stderr.on("data", (chunk) => { output = (output + chunk).slice(-8000); });
child.on("error", (error) => { failure = error; });

try {
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    if (failure || child.exitCode !== null) throw failure ?? new Error(output);
    try { ready = (await fetch(origin, { signal: AbortSignal.timeout(1000) })).ok; } catch {}
    if (ready) break;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  assert.ok(ready, "Production server did not become ready.");
  const homepage = await (await fetch(origin)).text();
  assert.match(homepage, /The Morning Paper/);
  const stylesheet = homepage.match(/href="([^\"]+\.css(?:\?[^\"]*)?)"/);
  assert.ok(stylesheet, "No stylesheet linked from the production page.");
  assert.equal((await fetch(new URL(stylesheet[1].replaceAll("&amp;", "&"), origin))).status, 200);
  assert.equal((await fetch(`${origin}/onboarding`)).status, 200);
  assert.equal((await fetch(`${origin}/api/recommendations`)).status, 401);
  const preferences = { topics: ["Science"], readingMinutes: 10, timezone: "Asia/Karachi" };
  const crossOrigin = await fetch(`${origin}/api/preferences`, {
    method: "POST", headers: { Origin: "https://other.example", "Content-Type": "application/json" }, body: JSON.stringify(preferences),
  });
  assert.equal(crossOrigin.status, 403);
  const saved = await fetch(`${origin}/api/preferences`, {
    method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body: JSON.stringify(preferences),
  });
  assert.equal(saved.status, 200);
  id = (await saved.json()).preferences.id;
  assert.match(id, /^[0-9a-f-]{36}$/);
  const cookie = saved.headers.get("set-cookie").split(";")[0];
  const headers = { Cookie: cookie };
  const loaded = await (await fetch(`${origin}/api/preferences`, { headers })).json();
  assert.deepEqual(loaded.preferences, { id, ...preferences });
  assert.deepEqual(JSON.parse(await readFile(path.join(directory, "data", `${id}.json`), "utf8")), { id, ...preferences });
  assert.match(await (await fetch(`${origin}/archives`, { headers })).text(), /A collection starts with one morning/);
  const localhostOrigin = "http://localhost:3100";
  const updated = await fetch(`${localhostOrigin}/api/preferences`, {
    method: "POST", headers: { ...headers, Origin: localhostOrigin, "Content-Type": "application/json" }, body: JSON.stringify(preferences),
  });
  assert.equal(updated.status, 200);
  console.log("Production smoke test passed: HTML, CSS, onboarding, preferences persistence, and archive isolation.");
} finally {
  if (child.pid && child.exitCode === null) {
    const stopped = once(child, "exit");
    child.kill();
    await stopped;
  }
  if (id && /^[0-9a-f-]{36}$/.test(id)) await rm(path.join(directory, "data", `${id}.json`), { force: true });
}
