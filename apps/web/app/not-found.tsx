import { AppTopbar } from "./lib/components";
import { Card, LinkButton } from "./ui/components";

export default function NotFoundPage() {
  return (
    <main className="shell narrow-shell">
      <AppTopbar />
      <Card className="not-found-card" padding="large">
        <p className="eyebrow">Ошибка 404</p>
        <h1>Такой страницы нет</h1>
        <p className="muted">
          Возможно, поездка была удалена или ссылка изменилась.
        </p>
        <LinkButton href="/">Вернуться к поездкам</LinkButton>
      </Card>
    </main>
  );
}
