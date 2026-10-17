export function storageConfig(env: Record<string, string | undefined>) {
  const driver = env.STORAGE_DRIVER || (env.VERCEL ? "supabase" : "local");
  if (driver !== "local" && driver !== "supabase") throw new Error("STORAGE_DRIVER must be local or supabase.");
  if (driver === "local") {
    if (env.VERCEL) throw new Error("Vercel requires Supabase storage; local files are not durable.");
    return { driver } as const;
  }
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  return { driver, url: env.SUPABASE_URL, key: env.SUPABASE_SERVICE_ROLE_KEY } as const;
}
