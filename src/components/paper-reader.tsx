"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Masthead } from "./masthead";
import { EditionView } from "./edition-view";
import { readPreferenceBackup } from "@/lib/preference-backup";
import { validatePreferences } from "@/lib/preferences";
import type { DailyEdition } from "@/types/paper";

type Result = { status: "ready" | "empty" | "unavailable"; synced: boolean; edition?: DailyEdition };
export function PaperReader() {
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true); setError("");
      try {
        // Resolve the browser profile before any server preference request.
        let preferences;
        try { preferences = readPreferenceBackup(window.localStorage)?.preferences; } catch {}
        if (!preferences) {
          try {
            const response = await fetch("/api/preferences", { cache: "no-store", signal: AbortSignal.timeout(8000) });
            if (response.ok) preferences = validatePreferences((await response.json()).preferences);
          } catch { /* Anonymous readers get a default edition, not a redirect. */ }
        }
        const query = new URLSearchParams();
        if (preferences) {
          query.set("topics", preferences.topics.join(",")); query.set("readingMinutes", String(preferences.readingMinutes)); query.set("timezone", preferences.timezone);
        }
        const response = await fetch(`/api/paper?${query}`, { cache: "no-store", signal: AbortSignal.timeout(30000) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not load your paper.");
        if (active) setResult(data);
      } catch { if (active) setError("We couldn’t reach the news desk. Your browser preferences are still available; please retry."); }
      finally { if (active) setLoading(false); }
    }
    void load();
    return () => { active = false; };
  }, [attempt]);
  return <div className="paper-shell"><Masthead date={result?.edition?.date} timezone={result?.edition?.preferences.timezone} /><main id="main-content">
    {loading ? <section className="empty-edition" role="status"><p className="eyebrow">At the news desk</p><h1>Preparing your morning paper…</h1><p>Finding stories for your perspective.</p></section>
      : !error && result?.status === "ready" && result.edition ? <EditionView edition={result.edition} localOnly={!result.synced} />
      : <section className="empty-edition"><p className="eyebrow">A little patience</p><h1>{result?.status === "empty" && !error ? "Your stories are still on their way." : "The news desk is reconnecting."}</h1><p role="status">{error || (result?.status === "empty" ? "No recent stories match these interests. Try other topics or check back soon." : "News sources are temporarily unavailable. Please retry shortly.")}</p><div className="form-actions"><button className="button" onClick={() => setAttempt((value) => value + 1)}>Try again</button><Link href="/onboarding">Edit your interests</Link><Link href="/archives">Saved editions</Link></div></section>}
  </main></div>;
}
