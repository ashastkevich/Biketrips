import { FindTripSection } from "./find-trip-section";
import { cookies } from "next/headers";
import { HomeHeader } from "./home-header";
import { getCities, getCurrentUser, getTrip, getTripDetails } from "./lib/api";
import { CITY_COOKIE_NAME, fallbackCities, selectCity } from "./lib/cities";
import { ArrowIcon } from "./lib/components";
import { CreateTripLauncher } from "./lib/create-trip-launcher";
import { LinkButton } from "./ui/components";

interface HomePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const [query, cookieStore, currentUser, citiesResult] = await Promise.all([
    searchParams,
    cookies(),
    getCurrentUser(),
    getCities(),
  ]);
  const cities = citiesResult.data.length > 0 ? citiesResult.data : fallbackCities;
  const queryCity = Array.isArray(query.city) ? query.city[0] : query.city;
  const selectedCity = selectCity(
    cities,
    queryCity ?? cookieStore.get(CITY_COOKIE_NAME)?.value,
  );
  const tripsResult = await getTripDetails({ city: selectedCity.slug });
  const requestedTripSlug = Array.isArray(query.trip) ? query.trip[0] : query.trip;
  const requestedTripResult =
    query.scope === "feed" && requestedTripSlug
      ? await getTrip(requestedTripSlug)
      : null;
  const trips =
    requestedTripResult?.data &&
    !tripsResult.data.some((trip) => trip.id === requestedTripResult.data?.id)
      ? [...tripsResult.data, requestedTripResult.data]
      : tripsResult.data;
  const isAuthorized = currentUser !== null;

  return (
    <>
      <HomeHeader isAuthorized={isAuthorized} />

      <section className="hero" id="hero" aria-labelledby="hero-title">
        <div className="page hero-content">
          <h1 id="hero-title">Совместные велопоездки рядом</h1>
          <p className="lead">
            Найдите компанию, маршрут и подходящий темп без бесконечного поиска по чатам.
          </p>

          <div className="hero-actions">
            <LinkButton href="#rides">
              <ArrowIcon />
              Найти поездку
            </LinkButton>
            <CreateTripLauncher tone="secondary" />
          </div>
        </div>
      </section>

      <main>
        <div className="page section search-section" id="rides">
      <FindTripSection
        trips={trips}
        isAuthenticated={isAuthorized}
        currentUserId={currentUser?.id}
        cities={cities}
        selectedCity={selectedCity}
      />
        </div>

        <section className="how-section" id="how" aria-labelledby="how-title">
          <div className="page">
            <div className="how-head">
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
