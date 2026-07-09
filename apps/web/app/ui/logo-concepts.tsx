import type { ReactElement, SVGProps } from "react";

type LogoVariant = "route" | "compass" | "chain" | "summit" | "stamp" | "classicBike" | "routeBike";
type LogoTone = "light" | "dark";

export interface LogoConceptProps {
  variant: LogoVariant;
  tone?: LogoTone;
  showName?: boolean;
}

const logoLabels: Record<LogoVariant, string> = {
  route: "Маршрутная B",
  compass: "Компас старта",
  chain: "Цепная дорожка",
  summit: "Холмы и колеса",
  stamp: "Клубная печать",
  classicBike: "Классический велосипед",
  routeBike: "Велосипедный маршрут",
};

export const logoConceptDescriptions: Array<{
  variant: LogoVariant;
  title: string;
  description: string;
}> = [
  {
    variant: "route",
    title: logoLabels.route,
    description: "Основной кандидат: буква B собрана из двух колес и линии маршрута.",
  },
  {
    variant: "compass",
    title: logoLabels.compass,
    description: "Для навигационного сценария: стартовая точка, направление и компактный знак.",
  },
  {
    variant: "chain",
    title: logoLabels.chain,
    description: "Более технологичный wordmark с ритмом звеньев цепи и трека.",
  },
  {
    variant: "summit",
    title: logoLabels.summit,
    description: "Теплый outdoor-вариант: поездки, рельеф и спокойный клубный характер.",
  },
  {
    variant: "stamp",
    title: logoLabels.stamp,
    description: "Эмблема для мерча, аватаров и Telegram: знак читается даже без подписи.",
  },
  {
    variant: "classicBike",
    title: logoLabels.classicBike,
    description: "Самый близкий к текущему знаку: простой велосипед в мягкой квадратной плитке.",
  },
  {
    variant: "routeBike",
    title: logoLabels.routeBike,
    description: "Велосипедный знак с дугой маршрута: сохраняет текущий силуэт, но добавляет идею поездки.",
  },
];

export function LogoConcept({ variant, tone = "dark", showName = true }: LogoConceptProps) {
  const Icon = logoIcons[variant];

  return (
    <div className={`logo-concept logo-concept--${tone}`} aria-label={`BikeTrips, ${logoLabels[variant]}`}>
      <span className="logo-concept__mark">
        <Icon />
      </span>
      {showName ? (
        <span className="logo-concept__wordmark">
          <span>Bike</span>
          <span>Trips</span>
        </span>
      ) : null}
    </div>
  );
}

function RouteMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 64 64" role="img" aria-hidden="true" {...props}>
      <path className="logo-fill-soft" d="M10 13h25c11.4 0 19 6.4 19 15.5S46.4 45 35 45H10V13Z" />
      <path
        className="logo-stroke-strong"
        d="M16 16v36M16 16h20c8.4 0 14 4.2 14 10.8S44.4 38 36 38H16"
      />
      <circle className="logo-fill-strong" cx="28" cy="30" r="5.5" />
      <circle className="logo-fill-strong" cx="43" cy="44" r="5.5" />
      <path className="logo-stroke-light" d="M28 30c5.6-6.6 12.4-7.6 18-2.8M31 31l8 13" />
    </svg>
  );
}

function CompassMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 64 64" role="img" aria-hidden="true" {...props}>
      <circle className="logo-fill-soft" cx="32" cy="32" r="24" />
      <path className="logo-stroke-strong" d="M32 9v8M32 47v8M9 32h8M47 32h8" />
      <path className="logo-fill-strong" d="M27 37 40 17l-3 24-13 6 3-10Z" />
      <circle className="logo-fill-light" cx="24" cy="42" r="5" />
      <path className="logo-stroke-light" d="M17 43c9.8 6.2 22 4.4 30-4.2" />
    </svg>
  );
}

function ChainMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 64 64" role="img" aria-hidden="true" {...props}>
      <rect className="logo-fill-soft" x="8" y="13" width="48" height="38" rx="15" />
      <path
        className="logo-stroke-strong"
        d="M18 25h15c4.6 0 7.5 2.5 7.5 6.1S37.6 38 33 38H18V25Z"
      />
      <path className="logo-stroke-strong" d="M18 38h20c4.3 0 7 2.1 7 5.5S42.3 49 38 49H18" />
      <circle className="logo-fill-strong" cx="22" cy="31.5" r="3" />
      <circle className="logo-fill-strong" cx="33" cy="43.5" r="3" />
      <path className="logo-stroke-light" d="M18 18c9 6 19 6 28 0M18 54c9-6 19-6 28 0" />
    </svg>
  );
}

function SummitMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 64 64" role="img" aria-hidden="true" {...props}>
      <path className="logo-fill-soft" d="M9 45 22 20l10 17 9-12 14 20H9Z" />
      <path className="logo-stroke-strong" d="m10 45 12-23 10 17 9-12 13 18" />
      <circle className="logo-fill-light" cx="21" cy="45" r="6" />
      <circle className="logo-fill-light" cx="45" cy="45" r="6" />
      <path className="logo-stroke-light" d="M21 45h11l5-12 8 12M28 34h8" />
      <path className="logo-fill-strong" d="m23 20 4 7h-8l4-7Z" />
    </svg>
  );
}

function StampMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 64 64" role="img" aria-hidden="true" {...props}>
      <circle className="logo-fill-soft" cx="32" cy="32" r="25" />
      <circle className="logo-stroke-strong" cx="32" cy="32" r="20" />
      <path className="logo-stroke-strong" d="M24 20v25M24 20h10c5.4 0 8.9 2.9 8.9 7.2S39.4 35 34 35H24" />
      <path className="logo-stroke-light" d="M20 45h26M21 16l3 4M43 16l-3 4" />
      <circle className="logo-fill-strong" cx="36" cy="35" r="4.5" />
      <circle className="logo-fill-light" cx="24" cy="45" r="3.5" />
      <circle className="logo-fill-light" cx="45" cy="45" r="3.5" />
    </svg>
  );
}

function ClassicBikeMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 64 64" role="img" aria-hidden="true" {...props}>
      <rect className="logo-fill-soft" x="9" y="9" width="46" height="46" rx="15" />
      <circle className="logo-stroke-strong" cx="21" cy="42" r="8" />
      <circle className="logo-stroke-strong" cx="45" cy="42" r="8" />
      <path className="logo-stroke-strong" d="M21 42h10l7-17M30 42l-8-14h15l8 14" />
      <path className="logo-stroke-light" d="M34 19h8M38 25l5-6" />
      <circle className="logo-fill-strong" cx="31" cy="42" r="3.2" />
    </svg>
  );
}

function RouteBikeMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 64 64" role="img" aria-hidden="true" {...props}>
      <path className="logo-fill-soft" d="M11 32c0-12.7 9.5-21 21-21s21 8.3 21 21-9.5 21-21 21-21-8.3-21-21Z" />
      <path className="logo-stroke-light" d="M18 25c5.6-7.5 19.9-9.3 29 0" />
      <circle className="logo-stroke-strong" cx="20" cy="40" r="7" />
      <circle className="logo-stroke-strong" cx="44" cy="40" r="7" />
      <path className="logo-stroke-strong" d="M20 40h11l6-15M31 40l-7-13h14l6 13" />
      <path className="logo-fill-strong" d="M43 16a5 5 0 0 1 5 5c0 4.2-5 8.2-5 8.2S38 25.2 38 21a5 5 0 0 1 5-5Z" />
      <circle className="logo-fill-light" cx="43" cy="21" r="1.8" />
    </svg>
  );
}

const logoIcons: Record<LogoVariant, (props: SVGProps<SVGSVGElement>) => ReactElement> = {
  route: RouteMark,
  compass: CompassMark,
  chain: ChainMark,
  summit: SummitMark,
  stamp: StampMark,
  classicBike: ClassicBikeMark,
  routeBike: RouteBikeMark,
};
