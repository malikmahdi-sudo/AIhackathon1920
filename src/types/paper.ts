/** Shared contracts for later milestones; no reader data is collected yet. */
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
  articles: Article[];
};

export type ReaderSignal = {
  readerId: string;
  articleId: string;
  type: "click" | "skip" | "like" | "dislike" | "reading-time";
  occurredAt: string;
  durationMs?: number;
};
