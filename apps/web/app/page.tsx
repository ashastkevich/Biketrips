import Link from "next/link";
import type { BikeType, DifficultyLevel, TripFilters } from "@biketrips/domain";

import { ArrowIcon, Brand, DataNotice, PlusIcon, TripCard } from "./lib/components";
import { getTrips } from "./lib/api";
import { bikeTypeLabels, difficultyLabels } from "./lib/labels";

interface HomePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const filters: TripFilters = {
    city: firstValue(params.city),
    difficulty: firstValue(params.difficulty) as DifficultyLevel | undefined,
    bikeType: firstValue(params.bikeType) as BikeType | undefined,
    dateFrom: firstValue(params.dateFrom),
  };
  const result = await getTrips(filters);

  return (
    <>
      <section className="hero" aria-labelledby="hero-title">
        <header className="page topbar">
          <Brand tone="light" />
          <nav className="nav" aria-label="Навигация">
            <a className="nav-link" href="#rides">
              Поездки
            </a>
            <a className="nav-link" href="#how">
              Как это работает
            </a>
            <Link className="create-button" href="/trips/new">
              <PlusIcon />
              <span>Создать</span>
            </Link>
          </nav>
        </header>

        <div className="page hero-content">
          <h1 id="hero-title">Совместные велопоездки рядом</h1>
          <p className="lead">
            Найдите компанию, маршрут и подходящий темп без бесконечного поиска по чатам.
          </p>

          <div className="hero-actions">
            <a className="primary-button" href="#rides">
              <ArrowIcon />
              Найти поездку
            </a>
            <Link className="secondary-button" href="/trips/new">
              <PlusIcon />
              Создать поездку
            </Link>
          </div>
        </div>
      </section>

      <main>
        <section className="page section search-section" id="rides" aria-labelledby="rides-title">
          <div className="section-head">
            <div className="section-copy">
              <h2 id="rides-title">Найдите подходящую поездку</h2>
              <p>
                Выберите город, дату и уровень. В карточках сразу видно старт, сложность, длину
                маршрута и свободные места.
              </p>
            </div>
            <Link className="section-create" href="/trips/new">
              <PlusIcon />
              Создать поездку
            </Link>
          </div>

          <DataNotice source={result.source} error={result.error} />

          <form className="search-toolbar" aria-label="Фильтры поездок">
            <label className="city-filter">
              <span>Город</span>
              <input name="city" placeholder="Москва" defaultValue={filters.city ?? ""} />
            </label>
            <label className="filter-field">
              <span>Дата от</span>
              <input name="dateFrom" type="date" defaultValue={filters.dateFrom ?? ""} />
            </label>
            <label className="filter-field">
              <span>Уровень</span>
              <select name="difficulty" defaultValue={filters.difficulty ?? ""}>
                <option value="">Любой</option>
                {Object.entries(difficultyLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="filter-field">
              <span>Велосипед</span>
              <select name="bikeType" defaultValue={filters.bikeType ?? ""}>
                <option value="">Любой</option>
                {Object.entries(bikeTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <button className="filter-chip is-active" type="submit">
              Показать
            </button>
            <Link className="filter-chip is-more" href="/organizer/trips">
              Кабинет
            </Link>
          </form>

          {result.data.length > 0 ? (
            <div className="results" aria-label="Ближайшие поездки">
              {result.data.map((trip) => (
                <TripCard trip={trip} key={trip.id} />
              ))}
            </div>
          ) : (
            <section className="empty-state">
              <h2>Поездок по этим фильтрам нет</h2>
              <p>Попробуйте убрать часть условий или создайте первую поездку для своего города.</p>
              <Link className="section-create" href="/trips/new">
                <PlusIcon />
                Создать поездку
              </Link>
            </section>
          )}
        </section>

        <section className="how-section" id="how" aria-labelledby="how-title">
          <div className="page">
            <div className="how-head">
              <span className="how-label">От поиска к записи</span>
              <h2 id="how-title">Как это работает</h2>
              <p>
                BikeTrips собирает поездки в понятную афишу: участник быстро оценивает маршрут, а
                организатор получает одну актуальную ссылку вместо длинной переписки.
              </p>
            </div>

            <div className="steps">
              <article className="step">
                <div className="step-number">1</div>
                <h3>Организатор публикует поездку</h3>
                <p>Указывает старт, время, сложность, длину маршрута, темп и лимит мест.</p>
              </article>
              <article className="step">
                <div className="step-number">2</div>
                <h3>Участник выбирает подходящую</h3>
                <p>Фильтры и карточки помогают быстро понять, подходит ли поездка по уровню.</p>
              </article>
              <article className="step">
                <div className="step-number">3</div>
                <h3>Все получают обновления</h3>
                <p>Запись, отмены и изменения маршрута остаются в одной карточке и уведомлениях.</p>
              </article>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="page footer-inner">
          <div className="footer-brand">BikeTrips</div>
          <nav className="footer-links" aria-label="Юридическая информация">
            <a href="#">Политика конфиденциальности</a>
            <a href="#">Пользовательское соглашение</a>
            <a href="#">Контакты</a>
          </nav>
        </div>
      </footer>
    </>
  );
}
