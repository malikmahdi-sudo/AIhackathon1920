import { currentPreferences } from "@/lib/preference-store";
import { editions } from "@/lib/editions/service";
import { validEditionDate } from "@/lib/storage/types";
import { createNewspaperPdf } from "@/lib/pdf/newspaper";

export const runtime = "nodejs";
export async function GET(_request: Request, { params }: { params: Promise<{ date: string }> }) {
  const headers = { "Cache-Control": "private, no-store" };
  try {
    const preferences = await currentPreferences();
    if (!preferences) return Response.json({ error: "Please complete onboarding first." }, { status: 401, headers });
    const { date } = await params;
    if (!validEditionDate(date)) return Response.json({ error: "Invalid edition date." }, { status: 400, headers });
    const edition = await editions.read(preferences.id, date);
    if (!edition) return Response.json({ error: "This edition was not found in your archive." }, { status: 404, headers });
    const bytes = await createNewspaperPdf(edition);
    return new Response(new Uint8Array(bytes), { headers: { ...headers, "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="morning-paper-${date}.pdf"` } });
  } catch { return Response.json({ error: "We couldn’t create your PDF. Please try again." }, { status: 500, headers }); }
}
