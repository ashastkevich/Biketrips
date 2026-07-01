import { createElement } from "react";
import type { Preview } from "@storybook/nextjs-vite";

import { fontVariables } from "../app/fonts";
import "../app/styles.css";

const preview: Preview = {
  decorators: [
    (Story) =>
      createElement(
        "div",
        {
          className: `${fontVariables} typography-theme storybook-outdoor-theme`,
        },
        createElement(Story),
      ),
  ],
  parameters: {
    layout: "padded",
    nextjs: {
      appDirectory: true,
    },
    options: {
      storySort: {
        order: ["Design System", ["Foundations", "Components", "Patterns"]],
      },
    },
    backgrounds: {
      default: "komoot-sand",
      values: [
        { name: "komoot-sand", value: "#f5f3ec" },
        { name: "white", value: "#ffffff" },
        { name: "dark", value: "#12251d" },
      ],
    },
    a11y: {
      test: "todo",
    },
  },
  tags: ["autodocs"],
};

export default preview;
