import { NextRequest } from "next/server";
import { currentPreferences } from "@/lib/preference-store";
import { editions } from "@/lib/editions/service";
import { validEditionDate } from "@/lib/storage/types";
import { parseSignal } from "@/lib/learning";
import { saveSignal } from "@/lib/signal-store";

export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  const headers = { "Cache-Control": "private, no-store" };
  if (request.headers.get("origin") !== `${request.nextUrl.protocol}//${request.headers.get("host")}`) return Response.json({ error: "Invalid origin." }, { status: 403, headers });
  const local = () => Response.json({ success: true, message: "Signal logged locally", synced: false, saved: false }, { headers });
  let input;
  try {
    const body = await request.json();
    input = parseSignal({ ...body, type: body.type ?? body.action, date: body.date ?? new Date().toISOString().slice(0, 10) });
    if (!validEditionDate(input.date)) throw new Error();
    // Acknowledgement only: the browser owns local persistence and learning.
    if (body.action || process.env.VERCEL || process.env.STORAGE_DRIVER === "browser") return local();
  }
  catch { return Response.json({ error: "Invalid reader signal." }, { status: 400, headers }); }
  try {
    const preferences = await currentPreferences();
    if (!preferences) return local();
    const edition = await editions.read(preferences.id, input.date);
    const article = edition?.articles.find((item) => item.id === input.articleId);
    if (!article) return local();
    await saveSignal(preferences.id, { articleId: article.id, kind: input.kind, value: input.value, topics: article.topics, occurredAt: new Date().toISOString() });
    return Response.json({ success: true, saved: true, synced: true }, { headers });
  } catch { return local(); }
}
