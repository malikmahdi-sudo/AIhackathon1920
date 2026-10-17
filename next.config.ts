import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  ...(process.env.VERCEL ? {} : { output: "standalone" as const }),
  outputFileTracingExcludes: { "/*": ["./data/**/*", "./.env*"] },
  outputFileTracingIncludes: { "/api/editions/*/pdf": ["./node_modules/@fontsource/noto-serif/files/*latin-400-normal.woff", "./node_modules/@fontsource/noto-serif/files/*latin-700-normal.woff"] },
};
export default nextConfig;
