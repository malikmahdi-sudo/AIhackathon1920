"use client";

import { useState } from "react";
import { headlineDigest, type Briefing } from "@/lib/briefing";
import type { DailyEdition } from "@/types/paper";
import { readBrowserState, saveBrowserState } from "@/lib/browser-state";

export function DailyBriefing({ edition }: { edition: DailyEdition }) {
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const key = `morning-paper.briefing.${edition.id}`;
  async function generate() {
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/editions/${edition.date}/briefing`, { method: "POST", signal: AbortSignal.timeout(25000) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Briefing unavailable. Please retry.");
      setBriefing(result);
      saveBrowserState(key, result);
    } catch {
      const cached = readBrowserState<Briefing>(key, (value): value is Briefing => {
        if (!value || typeof value !== "object") return false;
        const item = value as Briefing;
        return ["ai", "digest"].includes(item.mode) && typeof item.notice === "string" && Array.isArray(item.items) && item.items.length <= 5 && item.items.every((x) => x && typeof x.text === "string" && typeof x.title === "string" && typeof x.source === "string" && edition.articles.some((article) => article.url === x.url));
      });
      setBriefing(cached ?? headlineDigest(edition, "A quick look at this edition's original headlines."));
      setError(cached ? "Connection unavailable. Showing your saved briefing." : "Connection unavailable. Showing headlines from the paper you already opened.");
    }
    finally { setLoading(false); }
  }
  return <section className="daily-briefing" aria-labelledby="briefing-title">
    <p className="eyebrow">Room to explore</p>
    <h2 id="briefing-title">1-Minute AI Briefing</h2>
    <p>The essential ideas, a little more clearly. Up to five takeaways, always linked to the original reporting.</p>
    <button className="button button-secondary" type="button" disabled={loading} onClick={generate}>{loading ? "Preparing your briefing…" : briefing ? "Refresh briefing" : "Create my briefing"}</button>
    <div aria-live="polite" aria-busy={loading}>
      {error && <p role="alert">{error}</p>}
      {briefing && <><p className="story-reason"><strong>{briefing.mode === "ai" ? "AI briefing" : "Headline digest"}</strong> · {briefing.notice}</p>
        <ul>{briefing.items.map((item, index) => <li key={index}><p>{item.text}</p><a href={item.url} target="_blank" rel="noopener noreferrer" aria-label={`Read ${item.title} at ${item.source} (opens in a new tab)`}>{item.source} ↗</a></li>)}</ul></>}
    </div>
  </section>;
}
