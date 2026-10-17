import { notFound, redirect } from "next/navigation";
import { currentPreferences } from "@/lib/preference-store";
import { editions } from "@/lib/editions/service";
import { validEditionDate } from "@/lib/editions/store";
import { Masthead } from "@/components/masthead";
import { EditionView } from "@/components/edition-view";

export const runtime = "nodejs";

export default async function ArchivedPaper({ params }: { params: Promise<{ date: string }> }) {
  const preferences = await currentPreferences();
  if (!preferences) redirect("/onboarding");
  const { date } = await params;
  if (!validEditionDate(date)) notFound();
  const edition = await editions.read(preferences.id, date);
  if (!edition) notFound();
  return <div className="paper-shell"><Masthead /><main id="main-content"><EditionView edition={edition} /></main></div>;
}
