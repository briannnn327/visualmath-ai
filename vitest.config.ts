import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["./src/test/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      reportsDirectory: "./coverage",
      include: ["src/lib/**/*.ts"],
      exclude: ["src/lib/**/*.test.ts", "src/lib/db/**", "src/lib/**/index.ts"],
      // Ambang batas regresi: cakupan tidak boleh turun di bawah baseline saat ini
      // (~37% stmt / ~71% branch / ~64% func). Naikkan seiring bertambahnya test.
      thresholds: {
        statements: 37,
        branches: 70,
        functions: 62,
        lines: 37,
      },
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
