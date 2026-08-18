import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: [
      "**/node_modules/**",
      "**/.next/**",
      "**/dist/**",
      "**/coverage/**",
      "**/*.stories.tsx",
    ],
    coverage: {
      include: [
        "apps/api/src/**/*.ts",
        "apps/web/app/**/*.ts",
        "apps/bot/src/**/*.ts",
        "packages/*/src/**/*.ts",
      ],
      exclude: [
        "**/node_modules/**",
        "**/.next/**",
        "**/dist/**",
        "**/coverage/**",
        "**/*.stories.tsx",
        "**/migrations/**",
        "**/infrastructure/database/entities/**",
        "**/dto/**",
        "**/*.module.ts",
        "**/main.ts",
        "**/*.config.*",
      ],
      reporter: ["text", "html"],
    },
  },
});
