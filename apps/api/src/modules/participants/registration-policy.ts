import type { ParticipantStatus, RegistrationMode } from "@biketrips/domain";

export function decideRegistrationStatus(input: {
  confirmedParticipants: number;
  capacity: number | null;
  registrationMode: RegistrationMode;
}): ParticipantStatus {
  if (input.capacity !== null && input.confirmedParticipants >= input.capacity) {
    return "waitlisted";
  }

  if (input.registrationMode === "manual") {
    return "pending";
  }

  return "confirmed";
}
