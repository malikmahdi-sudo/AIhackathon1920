/** Shared contracts for reader preferences and future daily editions. */
export type ReaderPreferences = {
  id: string;
  topics: string[];
  readingMinutes: number;
  timezone: string;
};

export type Article = {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  summary: string;
  topics: string[];
};

export type DailyEdition = {
  id: string;
  readerId: string;
  date: string;
  generatedAt: string;
  articles: (Article & { reason: string; matchedTopics: string[]; estimatedReadingMinutes: number })[];
  preferences: Omit<ReaderPreferences, "id">;
  sourceNotice: string | null;
};

export type ReaderSignal = {
  readerId: string;
  articleId: string;
  type: "click" | "skip" | "like" | "dislike" | "reading-time";
  occurredAt: string;
  durationMs?: number;
};
