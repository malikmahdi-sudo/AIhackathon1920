import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";

// Simulate Vercel with unavailable storage in a separate production process.
// No production credentials or files are touched.
const origin = "http://localhost:3102";
const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", "3102"], {
  windowsHide: true, env: { ...process.env, VERCEL: "1", STORAGE_DRIVER: "local" }, stdio: "pipe",
});
let output = "";
child.stdout.on("data", (data) => { output += data; });
child.stderr.on("data", (data) => { output += data; });
try {
  let ready = false;
  for (let i = 0; i < 60; i++) {
    if (child.exitCode !== null) throw new Error(output);
    try { ready = (await fetch(origin)).ok; } catch {}
    if (ready) break;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  assert.ok(ready, "Server did not start");
  const preferences = { topics: ["Science"], readingMinutes: 10, timezone: "UTC" };
  const headers = { Origin: origin, "Content-Type": "application/json", Cookie: "morning-reader=ea83cc7a-b83e-4dfe-b44b-252264ad2912" };
  const response = await fetch(`${origin}/api/preferences`, { method: "POST", headers, body: JSON.stringify(preferences) });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.persisted, false);
  assert.deepEqual(body.preferences, preferences);
  assert.equal(response.headers.get("set-cookie"), null);
  assert.match(response.headers.get("cache-control"), /no-store/);
  assert.equal((await fetch(`${origin}/api/preferences`, { headers })).status, 500);
  assert.equal((await fetch(`${origin}/onboarding`, { headers })).status, 200);
  assert.equal((await fetch(`${origin}/api/preferences`, { method: "POST", headers, body: JSON.stringify({ ...preferences, topics: [] }) })).status, 400);
  console.log("Unavailable-storage fallback passed: 200 with validated choices, no false persistence cookie, onboarding renders, invalid input rejected.");
} finally {
  if (child.exitCode === null) { child.kill(); await once(child, "exit"); }
}
