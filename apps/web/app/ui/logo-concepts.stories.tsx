import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { LogoConcept, logoConceptDescriptions } from "./logo-concepts";
import styles from "./logo-concepts.module.css";

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
    <main className={styles.storyShell}>
      <section className={styles.storyHero}>
        <div>
          <p className={styles.eyebrow}>BikeTrips identity</p>
          <h1>7 вариантов логотипа</h1>
          <p>
            Все варианты используют текущую оливково-песочную палитру, мягкую геометрию интерфейса
            и читаемый знак для шапки, карточек поездок и Telegram.
          </p>
        </div>
      </section>

      <section className={styles.conceptGrid} aria-label="Варианты логотипа BikeTrips">
        {logoConceptDescriptions.map((concept) => (
          <article className={styles.conceptCard} key={concept.variant}>
            <div className={styles.conceptCardPreview}>
              <LogoConcept variant={concept.variant} />
            </div>
            <div>
              <h2>{concept.title}</h2>
              <p>{concept.description}</p>
            </div>
            <div className={styles.conceptCardSwatches} aria-label="Примеры применения">
              <span className={styles.conceptCardAppbar}>
                <LogoConcept variant={concept.variant} showName={false} />
              </span>
              <span className={styles.conceptCardDark}>
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
    <main className={`${styles.storyShell} ${styles.storyShellCompact}`}>
      <section className={styles.headerComparison}>
        {logoConceptDescriptions.map((concept) => (
          <div className={styles.headerComparisonRow} key={concept.variant}>
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
