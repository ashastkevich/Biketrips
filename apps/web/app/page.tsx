import { FindTripSection } from "./find-trip-section";
import { cookies } from "next/headers";
import Image from "next/image";
import { HomeHeader } from "./home-header";
import { getCities, getCurrentUser, getTrip, getTripDetails } from "./lib/api";
import { CITY_COOKIE_NAME, fallbackCities, selectCity } from "./lib/cities";
import { ArrowIcon } from "./lib/components";
import { CreateTripLauncher } from "./lib/create-trip-launcher";
import { legalLinks } from "./legal/legal-documents";
import { LinkButton } from "./ui/components";
import styles from "./home.module.css";

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

      <section className={styles.hero} id="hero" data-home-hero aria-labelledby="hero-title">
        <Image
          className={styles.heroImage}
          src="/img/hero-cycling-group.webp"
          alt=""
          fill
          priority
          sizes="100vw"
        />
        <div className={styles.heroOverlay} aria-hidden="true" />
        <div className={`page ${styles.heroContent}`}>
          <h1 id="hero-title">Совместные велопоездки рядом</h1>
          <p className={styles.lead}>
            Найдите компанию, маршрут и подходящий темп без бесконечного поиска по чатам.
          </p>

          <div className={styles.heroActions}>
            <LinkButton href="#rides">
              <ArrowIcon />
              Найти поездку
            </LinkButton>
            <CreateTripLauncher tone="secondary" />
          </div>
        </div>
      </section>

      <main>
        <div className={`page ${styles.section} ${styles.searchSection}`} id="rides">
      <FindTripSection
        trips={trips}
        isAuthenticated={isAuthorized}
        currentUserId={currentUser?.id}
        cities={cities}
        selectedCity={selectedCity}
      />
        </div>

        <section className={styles.howSection} id="how" aria-labelledby="how-title">
          <div className="page">
            <div className={styles.howHead}>
              <h2 id="how-title">Как это работает</h2>
              <p>
                BikeTrips собирает поездки в понятную афишу: участник быстро оценивает маршрут, а
                организатор получает одну актуальную ссылку вместо длинной переписки.
              </p>
            </div>

            <div className={styles.steps}>
              <article className={styles.step}>
                <div className={styles.stepNumber}>1</div>
                <h3>Организатор публикует поездку</h3>
                <p>Указывает старт, время, сложность, длину маршрута, темп и лимит мест.</p>
              </article>
              <article className={styles.step}>
                <div className={styles.stepNumber}>2</div>
                <h3>Участник выбирает подходящую</h3>
                <p>Фильтры и карточки помогают быстро понять, подходит ли поездка по уровню.</p>
              </article>
              <article className={styles.step}>
                <div className={styles.stepNumber}>3</div>
                <h3>Все получают обновления</h3>
                <p>Запись, отмены и изменения маршрута остаются в одной карточке и уведомлениях.</p>
              </article>
            </div>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={`page ${styles.footerInner}`}>
          <div className={styles.footerIntro}>
            <div className={styles.footerBrand}>BikeTrips</div>
            <p>Совместные велопоездки рядом.</p>
          </div>
          <div className={styles.footerLegal}>
            <p>Документы</p>
            <nav className={styles.footerLinks} aria-label="Юридическая информация">
              {legalLinks.map((link) => (
                <a href={link.href} key={link.href}>
                  {link.label}
                </a>
              ))}
            </nav>
          </div>
        </div>
      </footer>
    </>
  );
}
