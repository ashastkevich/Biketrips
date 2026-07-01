import { LinkButton } from "../ui/components";

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeLinecap="round" strokeWidth="2.4" />
    </svg>
  );
}

interface CreateTripLauncherProps {
  className?: string;
  compact?: boolean;
  label?: string;
  tone?: "primary" | "secondary" | "ghost";
}

export function CreateTripLauncher({
  className,
  label = "Создать поездку",
  tone = "primary",
}: CreateTripLauncherProps) {
  return (
    <LinkButton className={className} href="/trips/new" tone={tone}>
      <PlusIcon />
      {label}
    </LinkButton>
  );
}
