import type { Article, ReaderPreferences } from "@/types/paper";
import { MAX_AGE_MS } from "./normalize";

export type RankedArticle = Article & { score: number; matchedTopics: string[]; reason: string; estimatedReadingMinutes: number };

export function rankArticles(articles: Article[], preferences: Pick<ReaderPreferences, "topics" | "readingMinutes">, now = Date.now()): RankedArticle[] {
  const candidates = articles.flatMap((article) => {
    const age = now - Date.parse(article.publishedAt);
    const matchedTopics = article.topics.filter((topic) => preferences.topics.includes(topic));
    if (!matchedTopics.length || !Number.isFinite(age) || age < -300_000 || age > MAX_AGE_MS) return [];
    const freshness = 20 * Math.exp(-Math.max(0, age) / (48 * 60 * 60_000));
    return [{ ...article, score: Math.round((matchedTopics.length * 100 + freshness) * 100) / 100, matchedTopics,
      reason: `Matches ${matchedTopics.join(" and ")}`, estimatedReadingMinutes: 3 }];
  });
  const selected: RankedArticle[] = [];
  const sources = new Map<string, number>();
  const limit = Math.max(1, Math.floor(preferences.readingMinutes / 3));
  while (candidates.length && selected.length < limit) {
    // Prefer a mix of publishers among similarly relevant stories.
    const adjusted = (item: RankedArticle) => item.score - (sources.get(item.source) ?? 0) * 12;
    candidates.sort((a, b) => adjusted(b) - adjusted(a) || b.publishedAt.localeCompare(a.publishedAt) || a.id.localeCompare(b.id));
    const chosen = candidates.shift()!;
    selected.push(chosen);
    sources.set(chosen.source, (sources.get(chosen.source) ?? 0) + 1);
  }
  return selected;
}
