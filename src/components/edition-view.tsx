import { ReaderSignals } from "./reader-signals";
import { DailyBriefing } from "./daily-briefing";
import { StoryArt } from "./story-art";
import Link from "next/link";
import { DownloadPdf } from "./download-pdf";
import type { DailyEdition } from "@/types/paper";

export function displayDate(date: string) {
  return new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
}

export function EditionView({ edition }: { edition: DailyEdition }) {
  const minutes = edition.articles.reduce((sum, article) => sum + article.estimatedReadingMinutes, 0);
  return (
    <>
      <header className="edition-heading">
        <p className="eyebrow">Your personal edition · <time dateTime={edition.date}>{displayDate(edition.date)}</time></p>
        <h1>A fresh perspective.<br /><em>A moment for you.</em></h1>
        <p className="intro">{edition.articles.length} stories selected around {edition.preferences.topics.join(", ")}. About {minutes} minutes to explore.</p>
        <div className="edition-tools"><DownloadPdf date={edition.date} /><Link href="/archives">Browse your editions →</Link><Link href="/onboarding">Refine your interests</Link></div>
      </header>
      <DailyBriefing key={edition.id} edition={edition} />
      {edition.sourceNotice && <p className="edition-notice">{edition.sourceNotice}</p>}
      <p className="story-reason">Likes, skips, clicks, and time viewing stories help shape future editions. Skips and bookmarks are remembered on this device; your saved paper and PDF stay unchanged.</p>
      <div className="reading-grid">
        {edition.articles.map((article, index) => (
          <article className={`story ${index === 0 ? "lead-story" : ""}`} key={article.id}>
            <ReaderSignals key={`${edition.id}:${article.id}`} date={edition.date} articleId={article.id} editionId={edition.id}>
            <StoryArt topic={article.matchedTopics[0]} index={index} />
            <p className="eyebrow">{String(index + 1).padStart(2, "0")} / {article.matchedTopics.join(" · ")}</p>
            <h2><a href={article.url} target="_blank" rel="noopener noreferrer">{article.title}</a></h2>
            <p className="story-meta">{article.source} · <time dateTime={article.publishedAt}>{new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: edition.preferences.timezone }).format(new Date(article.publishedAt))}</time></p>
            <p className="story-summary">{article.summary || "Read the full story at the original publisher."}</p>
            <p className="story-reason">{article.reason}</p>
            <a className="source-link" href={article.url} target="_blank" rel="noopener noreferrer">Read at {article.source} <span aria-hidden="true">↗</span><span className="sr-only"> (opens in a new tab)</span></a>
            </ReaderSignals>
          </article>
        ))}
      </div>
      <footer className="edition-footer">
        <p>End of your edition. Take a little perspective into your day.</p>
        <p>Publisher excerpts, with links to the original reporting. Reading time is an estimate of 3 minutes per article.</p>
        <p>Saved in {edition.preferences.timezone}. Preference changes apply to the next new edition.</p>
      </footer>
    </>
  );
}
