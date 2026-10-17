export const TOPICS = ["Technology", "Artificial Intelligence", "Science", "Business", "World", "Pakistan", "Climate", "Health", "Sports", "Arts & Culture"] as const;
export const READING_TIMES = [5, 10, 20] as const;
export type PreferenceInput = { topics: string[]; readingMinutes: number; timezone: string };

export function validatePreferences(value: unknown): PreferenceInput {
  if (!value || typeof value !== "object") throw new Error("Please provide your reading preferences.");
  const { topics, readingMinutes, timezone } = value as Record<string, unknown>;
  if (!Array.isArray(topics) || topics.length < 1 || topics.length > 5 ||
    topics.some((topic) => typeof topic !== "string" || !TOPICS.includes(topic as typeof TOPICS[number])) ||
    new Set(topics).size !== topics.length) {
    throw new Error("Choose between 1 and 5 different topics from the list.");
  }
  if (typeof readingMinutes !== "number" || !READING_TIMES.includes(readingMinutes as typeof READING_TIMES[number])) {
    throw new Error("Choose a reading time of 5, 10, or 20 minutes.");
  }
  if (typeof timezone !== "string" || timezone.length > 100 || !timezone.trim()) throw new Error("Enter a valid timezone, such as Asia/Karachi.");
  try { new Intl.DateTimeFormat("en", { timeZone: timezone }); }
  catch { throw new Error("Enter a valid timezone, such as Asia/Karachi."); }
  return { topics: [...topics], readingMinutes, timezone };
}
