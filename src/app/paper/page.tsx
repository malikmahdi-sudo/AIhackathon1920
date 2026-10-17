import Link from "next/link";
import { redirect } from "next/navigation";
import { currentPreferences } from "@/lib/preference-store";
import { aggregateNews } from "@/lib/news/service";
import { editions } from "@/lib/editions/service";
import { Masthead } from "@/components/masthead";
import { EditionView } from "@/components/edition-view";

export const runtime = "nodejs";

export default async function PaperPage() {
  const preferences = await currentPreferences();
  if (!preferences) redirect("/onboarding");
  const result = await editions.today(preferences, aggregateNews);
  return (
    <div className="paper-shell"><Masthead /><main id="main-content">
      {result.status === "ready" ? <EditionView edition={result.edition} /> : (
        <section className="empty-edition">
          <p className="eyebrow">A little patience, a fresh perspective</p>
          <h1>{result.status === "unavailable" ? "The news desk is reconnecting." : "Your stories are still on their way."}</h1>
          <p>{result.status === "unavailable" ? "Our sources are temporarily unavailable. Your previous editions are still here." : "No recent stories match your interests right now. We haven’t saved an empty paper, so you can try again later."}</p>
          <div className="form-actions"><a className="button" href="/paper">Try again</a><Link href="/archives">Previous editions</Link><Link href="/onboarding">Edit interests</Link></div>
        </section>
      )}
    </main></div>
  );
}
