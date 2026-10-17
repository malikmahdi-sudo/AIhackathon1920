import { NextRequest } from "next/server";
import { currentPreferences } from "@/lib/preference-store";
import { editions } from "@/lib/editions/service";
import { validEditionDate } from "@/lib/storage/types";
import { createBriefing, type Briefing } from "@/lib/briefing";

export const runtime = "nodejs";
// Disposable per-instance cache also shares concurrent requests. Not a global rate limiter.
const cache = new Map<string, { expires: number; result: Promise<Briefing> }>();
export async function POST(request: NextRequest, { params }: { params: Promise<{ date: string }> }) {
  const headers = { "Cache-Control": "private, no-store" };
  if (request.headers.get("origin") !== `${request.nextUrl.protocol}//${request.headers.get("host")}`) return Response.json({ error: "Invalid origin." }, { status: 403, headers });
  try {
    const preferences = await currentPreferences();
    if (!preferences) return Response.json({ error: "Please complete onboarding first." }, { status: 401, headers });
    const { date } = await params;
    if (!validEditionDate(date)) return Response.json({ error: "Invalid edition date." }, { status: 400, headers });
    const edition = await editions.read(preferences.id, date);
    if (!edition) return Response.json({ error: "This edition was not found in your archive." }, { status: 404, headers });
    const key = `${preferences.id}:${date}:${edition.generatedAt}`;
    let entry = cache.get(key);
    if (!entry || entry.expires <= Date.now()) {
      for (const [key, value] of cache) if (value.expires <= Date.now()) cache.delete(key);
      if (cache.size >= 200) cache.delete(cache.keys().next().value!);
      entry = { expires: Date.now() + 3600_000, result: createBriefing(edition, { apiKey: process.env.OPENAI_API_KEY, model: process.env.OPENAI_MODEL }) };
      cache.set(key, entry);
      const current = entry;
      void entry.result.then((result) => { if (result.mode === "digest") current.expires = Date.now() + 60_000; });
    }
    return Response.json(await entry.result, { headers });
  } catch { return Response.json({ error: "We couldn’t load this edition. Please try again." }, { status: 500, headers }); }
}
