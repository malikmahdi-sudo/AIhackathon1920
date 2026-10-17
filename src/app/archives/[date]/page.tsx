import { notFound, redirect } from "next/navigation";
import { currentPreferences } from "@/lib/preference-store";
import { editions } from "@/lib/editions/service";
import { validEditionDate } from "@/lib/editions/store";
import { Masthead } from "@/components/masthead";
import { EditionView } from "@/components/edition-view";
import { StorageUnavailable } from "@/components/storage-unavailable";

export const runtime = "nodejs";

export default async function ArchivedPaper({ params }: { params: Promise<{ date: string }> }) {
  let preferences;
  try { preferences = await currentPreferences(); } catch { return <StorageUnavailable />; }
  if (!preferences) redirect("/onboarding");
  const { date } = await params;
  if (!validEditionDate(date)) notFound();
  let edition;
  try { edition = await editions.read(preferences.id, date); } catch { return <StorageUnavailable />; }
  if (!edition) notFound();
  return <div className="paper-shell"><Masthead date={edition.date} timezone={edition.preferences.timezone} /><main id="main-content"><EditionView edition={edition} /></main></div>;
}
