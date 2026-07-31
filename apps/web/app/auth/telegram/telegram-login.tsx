"use client";

import { useEffect, useState } from "react";

import { consumePostAuthReturnTo } from "../post-auth-return";
import { Button } from "../../ui/components";
import componentStyles from "../../ui/components.module.css";
import styles from "./telegram.module.css";

interface TelegramLoginRequest {
  loginId: string;
  pollToken: string;
  botUrl: string;
  expiresAt: string;
}

export function TelegramLogin({ returnTo }: { returnTo: string }) {
  const [request, setRequest] = useState<TelegramLoginRequest | null>(null);
  const [status, setStatus] = useState<"idle" | "starting" | "pending" | "confirmed" | "expired">("idle");
  const [error, setError] = useState("");

  async function startLogin() {
    setStatus("starting");
    setError("");

    const response = await fetch("/api/auth/telegram/request", {
      method: "POST",
    }).catch(() => null);
    const result = (await response?.json().catch(() => null)) as
      | (Partial<TelegramLoginRequest> & { message?: string })
      | null;

    if (!response?.ok || !result?.loginId || !result.pollToken || !result.botUrl || !result.expiresAt) {
      setStatus("idle");
      setError(result?.message ?? "Не удалось начать вход через Telegram");
      return;
    }

    setRequest({
      loginId: result.loginId,
      pollToken: result.pollToken,
      botUrl: result.botUrl,
      expiresAt: result.expiresAt,
    });
    setStatus("pending");
  }

  useEffect(() => {
    if (!request || status !== "pending") return;

    let cancelled = false;
    const interval = window.setInterval(async () => {
      const response = await fetch("/api/auth/telegram/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loginId: request.loginId,
          pollToken: request.pollToken,
        }),
      }).catch(() => null);
      const result = (await response?.json().catch(() => null)) as
        | { status?: string; message?: string }
        | null;

      if (cancelled) return;

      if (!response?.ok) {
        setError(result?.message ?? "Не удалось проверить вход через Telegram");
        return;
      }

      if (result?.status === "confirmed") {
        setStatus("confirmed");
        window.location.assign(consumePostAuthReturnTo(returnTo));
        return;
      }

      if (result?.status === "expired" || result?.status === "consumed") {
        setStatus("expired");
      }
    }, 2000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [request, returnTo, status]);

  return (
    <div className={styles.telegramLogin}>
      <p className={styles.lead}>
        Откройте BikeTrips-бота в Telegram и нажмите Start. После подтверждения сайт войдёт автоматически.
      </p>

      {request ? (
        <div className={styles.loginLinkPanel}>
          <a className={styles.telegramLink} href={request.botUrl} target="_blank" rel="noreferrer">
            Открыть Telegram
          </a>
          <p className={styles.hint}>
            Ссылка действует до {new Date(request.expiresAt).toLocaleTimeString("ru-RU", {
              hour: "2-digit",
              minute: "2-digit",
            })}.
          </p>
        </div>
      ) : (
        <Button type="button" loading={status === "starting"} onClick={startLogin}>
          Войти через Telegram
        </Button>
      )}

      {status === "pending" ? (
        <p className={`${componentStyles.alert} ${componentStyles.alertWarning}`} role="status">
          Ждём подтверждение в Telegram...
        </p>
      ) : null}

      {status === "expired" ? (
        <div className={styles.retry}>
          <p className={`${componentStyles.alert} ${componentStyles.alertDanger}`} role="alert">
            Ссылка истекла. Запустите вход ещё раз.
          </p>
          <Button
            type="button"
            tone="secondary"
            onClick={() => {
              setRequest(null);
              setStatus("idle");
              setError("");
            }}
          >
            Начать заново
          </Button>
        </div>
      ) : null}

      {error ? (
        <p className={`${componentStyles.alert} ${componentStyles.alertDanger}`} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
