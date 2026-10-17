// Browser storage is optional: private browsing, quota limits and corrupt data
// must never stop reading. Call only from effects or event handlers.
export function readBrowserState<T>(key: string, valid: (value: unknown) => value is T): T | null {
  try { const value: unknown = JSON.parse(localStorage.getItem(key) ?? "null"); return valid(value) ? value : null; }
  catch { return null; }
}
export function saveBrowserState(key: string, value: unknown): boolean {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch { return false; }
}
