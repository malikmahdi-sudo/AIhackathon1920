import "server-only";
import path from "node:path";
import { createLocalStorage } from "./local";
import { createSupabaseStorage } from "./supabase";
import { storageConfig } from "./config";
import type { Storage } from "./types";

let storage: Storage | undefined;
export function getStorage(): Storage {
  if (!storage) {
    const config = storageConfig(process.env);
    storage = config.driver === "local" ? createLocalStorage(path.join(process.cwd(), "data")) : createSupabaseStorage(config.url, config.key);
  }
  return storage;
}
