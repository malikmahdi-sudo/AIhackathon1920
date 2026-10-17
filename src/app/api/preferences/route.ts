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
    return NextResponse.json({ error: "We couldn’t load your preferences. Please try again." }, { status: 503, headers: { "Cache-Control": "private, no-store" } });
  }
}

export async function POST(request: NextRequest) {
  // Next.js can normalize loopback hostnames internally. Compare the browser's
  // Origin against its HTTP Host, while retaining the request protocol check.
  const expectedOrigin = `${request.nextUrl.protocol}//${request.headers.get("host")}`;
  if (request.headers.get("origin") !== expectedOrigin) {
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
    const response = NextResponse.json({ preferences, persisted: true }, { headers: { "Cache-Control": "private, no-store" } });
    response.cookies.set(READER_COOKIE, preferences.id, {
      httpOnly: true, sameSite: "lax", secure: request.nextUrl.protocol === "https:",
      path: "/", maxAge: 60 * 60 * 24 * 365,
    });
    return response;
  } catch {
    // The client must confirm its browser backup before reporting a saved state.
    // Do not issue a reader cookie for a profile that does not exist in storage.
    return NextResponse.json({ preferences: input, persisted: false, storage: "browser", message: "Server storage is unavailable. Keep these choices in this browser and retry syncing later." }, { headers: { "Cache-Control": "private, no-store" } });
  }
}
