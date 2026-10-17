import "server-only";
import { getStorage } from "../storage";
import { createEditionStore } from "./store";
import type { DailyEdition, ReaderPreferences } from "@/types/paper";
import type { createAggregator } from "../news/aggregate";

export const editions = {
  read: (readerId: string, date: string) => getStorage().getEdition(readerId, date),
  list: (readerId: string): Promise<DailyEdition[]> => getStorage().listEditions(readerId),
  today: (preferences: ReaderPreferences, aggregate: ReturnType<typeof createAggregator>, now?: number) => createEditionStore(getStorage()).today(preferences, aggregate, now),
};
