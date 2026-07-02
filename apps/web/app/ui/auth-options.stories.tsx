import { fn } from "storybook/test";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { AuthOptions } from "./auth-options";

const meta = {
  title: "Design System/Patterns/Authorization",
  component: AuthOptions,
  parameters: {
    layout: "centered",
  },
  args: {
    onSelect: fn(),
  },
} satisfies Meta<typeof AuthOptions>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AllMethods: Story = {};

export const Mobile: Story = {
  parameters: {
    layout: "fullscreen",
  },
  globals: {
    viewport: { value: "mobile1", isRotated: false },
  },
};
