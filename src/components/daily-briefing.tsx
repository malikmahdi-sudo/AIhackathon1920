"use client";

import { useState } from "react";
import type { Briefing } from "@/lib/briefing";

export function DailyBriefing({ date }: { date: string }) {
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function generate() {
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/editions/${date}/briefing`, { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Briefing unavailable. Please retry.");
      setBriefing(result);
    } catch (error) { setError(error instanceof Error ? error.message : "Briefing unavailable. Please retry."); }
    finally { setLoading(false); }
  }
  return <section className="daily-briefing" aria-labelledby="briefing-title">
    <p className="eyebrow">Room to explore</p>
    <h2 id="briefing-title">Your paper, in a minute.</h2>
    <p>Get up to five source-linked takeaways from this edition. When enabled, AI receives only the saved headlines and excerpts.</p>
    <button className="button button-secondary" type="button" disabled={loading} onClick={generate}>{loading ? "Preparing your briefing…" : briefing ? "Refresh briefing" : "Create my briefing"}</button>
    <div aria-live="polite" aria-busy={loading}>
      {error && <p role="alert">{error}</p>}
      {briefing && <><p className="story-reason"><strong>{briefing.mode === "ai" ? "AI briefing" : "Headline digest"}</strong> · {briefing.notice}</p>
        <ul>{briefing.items.map((item, index) => <li key={index}><p>{item.text}</p><a href={item.url} target="_blank" rel="noopener noreferrer" aria-label={`Read ${item.title} at ${item.source} (opens in a new tab)`}>{item.source} ↗</a></li>)}</ul></>}
    </div>
  </section>;
}
