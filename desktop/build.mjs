// Run after `next build` (pnpm desktop:build): completes the standalone server the way the
// Dockerfile does and bundles the Electron main process into dist-desktop/main.cjs.
import { cpSync, existsSync, lstatSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { build } from "esbuild";

// The standalone output leaves out static assets and public/, which a CDN would normally serve.
cpSync(".next/static", ".next/standalone/.next/static", { recursive: true });
cpSync("public", ".next/standalone/public", { recursive: true });
// pnpm's hoisted links in the traced tree can point at packages the trace left out; electron-builder
// fails on such dangling links while signing, and nothing resolves through them.
for (const entry of readdirSync(".next/standalone", { recursive: true })) {
  const path = join(".next/standalone", entry);
  if (lstatSync(path).isSymbolicLink() && !existsSync(path)) rmSync(path);
}

await build({
  entryPoints: ["desktop/main.ts"],
  outfile: "dist-desktop/main.cjs",
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node24",
  external: ["electron"],
});
