"use client";

import { useEffect, useRef, useState } from "react";

import componentStyles from "../../ui/components.module.css";
import styles from "./telegram.module.css";

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  allows_write_to_pm?: boolean;
  auth_date: number;
  hash: string;
}

declare global {
  interface Window {
    onTelegramAuth?: (user: TelegramUser) => void;
  }
}

function safeReturnTo(value: string): string {
  return value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export function TelegramLogin({
  botUsername,
  returnTo,
}: {
  botUsername?: string;
  returnTo: string;
}) {
  const widgetRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!botUsername || !widgetRef.current) return;

    window.onTelegramAuth = async (user) => {
      setError("");

      const response = await fetch("/api/auth/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          Object.fromEntries(
            Object.entries(user).map(([key, value]) => [key, String(value)])
          )
        ),
      }).catch(() => null);

      if (!response?.ok) {
        const result = (await response?.json().catch(() => null)) as { message?: string } | null;
        setError(result?.message ?? "Не удалось войти через Telegram");
        return;
      }

      window.location.assign(safeReturnTo(returnTo));
    };

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", botUsername.replace(/^@/, ""));
    script.setAttribute("data-size", "large");
    script.setAttribute("data-radius", "12");
    script.setAttribute("data-userpic", "false");
    script.setAttribute("data-request-access", "write");
    script.setAttribute("data-onauth", "onTelegramAuth(user)");
    widgetRef.current.appendChild(script);

    return () => {
      delete window.onTelegramAuth;
      script.remove();
    };
  }, [botUsername, returnTo]);

  if (!botUsername) {
    return (
      <p className={`${componentStyles.alert} ${componentStyles.alertWarning}`} role="alert">
        Telegram-вход не настроен. Укажите NEXT_PUBLIC_TELEGRAM_BOT_USERNAME.
      </p>
    );
  }

  return (
    <>
      <div className={styles.widget} ref={widgetRef} />
      {error ? (
        <p className={`${componentStyles.alert} ${componentStyles.alertDanger}`} role="alert">
          {error}
        </p>
      ) : null}
    </>
  );
}
