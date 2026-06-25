import type { ParticipantStatus, RegistrationMode } from "@biketrips/domain";

export function decideRegistrationStatus(input: {
  confirmedParticipants: number;
  capacity: number;
  registrationMode: RegistrationMode;
}): ParticipantStatus {
  if (input.confirmedParticipants >= input.capacity) {
    return "waitlisted";
  }

  if (input.registrationMode === "manual") {
    return "pending";
  }

  return "confirmed";
}
