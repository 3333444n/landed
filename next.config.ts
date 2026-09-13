import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The release image copies .next/standalone (a traced server with only the files it needs)
  // instead of the whole workspace and node_modules (ADR 003).
  output: "standalone",
};

export default nextConfig;
