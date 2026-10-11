"use client";

import { Button } from "../../../ui/components";
import tripDetailsStyles from "../../../ui/trip-details.module.css";

export type SavedTripResult = "saved" | "submitted" | "draft";

const resultMessages: Record<SavedTripResult, string> = {
  saved: "Изменения сохранены.",
  submitted: "Изменения сохранены, поездка отправлена на проверку администратору.",
  draft: "Черновик сохранён. Поездку пока не видят другие участники.",
};

interface SavedTripConfirmationProps {
  changes: string[];
  result: SavedTripResult;
  returnPath: "/" | "/profile";
  returnScope: "feed" | "created" | "participating";
  tripSlug: string;
}

export function SavedTripConfirmation({
  changes,
  result,
  returnPath,
  returnScope,
  tripSlug,
}: SavedTripConfirmationProps) {
  const destinationQuery = new URLSearchParams({
    trip: tripSlug,
    scope: returnScope,
  });
  const destination = `${returnPath}?${destinationQuery.toString()}`;

  return (
    <div className={tripDetailsStyles.confirmBackdrop}>
      <section
        className={tripDetailsStyles.confirm}
        role="dialog"
        aria-modal="true"
        aria-labelledby="trip-edit-saved-title"
      >
        <h2 id="trip-edit-saved-title">Успешно</h2>
        <p>{resultMessages[result]}</p>
        {changes.length > 0 ? (
          <>
            <p><strong>Что изменилось:</strong></p>
            <ul>
              {changes.map((change) => <li key={change}>{change}</li>)}
            </ul>
          </>
        ) : (
          <p>Новых значений в полях не обнаружено.</p>
        )}
        <div className={`${tripDetailsStyles.confirmActions} ${tripDetailsStyles.confirmActionsCenter}`}>
          <Button
            onClick={() => {
              window.location.assign(destination);
            }}
          >
            Хорошо
          </Button>
        </div>
      </section>
    </div>
  );
}
