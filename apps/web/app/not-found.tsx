import { AppTopbar } from "./lib/components";
import { Card, LinkButton } from "./ui/components";
import styles from "./not-found.module.css";

export default function NotFoundPage() {
  return (
    <>
      <AppTopbar />

      <main className="shell app-content-shell narrow-shell">
        <Card className={styles.card} padding="large">
          <p className={styles.eyebrow}>Ошибка 404</p>
          <h1>Такой страницы нет</h1>
          <p className={styles.muted}>Возможно, поездка была удалена или ссылка изменилась.</p>
          <LinkButton href="/">Вернуться к поездкам</LinkButton>
        </Card>
      </main>
    </>
  );
}
