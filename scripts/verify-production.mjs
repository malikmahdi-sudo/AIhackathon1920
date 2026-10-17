import assert from "node:assert/strict";

// Native Node.js fetch. Creates one QA profile if persistence is configured.
// Never logs cookies, credentials, response bodies or protection tokens.
const target = new URL(process.env.PRODUCTION_URL || "https://a-ihackathon1920-git-main-malikmahdi-sudo.vercel.app/");
const origin = target.origin;
const results = [];
const cookieJar = new Map();
let edition, synced = false;
async function request(path, body) {
  const headers = { Accept: "application/json, text/html, application/pdf" };
  if (body) Object.assign(headers, { Origin: origin, "Content-Type": "application/json" });
  if (process.env.VERCEL_AUTOMATION_BYPASS_SECRET) headers["x-vercel-protection-bypass"] = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  let url = new URL(path, origin), response;
  if (target.searchParams.has("_vercel_share")) url.searchParams.set("_vercel_share", target.searchParams.get("_vercel_share"));
  for (let attempt = 0; attempt < 5; attempt++) {
    if (cookieJar.size) headers.Cookie = [...cookieJar].map(([key, value]) => `${key}=${value}`).join("; ");
    response = await fetch(url, { method: body ? "POST" : "GET", headers, body: body ? JSON.stringify(body) : undefined, redirect: "manual", signal: AbortSignal.timeout(45000) });
    for (const entry of response.headers.getSetCookie()) {
      const pair = entry.split(";")[0], split = pair.indexOf("=");
      cookieJar.set(pair.slice(0, split), pair.slice(split + 1));
    }
    const next = response.headers.get("location");
    if (![301, 302, 303, 307, 308].includes(response.status) || !next) break;
    const destination = new URL(next, url);
    if (destination.origin !== origin) break; // Never forward cookies/access tokens to another host.
    url = destination;
  }
  const location = response.headers.get("location") || "";
  const protectedRoute = response.status === 401 || response.status === 403 || /vercel\.com\/(?:login|sso)/.test(location);
  let protectionJson;
  if (protectedRoute && response.headers.get("content-type")?.includes("application/json")) {
    protectionJson = await response.clone().json().catch(() => null);
  }
  if (protectedRoute && (!response.headers.get("content-type")?.includes("application/json") || protectionJson?.protection?.vercel_auth_enabled || protectionJson?.message === "Protected by Vercel Authentication")) {
    const error = new Error("Vercel access protection; application was not reached");
    error.blocked = true; error.status = response.status; throw error;
  }
  return response;
}
async function check(endpoint, run) {
  try { const detail = await run(); results.push({ endpoint, result: detail?.limited ? "LIMITED" : "PASS", detail: detail?.message || "200; payload verified" }); }
  catch (error) { results.push({ endpoint, result: error.blocked ? "BLOCKED" : "FAIL", detail: `${error.status ? `HTTP ${error.status}: ` : ""}${error.message}` }); }
}
function status(response, expected = 200) { if (response.status !== expected) throw new Error(`Expected HTTP ${expected}, received ${response.status}`); }
async function json(response) { assert.match(response.headers.get("content-type") || "", /application\/json/, "Expected JSON response"); return response.json(); }

for (const path of ["/", "/preferences", "/onboarding", "/paper"]) await check(`GET ${path}`, async () => {
  const response = await request(path); status(response);
  assert.match(response.headers.get("content-type") || "", /text\/html/);
  assert.match(await response.text(), /Morning Paper/);
});
await check("POST /api/preferences", async () => {
  // schedule is not an implemented setting; include required reading budget/timezone.
  const response = await request("/api/preferences", { topics: ["Technology", "World"], readingMinutes: 10, timezone: "Asia/Karachi" });
  status(response); const data = await json(response);
  assert.deepEqual(data.preferences?.topics, ["Technology", "World"]);
  synced = data.synced === true || data.persisted === true;
  return synced ? undefined : { limited: true, message: "200 fallback; server persistence unavailable (fetch cannot save browser localStorage)" };
});
await check("GET /api/paper?topics=Technology,World", async () => {
  const response = await request("/api/paper?topics=Technology,World&readingMinutes=10&timezone=Asia%2FKarachi");
  status(response); const data = await json(response);
  assert.ok(["ready", "empty", "unavailable"].includes(data.status), "Invalid paper status");
  if (data.status !== "ready") return { limited: true, message: `200; explicit ${data.status} feed state, no articles verified` };
  edition = data.edition; synced = synced && data.synced === true;
  assert.ok(Array.isArray(edition?.articles) && edition.articles.length > 0, "Missing articles");
  for (const article of edition.articles) {
    assert.equal(typeof article.id, "string"); assert.equal(typeof article.title, "string"); assert.match(article.url, /^https?:\/\//);
  }
  return { limited: !synced, message: `200; ${edition.articles.length} articles; ${synced ? "persisted edition" : "browser preview"}` };
});
await check("POST /api/signals", async () => {
  if (!edition || !synced) {
    const response = await request("/api/signals", { articleId: "test-1", action: "like" });
    status(response, 400); assert.equal(typeof (await json(response)).error, "string");
    return { limited: true, message: "400 safely rejects incomplete mock; real learning requires a persisted reader-owned edition" };
  }
  const response = await request("/api/signals", { date: edition.date, articleId: edition.articles[0].id, type: "like" });
  status(response); assert.equal((await json(response)).saved, true);
});
await check("GET /api/editions/[date]/pdf", async () => {
  const response = await request(`/api/editions/${edition?.date || "2026-10-17"}/pdf`);
  if (!edition || !synced) {
    assert.ok([401, 404, 503].includes(response.status), `Unexpected PDF failure HTTP ${response.status}`);
    assert.equal(typeof (await json(response)).error, "string");
    return { limited: true, message: `${response.status}; controlled response, PDF needs a persisted edition` };
  }
  status(response); assert.match(response.headers.get("content-type") || "", /application\/pdf/);
  const bytes = new Uint8Array(await response.arrayBuffer());
  assert.equal(new TextDecoder().decode(bytes.slice(0, 5)), "%PDF-");
  return { message: `200; valid PDF signature, ${bytes.length} bytes` };
});
console.log(`Production verification: ${origin}`);
console.table(results);
process.exitCode = results.some((result) => result.result !== "PASS") ? 1 : 0;
