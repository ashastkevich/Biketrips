import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { LogoConcept, logoConceptDescriptions } from "./logo-concepts";

const meta = {
  title: "Design System/Foundations/Logo Concepts",
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Concepts: Story = {
  render: () => (
    <main className="logo-story-shell">
      <section className="logo-story-hero">
        <div>
          <p className="eyebrow">BikeTrips identity</p>
          <h1>7 вариантов логотипа</h1>
          <p>
            Все варианты используют текущую оливково-песочную палитру, мягкую геометрию интерфейса
            и читаемый знак для шапки, карточек поездок и Telegram.
          </p>
        </div>
      </section>

      <section className="logo-concept-grid" aria-label="Варианты логотипа BikeTrips">
        {logoConceptDescriptions.map((concept) => (
          <article className="logo-concept-card" key={concept.variant}>
            <div className="logo-concept-card__preview">
              <LogoConcept variant={concept.variant} />
            </div>
            <div>
              <h2>{concept.title}</h2>
              <p>{concept.description}</p>
            </div>
            <div className="logo-concept-card__swatches" aria-label="Примеры применения">
              <span className="logo-concept-card__appbar">
                <LogoConcept variant={concept.variant} showName={false} />
              </span>
              <span className="logo-concept-card__dark">
                <LogoConcept variant={concept.variant} tone="light" />
              </span>
            </div>
          </article>
        ))}
      </section>
    </main>
  ),
};

export const HeaderScale: Story = {
  render: () => (
    <main className="logo-story-shell logo-story-shell--compact">
      <section className="logo-header-comparison">
        {logoConceptDescriptions.map((concept) => (
          <div className="logo-header-comparison__row" key={concept.variant}>
            <LogoConcept variant={concept.variant} />
            <nav aria-label="Пример навигации">
              <a href="/">Поездки</a>
            </nav>
          </div>
        ))}
      </section>
    </main>
  ),
};
