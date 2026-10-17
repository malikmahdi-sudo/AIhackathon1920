import { readBrowserState, saveBrowserState } from "./browser-state";
import { parseSignal, topicWeights, type LearningSignal } from "./learning";
import { TOPICS } from "./preferences";

const key = "morning-paper.learning.v1";
type RecordEntry = LearningSignal;
function read() {
  return readBrowserState<RecordEntry[]>(key, (value): value is RecordEntry[] => Array.isArray(value) && value.length <= 300 && value.every((s) => s && typeof s.articleId === "string" && ["feedback", "click", "reading-time"].includes(s.kind) && Number.isFinite(s.value) && typeof s.occurredAt === "string" && Array.isArray(s.topics) && s.topics.every((t: string) => TOPICS.includes(t as typeof TOPICS[number])))) ?? [];
}
export function saveBrowserSignal(date: string, articleId: string, type: string, topics: string[], durationMs?: number) {
  const signal = parseSignal({ date, articleId, type, durationMs });
  const record: LearningSignal = { articleId, kind: signal.kind, value: signal.value, topics, occurredAt: new Date().toISOString() };
  return saveBrowserState(key, [...read().filter((s) => !(s.articleId === articleId && s.kind === record.kind)), record].slice(-300));
}
export function browserTopicWeights() { return topicWeights(read()); }
