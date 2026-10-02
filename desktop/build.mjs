// Run after `next build` (pnpm desktop:build): completes the standalone server and
// bundles the Electron main process and the window's preload into dist-desktop/.
// `node desktop/build.mjs mcp` (pnpm mcp) bundles only the contributors' stdio entry.
import { cpSync, existsSync, lstatSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { build } from "esbuild";

const options = {
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node24",
  external: ["electron"],
  logLevel: "warning",
  // React PDF reads import.meta.url, which a CommonJS bundle lacks.
  banner: { js: "const importMetaUrl = require('node:url').pathToFileURL(__filename).href;" },
  define: { "import.meta.url": "importMetaUrl" },
  plugins: [
    {
      // pdfkit loads its standard fonts through createRequire at run time, which a bundle cannot
      // follow; plain require calls let esbuild inline the font files.
      name: "pdfkit-fonts",
      setup(build) {
        build.onLoad({ filter: /pdfkit\.node\.mjs$/ }, ({ path }) => ({
          contents: readFileSync(path, "utf8")
            .replace("const require$1 = createRequire(import.meta.url);", "")
            .replaceAll("require$1('#standard-fonts/", "require('#standard-fonts/"),
          loader: "js",
        }));
      },
    },
  ],
};

if (process.argv[2] === "mcp") {
  await build({ ...options, entryPoints: ["desktop/mcp.ts"], outfile: "dist-desktop/mcp.cjs" });
  process.exit(0);
}

// The standalone output leaves out static assets and public/, which a CDN would normally serve.
cpSync(".next/static", ".next/standalone/.next/static", { recursive: true });
cpSync("public", ".next/standalone/public", { recursive: true });
// pnpm's hoisted links in the traced tree can point at packages the trace left out; electron-builder
// fails on such dangling links while signing, and nothing resolves through them.
for (const entry of readdirSync(".next/standalone", { recursive: true })) {
  const path = join(".next/standalone", entry);
  if (lstatSync(path).isSymbolicLink() && !existsSync(path)) rmSync(path);
}

await build({ ...options, entryPoints: ["desktop/main.ts"], outfile: "dist-desktop/main.cjs" });
// The sandboxed preload can require only electron, so it gets none of the options above.
await build({
  entryPoints: ["desktop/preload.ts"],
  outfile: "dist-desktop/preload.cjs",
  bundle: true,
  platform: "node",
  format: "cjs",
  external: ["electron"],
});
