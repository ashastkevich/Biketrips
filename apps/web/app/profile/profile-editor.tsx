"use client";

import { useState } from "react";

import { Button } from "../ui/components";
import styles from "./profile.module.css";

interface ProfileData {
  name: string;
  username: string;
  city: string;
  bio: string;
  pace: string;
}

const initialProfile: ProfileData = {
  name: "Алексей Морозов",
  username: "aleksei_ride",
  city: "Москва",
  bio: "Люблю длинные гравийные маршруты, ранние старты и кофе где-нибудь на середине пути.",
  pace: "20–24 км/ч",
};

export function ProfileEditor() {
  const [profile, setProfile] = useState(initialProfile);
  const [draft, setDraft] = useState(initialProfile);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);

  function update(field: keyof ProfileData, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
    setSaved(false);
  }

  function cancel() {
    setDraft(profile);
    setEditing(false);
    setSaved(false);
  }

  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfile(draft);
    setEditing(false);
    setSaved(true);
  }

  if (!editing) {
    return (
      <section className={styles.card} aria-labelledby="profile-about-title">
        <div className={styles.cardHeading}>
          <div>
            <p className={styles.sectionLabel}>О себе</p>
            <h2 id="profile-about-title">Личные данные</h2>
          </div>
          <Button tone="secondary" size="small" onClick={() => setEditing(true)}>
            Редактировать
          </Button>
        </div>

        {saved ? (
          <p className={styles.saveNotice} role="status">
            Изменения сохранены
          </p>
        ) : null}

        <dl className={styles.dataList}>
          <div>
            <dt>Имя</dt>
            <dd>{profile.name}</dd>
          </div>
          <div>
            <dt>Telegram</dt>
            <dd>@{profile.username}</dd>
          </div>
          <div>
            <dt>Город</dt>
            <dd>{profile.city}</dd>
          </div>
        </dl>

        <p className={styles.bio}>{profile.bio}</p>

        <div className={styles.preferences}>
          <span>≈ {profile.pace}</span>
        </div>
      </section>
    );
  }

  return (
    <form className={`${styles.card} ${styles.form}`} onSubmit={save}>
      <div className={styles.cardHeading}>
        <div>
          <p className={styles.sectionLabel}>О себе</p>
          <h2>Редактирование профиля</h2>
        </div>
      </div>

      <div className={styles.formGrid}>
        <label>
          Имя
          <input
            required
            value={draft.name}
            onChange={(event) => update("name", event.target.value)}
          />
        </label>
        <label>
          Telegram
          <span className={styles.usernameField}>
            <span aria-hidden="true">@</span>
            <input
              required
              value={draft.username}
              onChange={(event) => update("username", event.target.value.replace(/^@/, ""))}
            />
          </span>
        </label>
        <label>
          Город
          <input
            required
            value={draft.city}
            onChange={(event) => update("city", event.target.value)}
          />
        </label>
        <label>
          Комфортный темп
          <select value={draft.pace} onChange={(event) => update("pace", event.target.value)}>
            <option>До 18 км/ч</option>
            <option>20–24 км/ч</option>
            <option>25–29 км/ч</option>
            <option>30+ км/ч</option>
          </select>
        </label>
        <label className={styles.formWide}>
          О себе
          <textarea
            rows={4}
            maxLength={240}
            value={draft.bio}
            onChange={(event) => update("bio", event.target.value)}
          />
          <small>{draft.bio.length}/240</small>
        </label>
      </div>

      <div className={styles.formActions}>
        <Button type="submit">Сохранить</Button>
        <Button type="button" tone="ghost" onClick={cancel}>
          Отмена
        </Button>
      </div>
    </form>
  );
}
