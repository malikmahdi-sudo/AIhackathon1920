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
  let input;
  try { input = parseSignal(await request.json()); if (!validEditionDate(input.date)) throw new Error(); }
  catch { return Response.json({ error: "Invalid reader signal." }, { status: 400, headers }); }
  try {
    const preferences = await currentPreferences();
    if (!preferences) return Response.json({ error: "Please complete onboarding." }, { status: 401, headers });
    const edition = await editions.read(preferences.id, input.date);
    const article = edition?.articles.find((item) => item.id === input.articleId);
    if (!article) return Response.json({ error: "Article not found in your edition." }, { status: 404, headers });
    await saveSignal(preferences.id, { articleId: article.id, kind: input.kind, value: input.value, topics: article.topics, occurredAt: new Date().toISOString() });
    return Response.json({ saved: true }, { headers });
  } catch { return Response.json({ error: "Couldn’t save feedback. Please retry." }, { status: 500, headers }); }
}
