import { randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, writeFile, link, rm } from "node:fs/promises";
import path from "node:path";
import type { DailyEdition, ReaderPreferences } from "@/types/paper";
import { rankArticles } from "../news/rank";
import type { createAggregator } from "../news/aggregate";

export function localEditionDate(now: number, timezone: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function validEditionDate(date: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date;
}

export type EditionResult = { status: "ready"; edition: DailyEdition } | { status: "empty" | "unavailable" };

export function createEditionStore(directory: string) {
  function filename(readerId: string, date: string) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(readerId) || !validEditionDate(date)) throw new Error("Invalid edition key.");
    return path.join(directory, `${readerId}_${date}.json`);
  }

  async function read(readerId: string, date: string): Promise<DailyEdition | null> {
    const file = filename(readerId, date);
    try {
      const edition = JSON.parse(await readFile(file, "utf8")) as DailyEdition;
      if (edition.readerId !== readerId || edition.date !== date || !Array.isArray(edition.articles) || !edition.preferences) throw new Error("Invalid saved edition.");
      return edition;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }

  async function list(readerId: string): Promise<DailyEdition[]> {
    filename(readerId, "2000-01-01");
    let files: string[];
    try { files = await readdir(directory); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return []; throw error; }
    const dates = files.filter((name) => name.startsWith(`${readerId}_`) && name.endsWith(".json")).map((name) => name.slice(readerId.length + 1, -5)).filter(validEditionDate).sort().reverse();
    const editions = await Promise.all(dates.map((date) => read(readerId, date)));
    return editions.filter((edition): edition is DailyEdition => edition !== null);
  }

  async function today(preferences: ReaderPreferences, aggregate: ReturnType<typeof createAggregator>, now = Date.now()): Promise<EditionResult> {
    const date = localEditionDate(now, preferences.timezone);
    const existing = await read(preferences.id, date);
    if (existing) return { status: "ready", edition: existing };
    const { articles, feeds } = await aggregate();
    if (feeds.every((feed) => feed.status === "unavailable")) return { status: "unavailable" };
    const selected = rankArticles(articles, preferences, now);
    if (!selected.length) return { status: "empty" };
    const edition: DailyEdition = {
      id: randomUUID(), readerId: preferences.id, date, generatedAt: new Date(now).toISOString(), articles: selected,
      preferences: { topics: [...preferences.topics], readingMinutes: preferences.readingMinutes, timezone: preferences.timezone },
      sourceNotice: feeds.some((feed) => feed.status !== "fresh") ? "Some sources were unavailable, empty, or served cached stories when this edition was prepared." : null,
    };
    await mkdir(directory, { recursive: true });
    const temporary = path.join(directory, `${edition.id}.tmp`);
    try {
      await writeFile(temporary, JSON.stringify(edition, null, 2), { flag: "wx" });
      try {
        // Publish an already complete file without replacing another request's edition.
        await link(temporary, filename(preferences.id, date));
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      }
    } finally { await rm(temporary, { force: true }); }
    const saved = await read(preferences.id, date);
    if (!saved) throw new Error("Edition could not be saved.");
    return { status: "ready", edition: saved };
  }
  return { read, list, today };
}
