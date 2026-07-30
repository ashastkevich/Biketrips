"use client";

import { useId, useState, type ReactNode } from "react";

import { CloseButton } from "./components";
import componentStyles from "./components.module.css";
import styles from "./auth-options.module.css";

export type AuthProvider = "telegram" | "email";

export interface AuthOptionsProps {
  onSelect?: (provider: AuthProvider) => void;
  onClose?: () => void;
}

const authOptions: Array<{
  provider: AuthProvider;
  label: string;
  icon: ReactNode;
  recommended?: boolean;
}> = [
  {
    provider: "telegram",
    label: "Продолжить через Telegram",
    recommended: true,
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M20.7 3.5 3.8 10c-1.2.5-1.2 1.2-.2 1.5l4.3 1.4 1.7 5.2c.2.6.1.8.7.8.5 0 .7-.2 1-.5l2.1-2 4.4 3.2c.8.5 1.4.2 1.6-.8l2.9-13.7c.3-1.2-.5-1.8-1.6-1.4Zm-11.9 9 9.7-6.1c.5-.3.9-.1.5.2l-8 7.2-.3 3.1-1.9-4.4Z" />
      </svg>
    ),
  },
  {
    provider: "email",
    label: "Продолжить через почту",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 4.5h16a2.5 2.5 0 0 1 2.5 2.5v10a2.5 2.5 0 0 1-2.5 2.5H4A2.5 2.5 0 0 1 1.5 17V7A2.5 2.5 0 0 1 4 4.5Zm0 2c-.2 0-.3 0-.4.2l8.4 6.1 8.4-6.1-.4-.2H4Zm16.5 2.6-7.9 5.7a1 1 0 0 1-1.2 0L3.5 9.1V17c0 .3.2.5.5.5h16c.3 0 .5-.2.5-.5V9.1Z" />
      </svg>
    ),
  },
];

function classes(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function AuthOptions({ onSelect, onClose }: AuthOptionsProps) {
  const consentId = useId();
  const [hasConsent, setHasConsent] = useState(false);

  return (
    <section className={styles.options} aria-labelledby="auth-options-title">
      {onClose ? <CloseButton className={componentStyles.dialogClose} onClick={onClose} /> : null}
      <div className={styles.header}>
        <h2 id="auth-options-title">Войти</h2>
        <p>Выберите удобный способ. Это займёт меньше минуты.</p>
      </div>

      <div className={styles.list}>
        {authOptions.map(({ provider, label, icon, recommended }) => (
          <button
            className={classes(styles.option, styles[provider])}
            disabled={!hasConsent}
            key={provider}
            type="button"
            onClick={() => onSelect?.(provider)}
          >
            <span className={styles.icon}>{icon}</span>
            <span>{label}</span>
            {recommended ? <span className={styles.badge}>Рекомендуем</span> : null}
          </button>
        ))}
      </div>

      <label className={styles.consent} htmlFor={consentId}>
        <input
          id={consentId}
          type="checkbox"
          checked={hasConsent}
          onChange={(event) => setHasConsent(event.currentTarget.checked)}
        />
        <span>
          Я принимаю <a href="/legal/terms">Пользовательское соглашение</a>, даю{" "}
          <a href="/legal/personal-data-consent">согласие на обработку персональных данных</a> и
          подтверждаю, что ознакомился с{" "}
          <a href="/legal/privacy">Политикой обработки персональных данных</a>.
        </span>
      </label>
    </section>
  );
}
