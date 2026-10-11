"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { ParticipantStatus, TripParticipant, TripStatus, TripSummary } from "@biketrips/domain";
import { formatDateTime, participantStatusLabels, tripStatusLabels } from "../lib/labels";
import styles from "./components.module.css";
import { Badge, CloseButton } from "./components";
import type { BadgeTone } from "./components";


export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link className={styles.backLink} href={href}>
      <span aria-hidden="true">←</span>
      {children}
    </Link>
  );
}

export function Skeleton({ width = "100%", height = 16 }: { width?: string; height?: number }) {
  return <span className={styles.skeleton} style={{ width, height }} aria-hidden="true" />;
}

export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className={styles.emptyState}>
      <span className={styles.emptyStateIcon} aria-hidden="true">↗</span>
      <h3>{title}</h3>
      <p>{children}</p>
      {action ? <div className={styles.emptyStateAction}>{action}</div> : null}
    </div>
  );
}

export function Dialog({
  open,
  title,
  description,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className={styles.dialogBackdrop} role="presentation" onMouseDown={onClose}>
      <section
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ui-dialog-title"
        aria-describedby={description ? "ui-dialog-description" : undefined}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <CloseButton className={styles.dialogClose} onClick={onClose} />
        <h2 id="ui-dialog-title">{title}</h2>
        {description ? <p id="ui-dialog-description">{description}</p> : null}
        {children}
      </section>
    </div>
  );
}

export function BottomSheet({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className={`${styles.dialogBackdrop} ${styles.bottomSheetBackdrop}`}
      role="presentation"
      onMouseDown={onClose}
    >
      <section
        className={styles.bottomSheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ui-bottom-sheet-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <span className={styles.bottomSheetHandle} aria-hidden="true" />
        <div className={styles.bottomSheetHeading}>
          <h2 id="ui-bottom-sheet-title">{title}</h2>
          <button type="button" onClick={onClose}>Закрыть</button>
        </div>
        {children}
      </section>
    </div>
  );
}

export function TripStatusBadge({ status }: { status: TripStatus }) {
  const tones: Record<TripStatus, BadgeTone> = {
    draft: "neutral",
    pending_review: "warning",
    changes_requested: "warning",
    rejected: "danger",
    published: "success",
    cancelled: "danger",
    finished: "info",
  };
  return <Badge tone={tones[status]} dot>{tripStatusLabels[status]}</Badge>;
}

export function ParticipationStatusBadge({ status }: { status: ParticipantStatus }) {
  const tones: Record<ParticipantStatus, BadgeTone> = {
    pending: "warning",
    confirmed: "success",
    waitlisted: "info",
    cancelled: "neutral",
  };
  return <Badge tone={tones[status]}>{participantStatusLabels[status]}</Badge>;
}

export function TripMeta({ trip }: { trip: Pick<TripSummary, "startDateTime" | "city" | "distanceKm"> }) {
  return (
    <div className={styles.tripMeta}>
      <span><span aria-hidden="true">◷</span>{formatDateTime(trip.startDateTime)}</span>
      <span><span aria-hidden="true">⌖</span>{trip.city}</span>
      <span><span aria-hidden="true">↔</span>{trip.distanceKm} км</span>
    </div>
  );
}

export function ParticipantRow({
  participant,
  actions,
}: {
  participant: TripParticipant;
  actions?: ReactNode;
}) {
  const initials = participant.name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("");

  return (
    <div className={styles.participantRow}>
      <span className={styles.participantRowAvatar} aria-hidden="true">{initials}</span>
      <div className={styles.participantRowPerson}>
        <strong>{participant.name}</strong>
        {participant.telegramUsername === undefined ? null : (
          <span>{participant.telegramUsername ? `@${participant.telegramUsername}` : "Telegram не указан"}</span>
        )}
      </div>
      <ParticipationStatusBadge status={participant.status} />
      {actions ? <div className={styles.participantRowActions}>{actions}</div> : null}
    </div>
  );
}

export function StickyActionBar({
  summary,
  primaryAction,
  secondaryAction,
}: {
  summary?: ReactNode;
  primaryAction: ReactNode;
  secondaryAction?: ReactNode;
}) {
  return (
    <div className={styles.stickyActionBar}>
      {summary ? <div className={styles.stickyActionBarSummary}>{summary}</div> : null}
      <div className={styles.stickyActionBarActions}>
        {secondaryAction}
        {primaryAction}
      </div>
    </div>
  );
}
