import "server-only";
import { createAggregator } from "./aggregate";

// Retain the shared feed cache across development reloads in one server process.
const state = globalThis as typeof globalThis & { newsAggregator?: ReturnType<typeof createAggregator> };
export const aggregateNews = state.newsAggregator ??= createAggregator();
