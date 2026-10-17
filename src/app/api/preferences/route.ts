import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { validatePreferences } from "@/lib/preferences";
import { readPreferences, READER_COOKIE, savePreferences } from "@/lib/preference-store";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const preferences = await readPreferences(request.cookies.get(READER_COOKIE)?.value);
    return NextResponse.json({ preferences }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "We couldn’t load your preferences. Please try again." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Please save preferences from this site." }, { status: 403 });
  }
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return NextResponse.json({ error: "Expected JSON preferences." }, { status: 415 });
  }
  let input;
  try { input = validatePreferences(await request.json()); }
  catch (error) {
    return NextResponse.json({ error: error instanceof SyntaxError ? "Invalid JSON." : (error as Error).message }, { status: 400 });
  }
  try {
    const existing = await readPreferences(request.cookies.get(READER_COOKIE)?.value);
    const preferences = await savePreferences(existing?.id ?? randomUUID(), input);
    const response = NextResponse.json({ preferences }, { headers: { "Cache-Control": "private, no-store" } });
    response.cookies.set(READER_COOKIE, preferences.id, {
      httpOnly: true, sameSite: "lax", secure: request.nextUrl.protocol === "https:",
      path: "/", maxAge: 60 * 60 * 24 * 365,
    });
    return response;
  } catch {
    return NextResponse.json({ error: "We couldn’t save your preferences. Your choices are still here; please try again." }, { status: 500 });
  }
}
