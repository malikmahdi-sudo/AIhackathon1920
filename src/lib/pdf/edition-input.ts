import { validatePreferences } from "../preferences";
import { validEditionDate } from "../storage/types";
import type { DailyEdition } from "../../types/paper";

export function parsePdfEdition(value: unknown): DailyEdition {
  if (!value || typeof value !== "object") throw new Error("Expected edition");
  const input = value as DailyEdition;
  if (!validEditionDate(input.date) || !Number.isFinite(Date.parse(input.generatedAt)) || !Array.isArray(input.articles) || input.articles.length > 20) throw new Error("Invalid edition");
  const text = (value: unknown, max: number) => { if (typeof value !== "string" || value.length > max) throw new Error("Invalid text"); return value; };
  const tags = (value: unknown) => { if (!Array.isArray(value) || value.length > 10) throw new Error("Invalid tags"); return value.map((v) => text(v, 80)); };
  return {
    id: text(input.id, 100), readerId: "browser-export", date: input.date, generatedAt: input.generatedAt,
    preferences: validatePreferences(input.preferences), sourceNotice: input.sourceNotice === null ? null : text(input.sourceNotice, 1000),
    articles: input.articles.map((a) => {
      const url = new URL(text(a.url, 2000));
      if (!["http:", "https:"].includes(url.protocol)) throw new Error("Invalid link");
      if (!Number.isFinite(Date.parse(a.publishedAt))) throw new Error("Invalid date");
      return { id: text(a.id, 100), title: text(a.title, 500), summary: text(a.summary, 5000), source: text(a.source, 200), url: url.href, publishedAt: a.publishedAt,
        topics: tags(a.topics), matchedTopics: tags(a.matchedTopics), reason: text(a.reason, 1000), estimatedReadingMinutes: 3 };
    }),
  };
}
