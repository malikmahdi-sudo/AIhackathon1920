import type { DailyEdition, ReaderPreferences } from "@/types/paper";
export interface Storage {
  getPreferences(id: string): Promise<ReaderPreferences | null>;
  savePreferences(preferences: ReaderPreferences): Promise<ReaderPreferences>;
  getEdition(readerId: string, date: string): Promise<DailyEdition | null>;
  listEditions(readerId: string): Promise<DailyEdition[]>;
  saveEditionIfAbsent(edition: DailyEdition): Promise<DailyEdition>;
}
export const validReaderId = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id);
export function requireReaderId(id: string) {
  if (!validReaderId(id)) throw new Error("Invalid reader identifier.");
}
export function validEditionDate(date: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date;
}
export function requireEditionKey(id: string, date: string) {
  requireReaderId(id);
  if (!validEditionDate(date)) throw new Error("Invalid edition date.");
}
export function checkEdition(value: DailyEdition, readerId: string, date: string) {
  requireEditionKey(readerId, date);
  if (value.readerId !== readerId || value.date !== date || !Array.isArray(value.articles) || !value.preferences) throw new Error("Invalid saved edition.");
  return value;
}
