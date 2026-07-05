"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { CurrentUser } from "../lib/api";
import { Button } from "../ui/components";

export function ProfileAccount({ initialUser }: { initialUser: CurrentUser }) {
  const router = useRouter();
  const [user, setUser] = useState(initialUser);
  const [name, setName] = useState(initialUser.name);
  const [phone, setPhone] = useState(initialUser.phone);
  const [telegram, setTelegram] = useState(initialUser.telegram);
  const [email, setEmail] = useState(initialUser.email);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [touched, setTouched] = useState({ phone: false, email: false });
  const [emailCharacterError, setEmailCharacterError] = useState("");
  const phoneError = validatePhone(phone);
  const emailError = emailCharacterError || validateEmail(email);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched({ phone: true, email: true });

    if (phoneError || emailError) return;

    setSaving(true);
    setError("");

    const response = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, phone, telegram, email }),
    }).catch(() => null);

    if (!response?.ok) {
      const body = await response?.json().catch(() => null) as { message?: string } | null;
      setError(body?.message ?? "Не удалось сохранить профиль");
      setSaving(false);
      return;
    }

    const body = await response.json() as {
      name: string;
      phone: string;
      telegram: string;
      email: string;
    };
    setUser((current) => ({ ...current, ...body }));
    setName(body.name);
    setPhone(body.phone);
    setTelegram(body.telegram);
    setEmail(body.email);
    setEmailCharacterError("");
    setTouched({ phone: false, email: false });
    setEditing(false);
    setSaving(false);
    router.refresh();
  }

  function cancel() {
    setName(user.name);
    setPhone(user.phone);
    setTelegram(user.telegram);
    setEmail(user.email);
    setError("");
    setEmailCharacterError("");
    setTouched({ phone: false, email: false });
    setEditing(false);
  }

  return (
    <section className="profile-card" aria-labelledby="profile-data-title">
      <div className="profile-card__heading">
        <div>
          <p className="profile-section-label">Учётная запись</p>
          <h2 id="profile-data-title">Данные пользователя</h2>
        </div>
        {!editing ? (
          <Button tone="secondary" size="small" onClick={() => setEditing(true)}>
            Редактировать
          </Button>
        ) : null}
      </div>

      {editing ? (
        <form className="profile-form profile-account-form" noValidate onSubmit={save}>
          <div className="profile-form__grid">
            <label>
              Имя
              <input
                required
                minLength={2}
                maxLength={80}
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
            <label>
              Телефон
              <input
                type="tel"
                value={phone}
                placeholder="+7 (999) 000-00-00"
                aria-invalid={touched.phone && Boolean(phoneError)}
                aria-describedby={touched.phone && phoneError ? "profile-phone-error" : undefined}
                onBlur={() => setTouched((current) => ({ ...current, phone: true }))}
                onChange={(event) => setPhone(formatPhone(event.target.value))}
              />
              <small
                className="profile-field-error"
                id="profile-phone-error"
                aria-live="polite"
              >
                {touched.phone && phoneError ? phoneError : "\u00A0"}
              </small>
            </label>
            <label>
              Telegram
              <input
                value={telegram}
                placeholder="@username"
                onChange={(event) => setTelegram(event.target.value.replace(/^@/, ""))}
              />
            </label>
            <label>
              Почта
              <input
                type="text"
                value={email}
                placeholder="name@example.com"
                pattern="[A-Za-z0-9._%+\-]+@[A-Za-z0-9\-]+(\.[A-Za-z0-9\-]+)+"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                aria-invalid={touched.email && Boolean(emailError)}
                aria-describedby={touched.email && emailError ? "profile-email-error" : undefined}
                onBlur={() => setTouched((current) => ({ ...current, email: true }))}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  const hasUnsupportedCharacters = /[^A-Za-z0-9@._%+\-]/.test(nextValue);
                  const hasCyrillic = /[А-Яа-яЁё]/.test(nextValue);
                  setEmail(nextValue.replace(/[^A-Za-z0-9@._%+\-]/g, ""));
                  setEmailCharacterError(
                    hasUnsupportedCharacters
                      ? hasCyrillic
                        ? "Кириллица недопустима — используйте только латинские буквы"
                        : "Этот символ нельзя использовать в адресе почты"
                      : "",
                  );
                  setTouched((current) => ({ ...current, email: true }));
                }}
              />
              <small
                className="profile-field-error"
                id="profile-email-error"
                aria-live="polite"
              >
                {touched.email && emailError ? emailError : "\u00A0"}
              </small>
            </label>
          </div>
          {error ? <p className="profile-save-notice" role="alert">{error}</p> : null}
          <div className="profile-form__actions">
            <Button type="submit" loading={saving}>Сохранить</Button>
            <Button type="button" tone="ghost" disabled={saving} onClick={cancel}>
              Отмена
            </Button>
          </div>
        </form>
      ) : (
        <dl className="profile-data-list">
          <div>
            <dt>Имя</dt>
            <dd>{user.name}</dd>
          </div>
          <div>
            <dt>Телефон</dt>
            <dd>
              <span>{user.phone || "Не указан"}</span>
              <VerificationControl
                verified={user.phoneVerified && Boolean(user.phone)}
                href="/profile?verifyPhone=1"
              />
            </dd>
          </div>
          <div>
            <dt>Telegram</dt>
            <dd>
              <span>{user.telegram ? `@${user.telegram}` : "Не указан"}</span>
              <VerificationControl
                verified={user.telegramVerified && Boolean(user.telegram)}
                href="/auth/telegram?returnTo=/profile"
              />
            </dd>
          </div>
          <div>
            <dt>Почта</dt>
            <dd>
              <span>{user.email || "Не указана"}</span>
              <VerificationControl
                verified={user.emailVerified && Boolean(user.email)}
                href="/profile?verifyEmail=1"
              />
            </dd>
          </div>
        </dl>
      )}
    </section>
  );
}

function VerificationControl({ verified, href }: { verified: boolean; href: string }) {
  return verified ? (
    <span className="profile-verification profile-verification--confirmed">
      <span aria-hidden="true">✓</span>
      Подтверждено
    </span>
  ) : (
    <a className="profile-verification" href={href}>
      Подтвердить
    </a>
  );
}

function formatPhone(value: string): string {
  let digits = value.replace(/\D/g, "");

  if (!digits) return "";
  if (digits.startsWith("8")) digits = `7${digits.slice(1)}`;
  if (!digits.startsWith("7")) digits = `7${digits}`;
  digits = digits.slice(0, 11);

  const code = digits.slice(1, 4);
  const first = digits.slice(4, 7);
  const second = digits.slice(7, 9);
  const third = digits.slice(9, 11);

  if (!code) return digits.length ? "+7" : "";

  let formatted = `+7 (${code}`;
  if (code.length === 3) formatted += ")";
  if (first) formatted += ` ${first}`;
  if (second) formatted += `-${second}`;
  if (third) formatted += `-${third}`;
  return formatted;
}

function validatePhone(value: string): string {
  if (!value) return "";
  return /^\+7 \(\d{3}\) \d{3}-\d{2}-\d{2}$/.test(value)
    ? ""
    : "Введите полный номер в формате +7 (999) 000-00-00";
}

function validateEmail(value: string): string {
  if (!value) return "";
  if (value.split("@")[1]?.split(".").some((label) => label.startsWith("xn--"))) {
    return "Кириллические домены не поддерживаются";
  }
  return /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/.test(value)
    ? ""
    : "Используйте латинские буквы и формат name@example.com";
}
