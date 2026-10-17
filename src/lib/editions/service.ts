import "server-only";
import { readSignals } from "../signal-store";
import { topicWeights } from "../learning";
import { getStorage } from "../storage";
import { createEditionStore, localEditionDate, type EditionResult } from "./store";
import type { DailyEdition, ReaderPreferences } from "@/types/paper";
import type { createAggregator } from "../news/aggregate";

export const editions = {
  read: (readerId: string, date: string) => getStorage().getEdition(readerId, date),
  list: (readerId: string): Promise<DailyEdition[]> => getStorage().listEditions(readerId),
  today: async (preferences: ReaderPreferences, aggregate: ReturnType<typeof createAggregator>, now = Date.now()): Promise<EditionResult> => {
    const storage = getStorage();
    const existing = await storage.getEdition(preferences.id, localEditionDate(now, preferences.timezone));
    if (existing) return { status: "ready", edition: existing };
    return createEditionStore(storage).today(preferences, aggregate, now, topicWeights(await readSignals(preferences.id), now));
  },
};
