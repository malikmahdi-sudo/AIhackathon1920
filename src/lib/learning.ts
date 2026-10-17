export type LearningSignal = { articleId: string; kind: "feedback" | "click" | "reading-time"; value: number; topics: string[]; occurredAt: string };

export function topicWeights(signals: LearningSignal[], now = Date.now()): Record<string, number> {
  const weights: Record<string, number> = {};
  for (const signal of signals) {
    const age = now - Date.parse(signal.occurredAt);
    if (!Number.isFinite(age) || age < 0 || age > 30 * 86400_000) continue;
    const strength = signal.kind === "feedback" ? signal.value : signal.kind === "click" ? 2 : Math.min(3, signal.value / 20_000);
    const decay = Math.exp(-age / (14 * 86400_000));
    for (const topic of signal.topics) weights[topic] = (weights[topic] ?? 0) + strength * decay;
  }
  return Object.fromEntries(Object.entries(weights).map(([topic, value]) => [topic, Math.max(-25, Math.min(25, value))]));
}

export function parseSignal(value: unknown) {
  if (!value || typeof value !== "object") throw new Error("Invalid signal.");
  const { date, articleId, type, durationMs } = value as Record<string, unknown>;
  if (typeof date !== "string" || typeof articleId !== "string" || !/^[a-zA-Z0-9-]{1,64}$/.test(articleId)) throw new Error("Invalid article.");
  if (!["like", "dislike", "skip", "clear", "click", "reading-time"].includes(String(type))) throw new Error("Invalid signal type.");
  if (type === "reading-time" && (typeof durationMs !== "number" || !Number.isFinite(durationMs) || durationMs < 1000 || durationMs > 120_000)) throw new Error("Invalid reading duration.");
  const kind: LearningSignal["kind"] = type === "click" ? "click" : type === "reading-time" ? "reading-time" : "feedback";
  const score = type === "like" ? 8 : type === "dislike" ? -8 : type === "skip" ? -4 : type === "click" ? 1 : type === "reading-time" ? durationMs as number : 0;
  return { date, articleId, kind, value: score };
}
