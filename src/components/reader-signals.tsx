"use client";
import { useEffect, useRef, useState } from "react";
import { readBrowserState, saveBrowserState } from "@/lib/browser-state";
type State = { choice: string; bookmark: boolean; read: boolean };
type Pending = { type: string; durationMs?: number };
const validState = (v: unknown): v is State => !!v && typeof v === "object" && ["", "like", "dislike", "skip"].includes((v as State).choice) && typeof (v as State).bookmark === "boolean" && typeof (v as State).read === "boolean";
const validQueue = (v: unknown): v is Pending[] => Array.isArray(v) && v.length <= 3 && v.every((x) => x && ["like", "dislike", "skip", "clear", "click", "reading-time"].includes(x.type) && (x.type !== "reading-time" || (typeof x.durationMs === "number" && x.durationMs >= 1000 && x.durationMs <= 120000)));
export function ReaderSignals({ date, articleId, editionId, localOnly = false, children }: { date: string; articleId: string; editionId: string; localOnly?: boolean; children: React.ReactNode }) {
  const container = useRef<HTMLDivElement>(null);
  const key = `morning-paper.story.${editionId}.${articleId}`;
  const state = useRef<State>({ choice: "", bookmark: false, read: false });
  const [display, setDisplay] = useState<State>({ choice: "", bookmark: false, read: false });
  const [message, setMessage] = useState("");
  const pending = useRef<Pending[]>([]);
  const flushing = useRef(false);
  function update(value: Partial<State>) {
    state.current = { ...state.current, ...value }; setDisplay(state.current);
    return saveBrowserState(key, state.current);
  }
  async function flush() {
    if (localOnly || flushing.current) return;
    flushing.current = true;
    try {
      while (pending.current.length) {
        const item = pending.current[0];
        const response = await fetch("/api/signals", { method: "POST", signal: AbortSignal.timeout(10000), headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date, articleId, ...item }) });
        if (!response.ok) throw new Error();
        pending.current = pending.current.filter((entry) => entry !== item);
        saveBrowserState(`${key}.pending`, pending.current);
      }
      setMessage("Feedback synced for future editions.");
    } catch { setMessage(saveBrowserState(`${key}.pending`, pending.current) ? "Saved on this device. Sync retries when you reconnect or revisit." : "Offline: changes last for this visit only. Browser storage is unavailable."); }
    finally { flushing.current = false; }
  }
  function record(item: Pending) {
    if (localOnly) { setMessage("Reading state kept in this browser. Learning requires server sync."); return; }
    const group = (type: string) => ["click", "reading-time"].includes(type) ? type : "feedback";
    pending.current = [...pending.current.filter((entry) => group(entry.type) !== group(item.type)), item];
    saveBrowserState(`${key}.pending`, pending.current); void flush();
  }
  useEffect(() => {
    const retry = () => { if (pending.current.length) void flush(); };
    const restore = () => {
      const restored = readBrowserState(key, validState);
      if (restored) { state.current = restored; setDisplay(restored); }
      pending.current = readBrowserState(`${key}.pending`, validQueue) ?? [];
      retry();
    };
    const timer = setTimeout(restore, 0);
    window.addEventListener("online", retry);
    return () => { clearTimeout(timer); window.removeEventListener("online", retry); };
    // State and retry queue are scoped to this immutable edition and story.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  useEffect(() => {
    const element = container.current;
    if (!element || display.choice === "skip" || display.read || !("IntersectionObserver" in window)) return;
    let visible = false, elapsed = 0, sent = false;
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }, { threshold: .25 });
    observer.observe(element);
    const timer = setInterval(() => {
      if (!visible || document.visibilityState !== "visible" || sent) return;
      elapsed += 1000;
      if (elapsed >= 20000) { sent = true; update({ read: true }); record({ type: "reading-time", durationMs: elapsed }); }
    }, 1000);
    return () => { clearInterval(timer); observer.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, display.choice, display.read]);
  function feedback(type: string) { update({ choice: type === "clear" ? "" : type }); record({ type }); }
  return <div ref={container} onClickCapture={(event) => {
    if ((event.target as HTMLElement).closest('a[href^="http"]')) { update({ read: true }); record({ type: "click" }); }
  }}>
    <div className={display.choice === "skip" ? "story-content is-skipped" : "story-content"}>{children}</div>
    {display.choice === "skip" && <p className="skip-message">Skipped. Ready whenever you are.</p>}
    <div className="reader-feedback" aria-label="Article feedback">
      <button aria-pressed={display.read} onClick={() => { update({ read: true }); record({ type: "click" }); }}>{display.read ? "Read" : "Mark read"}</button>
      <button aria-pressed={display.bookmark} onClick={() => { const saved = update({ bookmark: !display.bookmark }); setMessage(saved ? "Bookmark updated on this device." : "Bookmark kept for this visit only."); }}>{display.bookmark ? "Bookmarked" : "Bookmark"}</button>
      {[["like", "More like this"], ["dislike", "Less like this"], ["skip", "Skip"]].map(([type, label]) => <button key={type} aria-pressed={display.choice === type} onClick={() => feedback(type)}>{label}</button>)}
      {display.choice && <button onClick={() => feedback("clear")}>Undo</button>}
    </div><p className="story-reason feedback-status" role="status">{message}</p>
  </div>;
}
