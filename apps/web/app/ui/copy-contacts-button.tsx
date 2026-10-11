"use client";

import { useEffect, useState } from "react";

import { Button } from "./components";

export function CopyContactsButton({ text, className }: { text: string; className?: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => {
    if (state === "idle") return;
    const timeout = window.setTimeout(() => setState("idle"), 2500);
    return () => window.clearTimeout(timeout);
  }, [state]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      setState("failed");
    }
  }

  return (
    <Button className={className} size="small" tone="secondary" type="button" onClick={copy}>
      {state === "copied"
        ? "Контакты скопированы"
        : state === "failed"
          ? "Не удалось скопировать"
          : "Скопировать контакты"}
    </Button>
  );
}
