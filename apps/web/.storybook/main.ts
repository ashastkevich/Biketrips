import type { StorybookConfig } from "@storybook/nextjs-vite";
import nextEnv from "@next/env";
import { fileURLToPath } from "node:url";

const { loadEnvConfig } = nextEnv;
const webRoot = fileURLToPath(new URL("..", import.meta.url));
loadEnvConfig(webRoot);

const config: StorybookConfig = {
  stories: ["../app/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-docs", "@storybook/addon-a11y"],
  framework: {
    name: "@storybook/nextjs-vite",
    options: {},
  },
  staticDirs: ["../public"],
  env: (currentEnv) => ({
    ...currentEnv,
    NEXT_PUBLIC_MAPTILER_API_KEY: process.env.NEXT_PUBLIC_MAPTILER_API_KEY ?? "",
  }),
};

export default config;
