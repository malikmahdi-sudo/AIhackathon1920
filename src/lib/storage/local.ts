import { mkdir, readFile, readdir, rename, rm, writeFile, link } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { validatePreferences } from "../preferences";
import type { DailyEdition } from "@/types/paper";
import { checkEdition, requireEditionKey, requireReaderId, validEditionDate, type Storage } from "./types";

export function createLocalStorage(directory: string): Storage {
  const editionDirectory = path.join(directory, "editions");
  let writes = Promise.resolve();
  async function readJson<T>(file: string): Promise<T | null> {
    try { return JSON.parse(await readFile(file, "utf8")) as T; }
    catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return null; throw error; }
  }
  function editionPath(id: string, date: string) {
    requireEditionKey(id, date);
    return path.join(editionDirectory, `${id}_${date}.json`);
  }
  const storage: Storage = {
    async getPreferences(id) {
      requireReaderId(id);
      const value = await readJson(path.join(directory, `${id}.json`));
      return value === null ? null : { id, ...validatePreferences(value) };
    },
    async savePreferences(value) {
      requireReaderId(value.id);
      const preferences = { id: value.id, ...validatePreferences(value) };
      const operation = writes.then(async () => {
        await mkdir(directory, { recursive: true });
        const temporary = path.join(directory, `${value.id}.${randomUUID()}.tmp`);
        try {
          await writeFile(temporary, JSON.stringify(preferences, null, 2), { flag: "wx" });
          await rename(temporary, path.join(directory, `${value.id}.json`));
        } finally { await rm(temporary, { force: true }); }
      });
      writes = operation.catch(() => {});
      await operation;
      return preferences;
    },
    async getEdition(id, date) {
      const value = await readJson<DailyEdition>(editionPath(id, date));
      return value === null ? null : checkEdition(value, id, date);
    },
    async listEditions(id) {
      requireReaderId(id);
      let files: string[];
      try { files = await readdir(editionDirectory); }
      catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return []; throw error; }
      const dates = files.filter((name) => name.startsWith(`${id}_`) && name.endsWith(".json")).map((name) => name.slice(id.length + 1, -5)).filter(validEditionDate).sort().reverse();
      const editions = await Promise.all(dates.map((date) => storage.getEdition(id, date)));
      return editions.filter((edition): edition is DailyEdition => edition !== null);
    },
    async saveEditionIfAbsent(edition) {
      checkEdition(edition, edition.readerId, edition.date);
      const file = editionPath(edition.readerId, edition.date);
      await mkdir(editionDirectory, { recursive: true });
      const temporary = path.join(editionDirectory, `${randomUUID()}.tmp`);
      try {
        await writeFile(temporary, JSON.stringify(edition, null, 2), { flag: "wx" });
        try { await link(temporary, file); }
        catch (error) { if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error; }
      } finally { await rm(temporary, { force: true }); }
      const saved = await storage.getEdition(edition.readerId, edition.date);
      if (!saved) throw new Error("Edition could not be saved.");
      return saved;
    },
  };
  return storage;
}
