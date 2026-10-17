import assert from "node:assert/strict";
import test from "node:test";
import { createAggregator } from "../src/lib/news/aggregate";
import { parseArticles, deduplicate } from "../src/lib/news/normalize";
import { rankArticles } from "../src/lib/news/rank";
import type { FeedSource } from "../src/lib/news/sources";

const now = Date.parse("2026-10-17T06:00:00Z");
const source: FeedSource = { id: "test", name: "Test Publisher", url: "https://example.com/rss", topics: ["Technology"], articleHosts: ["example.com"] };
const item = (title: string, link: string, date = "2026-10-17T05:00:00Z") => `<item><title>${title}</title><link>${link}</link><pubDate>${date}</pubDate><description><![CDATA[<p>A brief publisher description.</p>]]></description></item>`;
const rss = (...items: string[]) => `<rss version="2.0"><channel><title>Test</title><link>https://example.com</link><description>Test</description>${items.join("")}</channel></rss>`;
const fixture = rss(item("New AI discovery", "https://example.com/story?utm_source=rss#top"));

test("RSS normalization strips markup, tracking, unsafe URLs, and stale/future dates", async () => {
  const articles = await parseArticles(rss(
    item("New AI discovery", "https://example.com/story?utm_source=rss#top"),
    item("Unsafe", "javascript:alert(1)"), item("Offsite", "https://evil.example/story"),
    item("Old", "https://example.com/old", "2026-10-01T00:00:00Z"),
    item("Future", "https://example.com/future", "2026-10-19T00:00:00Z"),
    item("Missing date", "https://example.com/missing", ""),
  ), source, now);
  assert.equal(articles.length, 1);
  assert.equal(articles[0].url, "https://example.com/story");
  assert.equal(articles[0].summary, "A brief publisher description.");
  assert.ok(articles[0].topics.includes("Artificial Intelligence"));
  await assert.rejects(parseArticles('<!DOCTYPE rss><rss/>', source, now));
  await assert.rejects(parseArticles('<rss><broken>', source, now));
});

test("Atom feeds normalize into the same article contract", async () => {
  const articles = await parseArticles(`<feed xmlns="http://www.w3.org/2005/Atom"><title>Atom</title><entry><title>Atom story</title><link href="https://example.com/atom"/><id>atom1</id><updated>2026-10-17T05:00:00Z</updated><summary>Short text</summary></entry></feed>`, source, now);
  assert.equal(articles.length, 1);
  assert.equal(articles[0].title, "Atom story");
});

test("deduplication merges tags without modifying cached input", async () => {
  const [article] = await parseArticles(fixture, source, now);
  const duplicate = { ...article, topics: ["Science"] };
  const sameTitle = { ...article, url: "https://example.com/alternate", id: "alternate" };
  const result = deduplicate([article, duplicate, sameTitle]);
  assert.equal(result.length, 1);
  assert.ok(result[0].topics.includes("Science"));
  assert.ok(!article.topics.includes("Science"));
});

test("ranking prioritizes interests, recent stories, diversity, and reading budget", async () => {
  const [base] = await parseArticles(fixture, source, now);
  const science = { ...base, id: "science", topics: ["Science"], title: "Science", source: "Other" };
  const older = { ...base, id: "older", publishedAt: "2026-10-15T06:00:00Z" };
  const diverse = { ...base, id: "diverse", source: "Another publisher", publishedAt: "2026-10-17T04:00:00Z" };
  assert.equal(rankArticles([base, science], { topics: ["Science"], readingMinutes: 10 }, now)[0].id, "science");
  const ranked = rankArticles([older, diverse, base, science], { topics: ["Technology"], readingMinutes: 10 }, now);
  assert.deepEqual(ranked.map((a) => a.id), [base.id, diverse.id, older.id]);
  assert.equal(rankArticles([base, diverse], { topics: ["Technology"], readingMinutes: 5 }, now).length, 1);
  assert.equal(rankArticles([base], { topics: ["Sports"], readingMinutes: 20 }, now).length, 0);
});

test("feed cache coalesces requests, serves stale after failure, then expires", async () => {
  let time = now;
  let calls = 0;
  let fail = false;
  const fetcher = (async () => { calls++; if (fail) throw new Error("offline"); return new Response(fixture); }) as typeof fetch;
  const aggregate = createAggregator({ sources: [source], clock: () => time, fetcher });
  const [a, b] = await Promise.all([aggregate(), aggregate()]);
  assert.equal(calls, 1);
  assert.equal(a.feeds[0].status, "fresh");
  assert.equal(b.articles.length, 1);
  await aggregate();
  assert.equal(calls, 1);
  time += 16 * 60_000;
  fail = true;
  assert.equal((await aggregate()).feeds[0].status, "stale");
  await aggregate();
  assert.equal(calls, 2);
  time += 6 * 60 * 60_000;
  const expired = await aggregate();
  assert.equal(expired.feeds[0].status, "unavailable");
  assert.equal(expired.articles.length, 0);
});

test("partial failures preserve successful feeds; empty and oversized feeds are explicit", async () => {
  const sources = [source, { ...source, id: "bad", url: "https://example.com/bad" }, { ...source, id: "empty", url: "https://example.com/empty" }, { ...source, id: "huge", url: "https://example.com/huge" }];
  const fetcher = (async (url: string) => new Response(url.endsWith("bad") ? "bad xml" : url.endsWith("empty") ? rss() : url.endsWith("huge") ? "x".repeat(2_000_001) : fixture)) as typeof fetch;
  const result = await createAggregator({ sources, fetcher, clock: () => now })();
  assert.deepEqual(result.feeds.map((feed) => feed.status), ["fresh", "unavailable", "empty", "unavailable"]);
  assert.equal(result.articles.length, 1);
});

test("slow feeds abort without preventing a result", async () => {
  const fetcher = ((_url: unknown, options: RequestInit) => new Promise((_resolve, reject) => {
    options.signal!.addEventListener("abort", () => reject(new Error("timeout")), { once: true });
  })) as typeof fetch;
  const result = await createAggregator({ sources: [source], fetcher, clock: () => now, timeoutMs: 10 })();
  assert.equal(result.feeds[0].status, "unavailable");
});
