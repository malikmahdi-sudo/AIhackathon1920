import { NextRequest } from "next/server";
import { fallbackPdf, postedPdf } from "@/lib/pdf/response";

export const runtime = "nodejs";
export async function GET(request: NextRequest) { return fallbackPdf(request); }
export async function POST(request: NextRequest) { return postedPdf(request); }
