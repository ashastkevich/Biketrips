import { FindTripSection } from "./find-trip-section";
import { ArrowIcon, Brand } from "./lib/components";
import { CreateTripLauncher } from "./lib/create-trip-launcher";
import { LinkButton } from "./ui/components";

export default function HomePage() {
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
            <CreateTripLauncher compact label="Создать" />
          </nav>
        </header>

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
        <div className="page section search-section">
          <FindTripSection />
        </div>

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
