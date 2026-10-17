import type { DailyEdition } from "@/types/paper";
import { validatePreferences } from "../preferences";
import { checkEdition, requireEditionKey, requireReaderId, type Storage } from "./types";

// Used through the server-only entry point; injectable transport for offline CI.
export function createSupabaseStorage(url: string, key: string, fetcher: typeof fetch = fetch): Storage {
  const base = new URL(url);
  if (base.protocol !== "https:" || base.username || base.password || base.search || base.hash || base.pathname !== "/" || !key) throw new Error("Invalid Supabase configuration.");
  async function request(table: string, query: Record<string, string>, body?: unknown, prefer?: string): Promise<{ payload: unknown }[]> {
    const endpoint = new URL(`/rest/v1/${table}`, base);
    endpoint.search = new URLSearchParams(query).toString();
    let response: Response;
    try {
      response = await fetcher(endpoint, {
        method: body === undefined ? "GET" : "POST", cache: "no-store", redirect: "error", signal: AbortSignal.timeout(10_000),
        headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(prefer ? { Prefer: prefer } : {}) },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    } catch { throw new Error("Persistent storage is unreachable. Please retry."); }
    if (!response.ok) throw new Error(`Persistent storage request failed (${response.status}).`);
    if (body !== undefined || response.status === 204) return [];
    const rows = await response.json();
    if (!Array.isArray(rows)) throw new Error("Invalid storage response.");
    return rows;
  }
  const storage: Storage = {
    async getPreferences(id) {
      requireReaderId(id);
      const rows = await request("reader_preferences", { reader_id: `eq.${id}`, select: "payload", limit: "1" });
      return rows.length ? { id, ...validatePreferences(rows[0].payload) } : null;
    },
    async savePreferences(value) {
      requireReaderId(value.id);
      const preferences = { id: value.id, ...validatePreferences(value) };
      await request("reader_preferences", { on_conflict: "reader_id" }, { reader_id: value.id, payload: preferences }, "resolution=merge-duplicates,return=minimal");
      return preferences;
    },
    async getEdition(id, date) {
      requireEditionKey(id, date);
      const rows = await request("daily_editions", { reader_id: `eq.${id}`, edition_date: `eq.${date}`, select: "payload", limit: "1" });
      return rows.length ? checkEdition(rows[0].payload as DailyEdition, id, date) : null;
    },
    async listEditions(id) {
      requireReaderId(id);
      const editions: DailyEdition[] = [];
      for (let offset = 0; ; offset += 100) {
        const rows = await request("daily_editions", { reader_id: `eq.${id}`, select: "payload", order: "edition_date.desc", limit: "100", offset: String(offset) });
        for (const row of rows) {
          const value = row.payload as DailyEdition;
          editions.push(checkEdition(value, id, value.date));
        }
        if (rows.length < 100) return editions;
      }
    },
    async saveEditionIfAbsent(edition) {
      checkEdition(edition, edition.readerId, edition.date);
      await request("daily_editions", { on_conflict: "reader_id,edition_date" }, {
        reader_id: edition.readerId, edition_date: edition.date, payload: edition,
      }, "resolution=ignore-duplicates,return=minimal");
      const saved = await storage.getEdition(edition.readerId, edition.date);
      if (!saved) throw new Error("Edition could not be saved.");
      return saved;
    },
  };
  return storage;
}
