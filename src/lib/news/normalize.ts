import { createHash } from "node:crypto";
import Parser from "rss-parser";
import type { Article } from "@/types/paper";
import type { FeedSource } from "./sources";

export const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const parser = new Parser();
const plain = (value: string) => value.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

export function canonicalUrl(raw: string, source: FeedSource): string | null {
  try {
    const url = new URL(raw);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.port) return null;
    if (!source.articleHosts.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`))) return null;
    url.protocol = "https:";
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_|fbclid$|gclid$|ocid$)/i.test(key)) url.searchParams.delete(key);
    }
    url.searchParams.sort();
    return url.toString();
  } catch { return null; }
}

export async function parseArticles(xml: string, source: FeedSource, now: number): Promise<Article[]> {
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error("Unsupported XML declarations.");
  const feed = await parser.parseString(xml);
  const articles: Article[] = [];
  for (const item of feed.items.slice(0, 100)) {
    const url = canonicalUrl(item.link ?? "", source);
    const title = plain(item.title ?? "").slice(0, 240);
    const timestamp = Date.parse(item.isoDate ?? item.pubDate ?? "");
    // Do not invent a publication time for missing or invalid publisher dates.
    if (!url || !title || !Number.isFinite(timestamp) || timestamp > now + 5 * 60_000 || now - timestamp > MAX_AGE_MS) continue;
    const summary = plain(item.contentSnippet ?? item.summary ?? item.content ?? "").slice(0, 400);
    const text = `${title} ${summary}`;
    const topics = new Set(source.topics);
    if (/\b(artificial intelligence|AI|machine learning|ChatGPT|LLM|OpenAI)\b/i.test(text)) topics.add("Artificial Intelligence");
    if (/\b(climate|global warming|carbon emissions|renewable energy)\b/i.test(text)) topics.add("Climate");
    articles.push({ id: createHash("sha256").update(url).digest("hex").slice(0, 24), url, title, summary, source: source.name, publishedAt: new Date(timestamp).toISOString(), topics: [...topics] });
  }
  return articles;
}

export function deduplicate(articles: Article[]): Article[] {
  const byUrl = new Map<string, Article>();
  const byTitle = new Map<string, Article>();
  for (const article of articles) {
    const titleKey = article.title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
    const existing = byUrl.get(article.url) ?? byTitle.get(titleKey);
    if (existing) {
      existing.topics = [...new Set([...existing.topics, ...article.topics])];
      byUrl.set(article.url, existing);
    } else {
      const copy = { ...article, topics: [...article.topics] };
      byUrl.set(article.url, copy);
      byTitle.set(titleKey, copy);
    }
  }
  return [...new Set(byUrl.values())];
}
