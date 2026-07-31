"use client";

import { useMemo, useState } from "react";
import type { FormEvent } from "react";

import { consumePostAuthReturnTo } from "../post-auth-return";
import { Button } from "../../ui/components";
import componentStyles from "../../ui/components.module.css";
import styles from "./email.module.css";

function normalizeCode(value: string): string {
  return value.replace(/\D/g, "").slice(0, 6);
}

export function EmailLogin({ returnTo }: { returnTo: string }) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [devCode, setDevCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);
  const canRequestCode = normalizedEmail.length > 3 && normalizedEmail.includes("@");
  const canVerifyCode = code.length === 6;

  async function requestCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setDevCode("");

    const response = await fetch("/api/auth/email/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: normalizedEmail }),
    }).catch(() => null);

    const result = (await response?.json().catch(() => null)) as
      | { message?: string; devCode?: string }
      | null;

    setSubmitting(false);

    if (!response?.ok) {
      setError(result?.message ?? "Не удалось отправить код");
      return;
    }

    setStep("code");
    setDevCode(result?.devCode ?? "");
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    const response = await fetch("/api/auth/email/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: normalizedEmail, code }),
    }).catch(() => null);

    const result = (await response?.json().catch(() => null)) as { message?: string } | null;

    if (!response?.ok) {
      setSubmitting(false);
      setError(result?.message ?? "Не удалось проверить код");
      return;
    }

    window.location.assign(consumePostAuthReturnTo(returnTo));
  }

  if (step === "code") {
    return (
      <form className={styles.form} onSubmit={verifyCode}>
        <p className={styles.lead}>
          Код отправлен на <strong>{normalizedEmail}</strong>.
        </p>
        <label className={styles.field}>
          <span>Код из письма</span>
          <input
            value={code}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="000000"
            maxLength={6}
            onChange={(event) => setCode(normalizeCode(event.target.value))}
          />
        </label>
        {devCode ? (
          <p className={`${componentStyles.alert} ${componentStyles.alertWarning}`}>
            Локальный код: {devCode}
          </p>
        ) : null}
        {error ? (
          <p className={`${componentStyles.alert} ${componentStyles.alertDanger}`} role="alert">
            {error}
          </p>
        ) : null}
        <div className={styles.actions}>
          <Button
            tone="primary"
            type="submit"
            disabled={submitting || !canVerifyCode}
          >
            {submitting ? "Проверяем..." : "Войти"}
          </Button>
          <Button
            tone="secondary"
            type="button"
            disabled={submitting}
            onClick={() => {
              setStep("email");
              setCode("");
              setError("");
            }}
          >
            Изменить почту
          </Button>
        </div>
      </form>
    );
  }

  return (
    <form className={styles.form} onSubmit={requestCode}>
      <label className={styles.field}>
        <span>Email</span>
        <input
          value={email}
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="name@example.com"
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>
      {error ? (
        <p className={`${componentStyles.alert} ${componentStyles.alertDanger}`} role="alert">
          {error}
        </p>
      ) : null}
      <Button
        tone="primary"
        type="submit"
        disabled={submitting || !canRequestCode}
      >
        {submitting ? "Отправляем..." : "Получить код"}
      </Button>
    </form>
  );
}
