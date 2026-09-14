import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The release image copies .next/standalone (a traced server with only the files it needs)
  // instead of the whole workspace and node_modules (ADR 003).
  output: "standalone",
  // The Phase 0 routes moved under /about when the column layout arrived; old bookmarks still work.
  async redirects() {
    return [
      { source: "/profile", destination: "/about/profile", permanent: false },
      { source: "/experience", destination: "/about/work-history", permanent: false },
      { source: "/experience/jobs/:id", destination: "/about/work-history/:id", permanent: false },
      {
        source: "/experience/education/:id",
        destination: "/about/education/:id",
        permanent: false,
      },
      { source: "/experience/projects/:id", destination: "/about/projects/:id", permanent: false },
      { source: "/skills", destination: "/about/skills", permanent: false },
      { source: "/skills/:id", destination: "/about/skills/:id", permanent: false },
      { source: "/achievements", destination: "/about/achievements", permanent: false },
      { source: "/achievements/:id", destination: "/about/achievements/:id", permanent: false },
    ];
  },
};

export default nextConfig;
