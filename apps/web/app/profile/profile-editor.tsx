"use client";

import { useState } from "react";

import { Button } from "../ui/components";

interface ProfileData {
  name: string;
  username: string;
  city: string;
  bio: string;
  bike: string;
  pace: string;
}

const initialProfile: ProfileData = {
  name: "Алексей Морозов",
  username: "aleksei_ride",
  city: "Москва",
  bio: "Люблю длинные гравийные маршруты, ранние старты и кофе где-нибудь на середине пути.",
  bike: "Гравийный",
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
      <section className="profile-card" aria-labelledby="profile-about-title">
        <div className="profile-card__heading">
          <div>
            <p className="profile-section-label">О себе</p>
            <h2 id="profile-about-title">Личные данные</h2>
          </div>
          <Button tone="secondary" size="small" onClick={() => setEditing(true)}>
            Редактировать
          </Button>
        </div>

        {saved ? (
          <p className="profile-save-notice" role="status">
            Изменения сохранены
          </p>
        ) : null}

        <dl className="profile-data-list">
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

        <p className="profile-bio">{profile.bio}</p>

        <div className="profile-preferences">
          <span>🚲 {profile.bike}</span>
          <span>≈ {profile.pace}</span>
        </div>
      </section>
    );
  }

  return (
    <form className="profile-card profile-form" onSubmit={save}>
      <div className="profile-card__heading">
        <div>
          <p className="profile-section-label">О себе</p>
          <h2>Редактирование профиля</h2>
        </div>
      </div>

      <div className="profile-form__grid">
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
          <span className="profile-username-field">
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
          Тип велосипеда
          <select value={draft.bike} onChange={(event) => update("bike", event.target.value)}>
            <option>Гравийный</option>
            <option>Шоссейный</option>
            <option>Горный</option>
            <option>Городской</option>
          </select>
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
        <label className="profile-form__wide">
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

      <div className="profile-form__actions">
        <Button type="submit">Сохранить</Button>
        <Button type="button" tone="ghost" onClick={cancel}>
          Отмена
        </Button>
      </div>
    </form>
  );
}
