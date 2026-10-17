import "server-only";
import { mkdir, readFile, readdir, writeFile, rename, rm } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { storageConfig } from "./storage/config";
import { requireReaderId } from "./storage/types";
import type { LearningSignal } from "./learning";

let pending = Promise.resolve();
async function remote(id: string, signal?: LearningSignal, offset = 0) {
  const config = storageConfig(process.env);
  if (config.driver !== "supabase") throw new Error("Invalid storage driver.");
  const url = new URL("/rest/v1/reader_signals", config.url);
  url.search = new URLSearchParams(signal ? { on_conflict: "reader_id,article_id,kind" } : { reader_id: `eq.${id}`, select: "payload", order: "article_id.asc,kind.asc", limit: "100", offset: String(offset) }).toString();
  const response = await fetch(url, { method: signal ? "POST" : "GET", cache: "no-store", redirect: "error", signal: AbortSignal.timeout(10_000), headers: { apikey: config.key, Authorization: `Bearer ${config.key}`, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" }, ...(signal ? { body: JSON.stringify({ reader_id: id, article_id: signal.articleId, kind: signal.kind, payload: signal }) } : {}) });
  if (!response.ok) throw new Error("Signal storage unavailable.");
  return signal ? [] : await response.json() as { payload: LearningSignal }[];
}
export async function readSignals(id: string): Promise<LearningSignal[]> {
  requireReaderId(id);
  if (storageConfig(process.env).driver === "supabase") {
    const result: LearningSignal[] = [];
    for (let offset = 0; ; offset += 100) {
      const rows = await remote(id, undefined, offset);
      result.push(...rows.map((row) => row.payload));
      if (rows.length < 100) return result;
    }
  }
  const directory = path.join(process.cwd(), "data/signals", id);
  let files: string[];
  try { files = await readdir(directory); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return []; throw error; }
  return Promise.all(files.filter((file) => file.endsWith(".json")).map(async (file) => JSON.parse(await readFile(path.join(directory, file), "utf8"))));
}
export async function saveSignal(id: string, signal: LearningSignal) {
  requireReaderId(id);
  if (!/^[a-zA-Z0-9-]{1,64}$/.test(signal.articleId)) throw new Error("Invalid article.");
  if (storageConfig(process.env).driver === "supabase") { await remote(id, signal); return; }
  const operation = pending.then(async () => {
    const directory = path.join(process.cwd(), "data/signals", id);
    await mkdir(directory, { recursive: true });
    const temporary = path.join(directory, `${randomUUID()}.tmp`);
    try {
      await writeFile(temporary, JSON.stringify(signal), { flag: "wx" });
      await rename(temporary, path.join(directory, `${signal.articleId}_${signal.kind}.json`));
    } finally { await rm(temporary, { force: true }); }
  });
  pending = operation.catch(() => {});
  await operation;
}
