import { NextRequest } from "next/server";
import { currentPreferences } from "@/lib/preference-store";
import { editions } from "@/lib/editions/service";
import { validEditionDate } from "@/lib/storage/types";
import { fallbackPdf, pdfResponse, postedPdf } from "@/lib/pdf/response";

export const runtime = "nodejs";
export async function GET(request: NextRequest, { params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  if (!validEditionDate(date)) return Response.json({ error: "Invalid edition date." }, { status: 400 });
  try {
    const preferences = await currentPreferences();
    const edition = preferences ? await editions.read(preferences.id, date) : null;
    if (edition) return pdfResponse(edition);
  } catch { /* Stateless export needs no profile, database or filesystem writes. */ }
  return fallbackPdf(request, date);
}
export async function POST(request: NextRequest) { return postedPdf(request); }
