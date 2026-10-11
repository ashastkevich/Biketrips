"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { organizerBioMaxLength } from "@biketrips/domain";

import { Button } from "../ui/components";
import styles from "./profile.module.css";

export interface OrganizerBioState {
  bio: string;
  error?: string;
}

export function OrganizerBio({
  organizerHref,
  initialBio,
  action,
}: {
  organizerHref: string;
  initialBio: string;
  action: (state: OrganizerBioState, formData: FormData) => Promise<OrganizerBioState>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initialBio);
  const [state, formAction, saving] = useActionState(
    async (current: OrganizerBioState, formData: FormData) => {
      const next = await action(current, formData);
      if (!next.error) {
        setDraft(next.bio);
        setEditing(false);
      }
      return next;
    },
    { bio: initialBio },
  );

  function cancel() {
    setDraft(state.bio);
    setEditing(false);
  }

  return (
    <section className={styles.card} id="organizer-profile" aria-labelledby="organizer-profile-title">
      <div className={styles.cardHeading}>
        <div>
          <p className={styles.sectionLabel}>Профиль организатора</p>
          <h2 id="organizer-profile-title">Публичная страница</h2>
        </div>
        {!editing ? (
          <Button tone="secondary" size="small" onClick={() => setEditing(true)}>
            {state.bio ? "Изменить описание" : "Добавить описание"}
          </Button>
        ) : null}
      </div>

      <p className={styles.organizerPageHint}>
        Её видят все посетители сайта, даже без регистрации: имя, город, описание и ваши поездки.
        Контакты на ней не показываются. <Link className={styles.inlineLink} href={organizerHref}>Открыть страницу</Link>
      </p>

      {editing ? (
        <form className={`${styles.form} ${styles.accountForm}`} action={formAction}>
          <div className={styles.formGrid}>
            <label className={styles.formWide}>
              О себе
              <textarea
                name="bio"
                rows={5}
                maxLength={organizerBioMaxLength}
                value={draft}
                placeholder="Какие маршруты вы водите, в каком темпе, чего ждать новичкам"
                onChange={(event) => setDraft(event.target.value)}
              />
              <small>{draft.length}/{organizerBioMaxLength}</small>
            </label>
          </div>
          {state.error ? <p className={styles.saveNotice} role="alert">{state.error}</p> : null}
          <div className={styles.formActions}>
            <Button type="submit" loading={saving}>Сохранить</Button>
            <Button type="button" tone="ghost" disabled={saving} onClick={cancel}>
              Отмена
            </Button>
          </div>
        </form>
      ) : state.bio ? (
        <p className={styles.bio}>{state.bio}</p>
      ) : (
        <p className={styles.organizerPageHint}>Описание пока не заполнено.</p>
      )}
    </section>
  );
}
