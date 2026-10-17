import { NextResponse } from "next/server";
import { currentPreferences } from "@/lib/preference-store";
import { aggregateNews } from "@/lib/news/service";
import { rankArticles } from "@/lib/news/rank";

export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store" };

export async function GET() {
  try {
    const preferences = await currentPreferences();
    if (!preferences) return NextResponse.json({ error: "Save your preferences first.", onboardingUrl: "/onboarding" }, { status: 401, headers });
    const { articles, feeds } = await aggregateNews();
    if (feeds.every((feed) => feed.status === "unavailable")) {
      return NextResponse.json({ error: "News sources are temporarily unavailable. Please try again shortly.", articles: [], feeds }, { status: 503, headers });
    }
    const now = Date.now();
    const ranked = rankArticles(articles, preferences, now);
    return NextResponse.json({
      generatedAt: new Date(now).toISOString(),
      date: new Intl.DateTimeFormat("en-CA", { timeZone: preferences.timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now),
      articles: ranked, feeds, candidateCount: articles.length,
      estimatedReadingMinutes: ranked.reduce((total, article) => total + article.estimatedReadingMinutes, 0),
      readingTimeNote: "Planning estimate: 3 minutes per original article; actual length varies.",
      message: ranked.length ? null : "No recent stories match your interests yet. Try again later or update your preferences.",
    }, { headers });
  } catch {
    return NextResponse.json({ error: "We couldn’t prepare recommendations. Please try again." }, { status: 500, headers });
  }
}
