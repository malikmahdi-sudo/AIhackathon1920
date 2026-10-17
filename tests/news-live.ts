import assert from "node:assert/strict";
import { createAggregator } from "../src/lib/news/aggregate";
import { rankArticles } from "../src/lib/news/rank";
import { TOPICS } from "../src/lib/preferences";

async function main() {
  const result = await createAggregator()();
  console.table(result.feeds);
  assert.ok(result.articles.length > 0, "No recent live articles received.");
  console.log(`Received ${result.articles.length} distinct recent articles.`);
  for (const topic of TOPICS) {
    const articles = rankArticles(result.articles, { topics: [topic], readingMinutes: 10 });
    console.log(`${topic}: ${articles.length} recommendations`);
    assert.ok(articles.every((article) => article.matchedTopics.includes(topic)));
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
