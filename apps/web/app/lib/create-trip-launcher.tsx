import Link from "next/link";

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeLinecap="round" strokeWidth="2.4" />
    </svg>
  );
}

interface CreateTripLauncherProps {
  className: string;
  compact?: boolean;
  label?: string;
}

export function CreateTripLauncher({
  className,
  compact = false,
  label = "Создать поездку",
}: CreateTripLauncherProps) {
  return (
    <Link className={className} href="/trips/new">
      <PlusIcon />
      {compact ? <span>{label}</span> : label}
    </Link>
  );
}
