"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { READING_TIMES, TOPICS, validatePreferences } from "@/lib/preferences";
import type { ReaderPreferences } from "@/types/paper";
import { readPreferenceBackup, writePreferenceBackup } from "@/lib/preference-backup";

export function OnboardingForm({ initial }: { initial: ReaderPreferences | null }) {
  const [topics, setTopics] = useState<string[]>(initial?.topics ?? []);
  const [readingMinutes, setReadingMinutes] = useState(initial?.readingMinutes ?? 10);
  const [timezone, setTimezone] = useState(initial?.timezone ?? "Asia/Karachi");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [browserOnly, setBrowserOnly] = useState(false);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function restore() {
      let backup = null;
      try { backup = readPreferenceBackup(window.localStorage); } catch {}
      let preferences = initial;
      try {
        const response = await fetch("/api/preferences", { cache: "no-store", signal: AbortSignal.timeout(10000) });
        if (!response.ok) throw new Error("Storage unavailable");
        preferences = (await response.json()).preferences;
      } catch { preferences = null; }
      if (!active) return;
      const restored = backup?.pending || !preferences ? backup?.preferences ?? preferences : preferences;
      if (restored) {
        setTopics(restored.topics); setReadingMinutes(restored.readingMinutes); setTimezone(restored.timezone);
        if (backup?.pending || !preferences) setNotice("Restored your browser backup. Save to retry syncing your choices.");
      }
      setLoading(false);
    }
    void restore();
    return () => { active = false; };
  }, [initial]);

  function backupChoices(pending: boolean) {
    try { return writePreferenceBackup(window.localStorage, { topics, readingMinutes, timezone }, pending); }
    catch { return false; }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try { validatePreferences({ topics, readingMinutes, timezone }); }
    catch (error) { setError((error as Error).message); return; }
    setSaving(true);
    const backedUp = backupChoices(true);
    try {
      const response = await fetch("/api/preferences", {
        method: "POST", signal: AbortSignal.timeout(15000), headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topics, readingMinutes, timezone }),
      });
      const result = await response.json();
      if (!response.ok) {
        if (response.status < 500) { setError(result.error ?? "Please try again."); return; }
        throw new Error("Server unavailable");
      }
      const unsynced = result.synced === false || result.persisted === false;
      if (unsynced && !backedUp) {
        setError("Server storage and browser storage are unavailable. Your choices are still in this form; please retry."); return;
      }
      setBrowserOnly(unsynced);
      if (!unsynced) backupChoices(false);
      setSaved(true);
    } catch {
      if (backedUp) { setBrowserOnly(true); setSaved(true); }
      else setError("We couldn’t save to the server or this browser. Your choices are still here; please retry.");
    }
    finally { setSaving(false); }
  }

  if (saved) return (
    <section className="saved-card" aria-labelledby="saved-title">
      <p className="eyebrow" role="status">{browserOnly ? "Saved in this browser" : "Preferences saved"}</p>
      <h2 id="saved-title">Your perspective is taking shape.</h2>
      <p>You’re following <strong>{topics.join(", ")}</strong>.</p>
      <p>{readingMinutes} minutes each morning · {timezone}</p>
      <p className="muted">{browserOnly ? "Your choices are saved on this device. Server sync is pending. Clearing browser storage removes this backup." : "Your choices will guide your next new edition. Any paper already saved today stays in your collection as it is."}</p>
      <div className="form-actions"><Link className="button" href="/paper" prefetch={false}>Read my paper →</Link><button className="text-button" onClick={() => setSaved(false)}>{browserOnly ? "Edit or retry sync" : "Edit preferences"}</button></div>
    </section>
  );

  if (loading) return <p role="status">Loading your preferences…</p>;

  return (
    <form onSubmit={submit} className="preferences-form">
      {notice && <p role="status">{notice}</p>}
      {topics.length > 0 && <div className="form-actions"><Link className="button" href="/paper" prefetch={false}>Read my paper →</Link></div>}
      <fieldset disabled={saving} aria-describedby="topics-hint">
        <legend>01 / Pick your interests</legend>
        <p id="topics-hint" className="field-hint">Choose 1–5 topics. {topics.length} of 5 selected.</p>
        <div className="topic-grid">{TOPICS.map((topic) => (
          <label className="topic-choice" key={topic}>
            <input type="checkbox" name="topics" value={topic} checked={topics.includes(topic)}
              disabled={!topics.includes(topic) && topics.length >= 5}
              onChange={(event) => { setTopics(event.target.checked ? [...topics, topic] : topics.filter((item) => item !== topic)); setError(""); }} />
            <span>{topic}</span>
          </label>
        ))}</div>
      </fieldset>
      <fieldset disabled={saving}>
        <legend>02 / Make time for a little perspective</legend>
        <p className="field-hint">How long would you like to read each morning?</p>
        <div className="time-options">{READING_TIMES.map((minutes) => (
          <label className="topic-choice" key={minutes}><input type="radio" name="reading-time" value={minutes} checked={readingMinutes === minutes} onChange={() => setReadingMinutes(minutes)} /><span>{minutes} minutes</span></label>
        ))}</div>
      </fieldset>
      <fieldset disabled={saving}>
        <legend>03 / Set your local morning</legend>
        <label htmlFor="timezone" className="field-hint">Timezone</label>
        <div className="timezone-row">
          <input id="timezone" name="timezone" type="text" required maxLength={100} value={timezone} onChange={(event) => setTimezone(event.target.value)} aria-describedby="timezone-hint" />
          <button type="button" className="text-button" onClick={() => setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone)}>Use my device timezone</button>
        </div>
        <p id="timezone-hint" className="field-hint">For example, Asia/Karachi or Europe/London. Used to date your daily edition.</p>
      </fieldset>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button type="submit" className="button" disabled={saving}>{saving ? "Saving your choices…" : initial ? "Save changes" : "Save my preferences"}<span aria-hidden="true">→</span></button>
      <p className="field-hint">No account needed. Your saved preferences are linked to this browser with a cookie. Clearing cookies resets access.</p>
    </form>
  );
}
