import { cp, mkdir, access, writeFile } from "node:fs/promises";
import path from "node:path";

const source = path.resolve(".next/standalone");
const target = path.resolve(".next/release");
await access(path.join(source, "server.js"));
// A clean build is required; never merge stale output or overwrite runtime data.
await mkdir(target);
await cp(source, target, {
  recursive: true, dereference: true,
  filter: (file) => {
    const parts = path.relative(source, file).split(path.sep);
    return parts[0] !== "data" && !parts.some((part) => part.startsWith(".env"));
  },
});
await cp(path.resolve(".next/static"), path.join(target, ".next/static"), { recursive: true });
try { await access("public"); await cp("public", path.join(target, "public"), { recursive: true }); }
catch (error) { if (error.code !== "ENOENT") throw error; }
await writeFile(path.join(target, "BUILD-INFO.json"), JSON.stringify({
  commit: process.env.GITHUB_SHA ?? "local-build", platform: process.platform,
  node: process.version, createdAt: new Date().toISOString(),
}, null, 2));
console.log("Standalone release prepared in .next/release; reader data and environment files excluded.");
