"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { READING_TIMES, TOPICS, validatePreferences } from "@/lib/preferences";
import type { ReaderPreferences } from "@/types/paper";

export function OnboardingForm({ initial }: { initial: ReaderPreferences | null }) {
  const [topics, setTopics] = useState<string[]>(initial?.topics ?? []);
  const [readingMinutes, setReadingMinutes] = useState(initial?.readingMinutes ?? 10);
  const [timezone, setTimezone] = useState(initial?.timezone ?? "Asia/Karachi");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try { validatePreferences({ topics, readingMinutes, timezone }); }
    catch (error) { setError((error as Error).message); return; }
    setSaving(true);
    try {
      const response = await fetch("/api/preferences", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topics, readingMinutes, timezone }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Please try again.");
      setSaved(true);
    } catch (error) { setError(error instanceof Error ? error.message : "We couldn’t save. Please try again."); }
    finally { setSaving(false); }
  }

  if (saved) return (
    <section className="saved-card" aria-labelledby="saved-title">
      <p className="eyebrow" role="status">Preferences saved</p>
      <h2 id="saved-title">Your perspective is taking shape.</h2>
      <p>You’re following <strong>{topics.join(", ")}</strong>.</p>
      <p>{readingMinutes} minutes each morning · {timezone}</p>
      <p className="muted">Your choices will guide your next new edition. Any paper already saved today stays in your collection as it is.</p>
      <div className="form-actions"><Link className="button" href="/paper" prefetch={false}>Read my paper →</Link><button className="text-button" onClick={() => setSaved(false)}>Edit preferences</button></div>
    </section>
  );

  return (
    <form onSubmit={submit} className="preferences-form">
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
      <p className="field-hint">No account needed. Preferences are saved on this server and linked to this browser with a cookie. Clearing cookies resets access.</p>
    </form>
  );
}
