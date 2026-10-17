import "server-only";
import { cookies } from "next/headers";
import { validatePreferences, type PreferenceInput } from "@/lib/preferences";
import { getStorage } from "@/lib/storage";
import { validReaderId, requireReaderId } from "@/lib/storage/types";

export const READER_COOKIE = "morning-reader";
export async function readPreferences(id: string | undefined) {
  if (!id || !validReaderId(id)) return null;
  return getStorage().getPreferences(id);
}
export async function currentPreferences() {
  return readPreferences((await cookies()).get(READER_COOKIE)?.value);
}
export async function savePreferences(id: string, input: PreferenceInput) {
  requireReaderId(id);
  return getStorage().savePreferences({ id, ...validatePreferences(input) });
}
