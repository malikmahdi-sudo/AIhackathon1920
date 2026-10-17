"use client";
import { useEffect, useRef, useState } from "react";

export function ReaderSignals({ date, articleId, children }: { date: string; articleId: string; children: React.ReactNode }) {
  const container = useRef<HTMLDivElement>(null);
  const [choice, setChoice] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    const element = container.current;
    if (!element || choice === "skip") return;
    let visible = false, elapsed = 0, sent = false;
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }, { threshold: .25 });
    observer.observe(element);
    const timer = setInterval(() => {
      if (!visible || document.visibilityState !== "visible" || sent) return;
      elapsed += 1000;
      if (elapsed >= 20_000) {
        sent = true;
        void fetch("/api/signals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date, articleId, type: "reading-time", durationMs: elapsed }) }).catch(() => {});
      }
    }, 1000);
    return () => { clearInterval(timer); observer.disconnect(); };
  }, [date, articleId, choice]);
  async function feedback(type: string) {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/signals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date, articleId, type }) });
      if (!response.ok) throw new Error("Couldn’t save feedback. Please retry.");
      setChoice(type === "clear" ? "" : type); setMessage("Saved for future editions.");
    } catch (error) { setMessage((error as Error).message); }
    finally { setBusy(false); }
  }
  return <div ref={container} onClickCapture={(event) => {
    if ((event.target as HTMLElement).closest('a[href^="http"]')) void fetch("/api/signals", { method: "POST", keepalive: true, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date, articleId, type: "click" }) }).catch(() => {});
  }}>
    {choice === "skip" ? <p>Story skipped for this visit.</p> : children}
    <div className="reader-feedback" aria-label="Article feedback">
      {[["like", "More like this"], ["dislike", "Less like this"], ["skip", "Skip"]].map(([type, label]) => <button key={type} disabled={busy} aria-pressed={choice === type} onClick={() => feedback(type)}>{label}</button>)}
      {choice && <button disabled={busy} onClick={() => feedback("clear")}>Undo feedback</button>}
    </div><p className="story-reason" role="status">{message}</p>
  </div>;
}
