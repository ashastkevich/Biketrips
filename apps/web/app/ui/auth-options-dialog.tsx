"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

import { AuthOptions, type AuthProvider } from "./auth-options";
import authOptionStyles from "./auth-options.module.css";
import componentStyles from "./components.module.css";

interface AuthOptionsDialogProps {
  onClose: () => void;
  onSelect: (provider: AuthProvider) => void;
}

export function AuthOptionsDialog({ onClose, onSelect }: AuthOptionsDialogProps) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className={`${componentStyles.dialogBackdrop} ${authOptionStyles.backdrop}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-options-title"
      onMouseDown={onClose}
    >
      <div onMouseDown={(event) => event.stopPropagation()}>
        <AuthOptions onClose={onClose} onSelect={onSelect} />
      </div>
    </div>,
    document.body,
  );
}
