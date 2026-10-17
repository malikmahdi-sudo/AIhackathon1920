import { randomUUID } from "node:crypto";
import type { DailyEdition, ReaderPreferences } from "@/types/paper";
import { rankArticles } from "../news/rank";
import type { createAggregator } from "../news/aggregate";
import type { Storage } from "../storage/types";
export { validEditionDate } from "../storage/types";

export function localEditionDate(now: number, timezone: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export type EditionResult = { status: "ready"; edition: DailyEdition } | { status: "empty" | "unavailable" };

export function createEditionStore(storage: Storage) {
  const read = storage.getEdition;
  const list = storage.listEditions;

  async function today(preferences: ReaderPreferences, aggregate: ReturnType<typeof createAggregator>, now = Date.now(), weights: Record<string, number> = {}): Promise<EditionResult> {
    const date = localEditionDate(now, preferences.timezone);
    const existing = await read(preferences.id, date);
    if (existing) return { status: "ready", edition: existing };
    const { articles, feeds } = await aggregate();
    if (feeds.every((feed) => feed.status === "unavailable")) return { status: "unavailable" };
    const selected = rankArticles(articles, preferences, now, weights);
    if (!selected.length) return { status: "empty" };
    const edition: DailyEdition = {
      id: randomUUID(), readerId: preferences.id, date, generatedAt: new Date(now).toISOString(), articles: selected,
      preferences: { topics: [...preferences.topics], readingMinutes: preferences.readingMinutes, timezone: preferences.timezone },
      sourceNotice: feeds.some((feed) => feed.status !== "fresh") ? "Some sources were unavailable, empty, or served cached stories when this edition was prepared." : null,
    };
    const saved = await storage.saveEditionIfAbsent(edition);
    return { status: "ready", edition: saved };
  }
  return { read, list, today };
}
