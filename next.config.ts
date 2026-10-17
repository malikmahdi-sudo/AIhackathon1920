import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingExcludes: { "/*": ["./data/**/*", "./.env*"] },
};
export default nextConfig;
