import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const src = fileURLToPath(new URL("./src", import.meta.url));

export default defineConfig({
  resolve: { alias: { "@": src } },
  test: {
    projects: [
      {
        resolve: { alias: { "@": src } },
        test: {
          name: "unit",
          include: ["src/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        resolve: { alias: { "@": src } },
        test: {
          name: "integration",
          include: ["tests/integration/**/*.test.ts"],
          environment: "node",
          fileParallelism: false,
          testTimeout: 20_000,
        },
      },
      {
        // The synthetic evaluation set against a real provider (pnpm eval). Never in CI.
        resolve: { alias: { "@": src } },
        test: {
          name: "eval",
          include: ["tests/eval/**/*.eval.ts"],
          environment: "node",
          fileParallelism: false,
        },
      },
    ],
  },
});
