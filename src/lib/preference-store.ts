import "server-only";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { validatePreferences, type PreferenceInput } from "@/lib/preferences";
import type { ReaderPreferences } from "@/types/paper";

export const READER_COOKIE = "morning-reader";
const directory = path.join(process.cwd(), "data");
const validId = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id);
const state = globalThis as typeof globalThis & { preferenceWrites?: Promise<void> };

export async function readPreferences(id: string | undefined): Promise<ReaderPreferences | null> {
  if (!id || !validId(id)) return null;
  try {
    const value = JSON.parse(await readFile(path.join(directory, `${id}.json`), "utf8"));
    return { id, ...validatePreferences(value) };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export async function currentPreferences() {
  return readPreferences((await cookies()).get(READER_COOKIE)?.value);
}

export async function savePreferences(id: string, input: PreferenceInput) {
  if (!validId(id)) throw new Error("Invalid reader identifier.");
  const preferences = { id, ...validatePreferences(input) };
  // One Node process; serialize writes and replace files atomically, never truncate them.
  const operation = (state.preferenceWrites ?? Promise.resolve()).then(async () => {
    await mkdir(directory, { recursive: true });
    const temporary = path.join(directory, `${id}.${randomUUID()}.tmp`);
    try {
      await writeFile(temporary, JSON.stringify(preferences, null, 2), { flag: "wx" });
      await rename(temporary, path.join(directory, `${id}.json`));
    } finally { await rm(temporary, { force: true }); }
  });
  state.preferenceWrites = operation.catch(() => {});
  await operation;
  return preferences;
}
