import "server-only";
import type { NextRequest } from "next/server";
import { createNewspaperPdf } from "./newspaper";
import { parsePdfEdition } from "./edition-input";
import { validatePreferences } from "../preferences";
import { aggregateNews } from "../news/service";
import { rankArticles } from "../news/rank";
import { localEditionDate } from "../editions/store";
import type { DailyEdition } from "../../types/paper";

const headers = { "Cache-Control": "private, no-store" };
export async function pdfResponse(edition: DailyEdition) {
  const bytes = await createNewspaperPdf(edition);
  return new Response(new Uint8Array(bytes), { headers: { ...headers, "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="morning-paper-${edition.date}.pdf"` } });
}
export async function fallbackPdf(request: NextRequest, date?: string) {
  const query = request.nextUrl.searchParams;
  let preferences;
  try { preferences = validatePreferences({ topics: query.get("topics")?.split(",") ?? ["Technology", "World"], readingMinutes: Number(query.get("readingMinutes") ?? 10), timezone: query.get("timezone") ?? "UTC" }); }
  catch { preferences = { topics: ["Technology", "World"], readingMinutes: 10, timezone: "UTC" }; }
  const now = Date.now();
  const edition: DailyEdition = { id: "stateless-export", readerId: "browser-export", date: date ?? localEditionDate(now, preferences.timezone), generatedAt: new Date(now).toISOString(), preferences, articles: [], sourceNotice: "On-demand export. To export the exact paper on screen, use its Download PDF button." };
  try { edition.articles = rankArticles((await aggregateNews()).articles, preferences, now); } catch {}
  if (!edition.articles.length) edition.sourceNotice = "News feeds are unavailable or have no matching stories. This printable edition contains no fabricated news; try again later.";
  return pdfResponse(edition);
}
export async function postedPdf(request: NextRequest) {
  if (request.headers.get("origin") !== `${request.nextUrl.protocol}//${request.headers.get("host")}`) return Response.json({ error: "Invalid origin." }, { status: 403, headers });
  try {
    // Bound the streamed input before JSON parsing or font rendering.
    const reader = request.body?.getReader();
    if (!reader) throw new Error();
    const chunks: Uint8Array[] = []; let size = 0;
    for (;;) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > 100_000) { await reader.cancel(); return Response.json({ error: "Edition too large." }, { status: 413, headers }); } chunks.push(value); }
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    const edition = parsePdfEdition(JSON.parse(new TextDecoder().decode(bytes)));
    return await pdfResponse(edition);
  } catch { return Response.json({ error: "Unable to export this edition. Please use Print / Save as PDF." }, { status: 400, headers }); }
}
