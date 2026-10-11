import type { ReactNode } from "react";
import type { ParticipantStatus, TripDetail, TripParticipant } from "@biketrips/domain";

import {
  formatParticipantContacts,
  getParticipantInitials,
  groupParticipants,
  normalizeTelegramUsername,
} from "../lib/participant-groups";
import { Button } from "./components";
import { CopyContactsButton } from "./copy-contacts-button";
import styles from "./organizer-participants.module.css";

type UpdateParticipantAction = (formData: FormData) => Promise<void>;

interface OrganizerParticipantsProps {
  trip: Pick<TripDetail, "participants" | "waitlist" | "capacity" | "confirmedParticipants">;
  /** Omitted for trips that can no longer be managed (past, cancelled or finished). */
  updateAction?: UpdateParticipantAction;
  /** Result of the last status change, shown next to the list where the organizer acted. */
  notice?: { tone: "success" | "danger"; text: string };
}

function StatusForm({
  action,
  participantId,
  status,
  children,
  tone,
}: {
  action: UpdateParticipantAction;
  participantId: string;
  status: Extract<ParticipantStatus, "confirmed" | "cancelled">;
  children: string;
  tone: "primary" | "secondary";
}) {
  return (
    <form action={action}>
      <input name="participantId" type="hidden" value={participantId} />
      <input name="status" type="hidden" value={status} />
      <Button size="small" tone={tone} type="submit">
        {children}
      </Button>
    </form>
  );
}

function ParticipantContacts({ participant }: { participant: TripParticipant }) {
  const telegram = normalizeTelegramUsername(participant.telegramUsername);
  const phone = participant.phone?.trim();
  const email = participant.email?.trim();

  if (!telegram && !phone && !email) {
    return <span className={styles.contacts}>Контакты не указаны</span>;
  }

  return (
    <span className={styles.contacts}>
      {telegram ? (
        <a href={`https://t.me/${encodeURIComponent(telegram)}`} target="_blank" rel="noreferrer">
          @{telegram}
        </a>
      ) : null}
      {phone ? <a href={`tel:${phone.replace(/[^\d+]/g, "")}`}>{phone}</a> : null}
      {email ? <a href={`mailto:${email}`}>{email}</a> : null}
    </span>
  );
}

function ParticipantItem({
  participant,
  marker,
  actions,
}: {
  participant: TripParticipant;
  marker?: string;
  actions?: ReactNode;
}) {
  return (
    <li className={styles.item}>
      <span className={styles.avatar} aria-hidden="true">
        {marker ?? getParticipantInitials(participant.name)}
      </span>
      <div className={styles.person}>
        <strong>{participant.name}</strong>
        <ParticipantContacts participant={participant} />
      </div>
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </li>
  );
}

function Group({
  title,
  count,
  tone,
  children,
}: {
  title: string;
  count: number;
  tone?: "warning";
  children: ReactNode;
}) {
  return (
    <section className={styles.group}>
      <h3 className={tone === "warning" ? styles.groupTitleWarning : styles.groupTitle}>
        {title} <span>· {count}</span>
      </h3>
      <ul className={styles.list}>{children}</ul>
    </section>
  );
}

export function OrganizerParticipants({ trip, updateAction, notice }: OrganizerParticipantsProps) {
  const groups = groupParticipants(trip);
  const hasFreePlaces = trip.capacity === null || trip.confirmedParticipants < trip.capacity;
  const activeCount = groups.pending.length + groups.confirmed.length + groups.waitlisted.length;

  return (
    <div className={styles.root} id="participants">
      {notice ? (
        <p
          className={notice.tone === "danger" ? styles.noticeDanger : styles.noticeSuccess}
          role={notice.tone === "danger" ? "alert" : "status"}
        >
          {notice.text}
        </p>
      ) : null}
      {activeCount === 0 ? <p className={styles.empty}>Пока никто не записался.</p> : null}

      {groups.pending.length > 0 ? (
        <Group title="Ждут подтверждения" count={groups.pending.length} tone="warning">
          {groups.pending.map((participant) => (
            <ParticipantItem
              key={participant.id}
              participant={participant}
              actions={
                updateAction ? (
                  <>
                    {hasFreePlaces ? (
                      <StatusForm
                        action={updateAction}
                        participantId={participant.id}
                        status="confirmed"
                        tone="primary"
                      >
                        Принять
                      </StatusForm>
                    ) : null}
                    <StatusForm
                      action={updateAction}
                      participantId={participant.id}
                      status="cancelled"
                      tone="secondary"
                    >
                      Отклонить
                    </StatusForm>
                  </>
                ) : null
              }
            />
          ))}
        </Group>
      ) : null}

      {groups.confirmed.length > 0 ? (
        <Group title="Подтверждены" count={groups.confirmed.length}>
          {groups.confirmed.map((participant) => (
            <ParticipantItem key={participant.id} participant={participant} />
          ))}
        </Group>
      ) : null}

      {groups.waitlisted.length > 0 ? (
        <Group title="Лист ожидания" count={groups.waitlisted.length}>
          {groups.waitlisted.map((participant, index) => (
            <ParticipantItem
              key={participant.id}
              participant={participant}
              marker={String(index + 1)}
              actions={
                updateAction && hasFreePlaces ? (
                  <StatusForm
                    action={updateAction}
                    participantId={participant.id}
                    status="confirmed"
                    tone="secondary"
                  >
                    Перевести в участники
                  </StatusForm>
                ) : null
              }
            />
          ))}
        </Group>
      ) : null}

      {groups.cancelled.length > 0 ? (
        <details className={styles.cancelled}>
          <summary>Отменили запись · {groups.cancelled.length}</summary>
          <ul className={styles.list}>
            {groups.cancelled.map((participant) => (
              <ParticipantItem key={participant.id} participant={participant} />
            ))}
          </ul>
        </details>
      ) : null}

      {groups.confirmed.length > 0 ? (
        <CopyContactsButton
          className={styles.copyButton}
          text={formatParticipantContacts(groups.confirmed)}
        />
      ) : null}
    </div>
  );
}
