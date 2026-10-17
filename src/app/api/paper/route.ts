import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { currentPreferences } from "@/lib/preference-store";
import { validatePreferences } from "@/lib/preferences";
import { aggregateNews } from "@/lib/news/service";
import { rankArticles } from "@/lib/news/rank";
import { editions } from "@/lib/editions/service";
import { localEditionDate } from "@/lib/editions/store";

export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store" };
export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams;
  let fallback;
  try {
    fallback = validatePreferences({
      topics: query.has("topics") ? query.get("topics")!.split(",") : ["World", "Technology"],
      readingMinutes: query.has("readingMinutes") ? Number(query.get("readingMinutes")) : 10,
      timezone: query.get("timezone") ?? "UTC",
    });
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
    const selected = rankArticles(articles, input, now);
    if (!selected.length) return Response.json({ status: "empty", synced: false }, { headers });
    return Response.json({ status: "ready", synced: false, edition: {
      id: randomUUID(), readerId: "browser-preview", date: localEditionDate(now, input.timezone), generatedAt: new Date(now).toISOString(),
      preferences: { topics: input.topics, readingMinutes: input.readingMinutes, timezone: input.timezone }, articles: selected,
      sourceNotice: "Browser reading mode: this paper is not saved to your server archive. Print and headline digest are available; learning will resume after server sync.",
    } }, { headers });
  } catch { return Response.json({ error: "The news desk is temporarily unavailable. Please retry." }, { status: 503, headers }); }
}
