import Link from "next/link";
import { redirect } from "next/navigation";
import { currentPreferences } from "@/lib/preference-store";
import { editions } from "@/lib/editions/service";
import { Masthead } from "@/components/masthead";
import { displayDate } from "@/components/edition-view";
import { StorageUnavailable } from "@/components/storage-unavailable";

export const runtime = "nodejs";

export default async function ArchivesPage() {
  let preferences;
  try { preferences = await currentPreferences(); } catch { return <StorageUnavailable />; }
  if (!preferences) redirect("/onboarding");
  let papers;
  try { papers = await editions.list(preferences.id); } catch { return <StorageUnavailable />; }
  return <div className="paper-shell"><Masthead /><main id="main-content" className="archive-page">
    <p className="eyebrow">The collection</p><h1>Your mornings, kept.</h1>
    <p className="intro">Every edition you open is saved here. Return to a story, revisit a thought, or pick up where you left off.</p>
    {papers.length ? <ol className="archive-list">{papers.map((paper) => <li key={paper.id}>
      <div><p className="eyebrow">{paper.articles.length} stories · {paper.preferences.topics.join(" / ")}</p>
        <h2><Link href={`/archives/${paper.date}`}>{displayDate(paper.date)}</Link></h2>
        <p>{paper.articles[0]?.title}</p></div><Link href={`/archives/${paper.date}`} aria-label={`Read edition for ${paper.date}`} className="archive-arrow">↗</Link>
    </li>)}</ol> : <section className="saved-card"><h2>A collection starts with one morning.</h2><p>Open today’s paper to save your first edition.</p></section>}
    <Link href="/paper" prefetch={false} className="button">Read today’s paper →</Link>
  </main></div>;
}
