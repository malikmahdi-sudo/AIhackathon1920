import type { Article } from "@/types/paper";
import { deduplicate, MAX_AGE_MS, parseArticles } from "./normalize";
import { FEED_SOURCES, type FeedSource } from "./sources";

const FRESH_MS = 15 * 60_000;
const STALE_MS = 6 * 60 * 60_000;
const MAX_BYTES = 2_000_000;
type CacheEntry = { articles: Article[]; fetchedAt: number };
export type FeedStatus = { id: string; name: string; status: "fresh" | "stale" | "unavailable" | "empty"; fetchedAt: string | null; articleCount: number };

async function readBounded(response: Response) {
  if (!response.ok || !response.body) throw new Error("Feed unavailable.");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_BYTES) throw new Error("Feed exceeds size limit.");
      chunks.push(value);
    }
  } finally { await reader.cancel(); }
  return Buffer.concat(chunks).toString("utf8");
}

// Dependency injection keeps failure, cache, and timeout behavior testable offline.
export function createAggregator({ sources = FEED_SOURCES, fetcher = fetch, clock = Date.now, timeoutMs = 10_000 }:
  { sources?: FeedSource[]; fetcher?: typeof fetch; clock?: () => number; timeoutMs?: number } = {}) {
  const cache = new Map<string, CacheEntry>();
  const retryAt = new Map<string, number>();
  const pending = new Map<string, Promise<void>>();

  async function refresh(source: FeedSource) {
    const inflight = pending.get(source.id);
    if (inflight) return inflight;
    const operation = (async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetcher(source.url, { signal: controller.signal, redirect: "error", cache: "no-store", headers: { "User-Agent": "MorningPaper-Hackathon/0.1", Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml" } });
        const articles = await parseArticles(await readBounded(response), source, clock());
        cache.set(source.id, { articles, fetchedAt: clock() });
        retryAt.delete(source.id);
      } catch {
        retryAt.set(source.id, clock() + 60_000);
      } finally { clearTimeout(timer); }
    })();
    pending.set(source.id, operation);
    try { await operation; } finally { pending.delete(source.id); }
  }

  return async function aggregate() {
    await Promise.all(sources.map(async (source) => {
      const entry = cache.get(source.id);
      if ((!entry || clock() - entry.fetchedAt >= FRESH_MS) && clock() >= (retryAt.get(source.id) ?? 0)) await refresh(source);
    }));
    const articles: Article[] = [];
    const feeds: FeedStatus[] = sources.map((source) => {
      const entry = cache.get(source.id);
      const age = entry ? clock() - entry.fetchedAt : Infinity;
      const usable = entry && age <= STALE_MS ? entry.articles.filter((article) => clock() - Date.parse(article.publishedAt) <= MAX_AGE_MS) : [];
      articles.push(...usable);
      return {
        id: source.id, name: source.name, fetchedAt: entry ? new Date(entry.fetchedAt).toISOString() : null, articleCount: usable.length,
        status: !entry || age > STALE_MS ? "unavailable" : age >= FRESH_MS ? "stale" : usable.length ? "fresh" : "empty",
      };
    });
    return { articles: deduplicate(articles), feeds };
  };
}
