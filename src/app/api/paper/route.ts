import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { currentPreferences } from "@/lib/preference-store";
import { TOPICS, validatePreferences } from "@/lib/preferences";
import { aggregateNews } from "@/lib/news/service";
import { rankArticles } from "@/lib/news/rank";
import { editions } from "@/lib/editions/service";
import { localEditionDate } from "@/lib/editions/store";

export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store" };
export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams;
  let fallback;
  let weights: Record<string, number> = {};
  try {
    fallback = validatePreferences({
      topics: query.has("topics") ? query.get("topics")!.split(",") : ["World", "Technology"],
      readingMinutes: query.has("readingMinutes") ? Number(query.get("readingMinutes")) : 10,
      timezone: query.get("timezone") ?? "UTC",
    });
    if (query.has("weights")) {
      const raw = query.get("weights")!;
      if (raw.length > 2000) throw new Error();
      const value = JSON.parse(raw);
      if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error();
      weights = Object.fromEntries(Object.entries(value).map(([topic, weight]) => {
        if (!TOPICS.includes(topic as typeof TOPICS[number]) || typeof weight !== "number" || !Number.isFinite(weight)) throw new Error();
        return [topic, Math.max(-25, Math.min(25, weight))];
      }));
    }
  } catch { return Response.json({ error: "Invalid reading preferences." }, { status: 400, headers }); }
  try {
    // Browser parameters are preferences only, never an identity or archive key.
    const preferences = await currentPreferences().catch(() => null);
    if (preferences) {
      try { return Response.json({ ...await editions.today(preferences, aggregateNews), synced: true }, { headers }); }
      catch { /* A read-only preview remains available when persistence is down. */ }
    }
    const input = query.has("topics") ? fallback : preferences ?? fallback;
    const { articles, feeds } = await aggregateNews();
    if (feeds.every((feed) => feed.status === "unavailable")) return Response.json({ status: "unavailable", synced: false }, { headers });
    const now = Date.now();
    const selected = rankArticles(articles, input, now, weights);
    if (!selected.length) return Response.json({ status: "empty", synced: false }, { headers });
    return Response.json({ status: "ready", synced: false, edition: {
      id: randomUUID(), readerId: "browser-preview", date: localEditionDate(now, input.timezone), generatedAt: new Date(now).toISOString(),
      preferences: { topics: input.topics, readingMinutes: input.readingMinutes, timezone: input.timezone }, articles: selected,
      sourceNotice: "Browser reading mode: feedback stays on this device and shapes future previews. PDF download and headline digest are available. This paper is not saved to a server archive.",
    } }, { headers });
  } catch { return Response.json({ error: "The news desk is temporarily unavailable. Please retry." }, { status: 503, headers }); }
}
