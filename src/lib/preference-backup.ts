import { validatePreferences, type PreferenceInput } from "./preferences";

export const PREFERENCE_BACKUP_KEY = "morning-paper.preferences.v1";
export type PreferenceBackup = { preferences: PreferenceInput; pending: boolean };
export function readPreferenceBackup(storage: Pick<Storage, "getItem">): PreferenceBackup | null {
  try {
    const value = JSON.parse(storage.getItem(PREFERENCE_BACKUP_KEY) ?? "null");
    if (!value || typeof value.pending !== "boolean") return null;
    return { preferences: validatePreferences(value.preferences), pending: value.pending };
  } catch { return null; }
}
export function writePreferenceBackup(storage: Pick<Storage, "setItem">, preferences: PreferenceInput, pending: boolean): boolean {
  try {
    storage.setItem(PREFERENCE_BACKUP_KEY, JSON.stringify({ preferences: validatePreferences(preferences), pending }));
    return true;
  } catch { return false; }
}
