import "server-only";
import { cookies } from "next/headers";
import { validatePreferences, type PreferenceInput } from "@/lib/preferences";
import { getStorage } from "@/lib/storage";
import { validReaderId, requireReaderId } from "@/lib/storage/types";

export const READER_COOKIE = "morning-reader";
export async function readPreferences(id: string | undefined) {
  if (process.env.VERCEL || process.env.STORAGE_DRIVER === "browser" || !id || !validReaderId(id)) return null;
  return getStorage().getPreferences(id);
}
export async function currentPreferences() {
  return readPreferences((await cookies()).get(READER_COOKIE)?.value);
}
export async function savePreferences(id: string, input: PreferenceInput) {
  if (process.env.VERCEL || process.env.STORAGE_DRIVER === "browser") throw new Error("Preferences are stored in this browser.");
  requireReaderId(id);
  return getStorage().savePreferences({ id, ...validatePreferences(input) });
}
