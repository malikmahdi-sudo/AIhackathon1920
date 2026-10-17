import test from "node:test";
import assert from "node:assert/strict";
import { parseSignal, topicWeights, type LearningSignal } from "../src/lib/learning";
import { rankArticles } from "../src/lib/news/rank";
const now = Date.parse("2026-10-17T06:00:00Z");
test("signals validate and feedback replaces a common key", () => {
  assert.equal(parseSignal({ date: "2026-10-17", articleId: "abc", type: "like" }).kind, "feedback");
  assert.equal(parseSignal({ date: "2026-10-17", articleId: "abc", type: "dislike" }).value, -8);
  assert.equal(parseSignal({ date: "2026-10-17", articleId: "abc", type: "clear" }).value, 0);
  for (const value of [null, {}, { date: "x", articleId: "../bad", type: "click" }, { date: "x", articleId: "abc", type: "reading-time", durationMs: -1 }]) assert.throws(() => parseSignal(value));
});
test("learning decays, caps influence, and changes future ranking", () => {
  const signal: LearningSignal = { articleId: "abc", kind: "feedback", value: 8, topics: ["Science"], occurredAt: new Date(now).toISOString() };
  assert.equal(topicWeights([signal], now).Science, 8);
  assert.equal(topicWeights(Array(100).fill(signal), now).Science, 25);
  assert.equal(topicWeights([signal], now + 31 * 86400_000).Science, undefined);
  assert.ok(topicWeights([signal], now + 86400_000).Science < 8);
  const base = { id: "a", title: "Science", summary: "", url: "https://example.com", source: "Test", publishedAt: new Date(now).toISOString(), topics: ["Science"] };
  const other = { ...base, id: "b", topics: ["Technology"] };
  const preferences = { topics: ["Science", "Technology"], readingMinutes: 5 };
  assert.equal(rankArticles([base, other], preferences, now, { Science: -8 })[0].id, "b");
  assert.equal(rankArticles([base, other], preferences, now, { Science: 8 })[0].id, "a");
});
