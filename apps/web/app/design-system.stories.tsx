import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import styles from "./design-system.module.css";

const meta = {
  title: "Design System/Foundations/Overview",
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Foundations: Story = {
  render: () => (
    <main className={styles.pageShell}>
      <section className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>BikeTrips design system</p>
          <h1>Основы интерфейса</h1>
          <div className={styles.lead}>
            Общие визуальные решения для ленты, страницы поездки и кабинета организатора.
          </div>
        </div>
      </section>

      <section className={styles.contentCard}>
        <h2>Цветовые токены</h2>
        <div className={styles.tokenGrid}>
          <TokenSwatch color="#1C1A18" name="Black" usage="Основной текст" />
          <TokenSwatch color="#4F6814" name="Primary green" usage="Главное действие" />
          <TokenSwatch color="#F5F3EC" name="Sand 100" usage="Основной фон Komoot" dark />
          <TokenSwatch color="#FBFAF9" name="Sand 0" usage="Поверхности компонентов" dark />
          <TokenSwatch color="#EDE9DE" name="Sand 200" usage="Вторичный слой" dark />
          <TokenSwatch color="#E0DBCE" name="Stroke" usage="Границы и разделители" dark />
        </div>
      </section>

      <section className={styles.contentCard}>
        <h2>Типографика</h2>
        <h1>Совместные велопоездки рядом</h1>
        <h2>Найдите подходящий маршрут</h2>
        <h3>Вечерний gravel по паркам</h3>
        <p>Основной текст помогает быстро понять формат, темп и сложность поездки.</p>
        <p className={styles.muted}>Вспомогательный текст и пояснения к данным.</p>
      </section>

      <section className={styles.contentCard}>
        <h2>Геометрия и глубина</h2>
        <div className={styles.tokenMetrics}>
          <div><span className={`${styles.radiusSample} ${styles.radiusSampleSmall}`} /><strong>12 px</strong><small>Контролы</small></div>
          <div><span className={`${styles.radiusSample} ${styles.radiusSampleMedium}`} /><strong>18 px</strong><small>Карточки</small></div>
          <div><span className={`${styles.radiusSample} ${styles.radiusSampleLarge}`} /><strong>28 px</strong><small>Крупные поверхности</small></div>
          <div><span className={styles.elevationSample} /><strong>Level 1</strong><small>Мягкая глубина</small></div>
        </div>
      </section>

    </main>
  ),
};

function TokenSwatch({
  color,
  name,
  usage,
  dark = false,
}: {
  color: string;
  name: string;
  usage: string;
  dark?: boolean;
}) {
  return (
    <div
      className={`${styles.tokenSwatch}${dark ? ` ${styles.tokenSwatchDarkCopy}` : ""}`}
      style={{ background: color }}
    >
      <strong>{name}</strong>
      <span>{color}</span>
      <small>{usage}</small>
    </div>
  );
}
