import { AppTopbar, PageHeader } from "../../lib/components";
import { BackLink, Card, LinkButton } from "../../ui/components";

export default function TelegramAuthPage() {
  return (
    <main className="shell narrow-shell">
      <AppTopbar />
      <BackLink href="/">
        На главную
      </BackLink>
      <PageHeader eyebrow="Telegram" title="Вход и привязка">
        <p>
          Этот экран зарезервирован под Telegram Login Widget. После подключения бота он будет
          получать подпись Telegram, отправлять ее в API и возвращать пользователя к поездке.
        </p>
      </PageHeader>

      <Card className="auth-card" padding="large">
        <h2 id="auth-title">Telegram-аккаунт</h2>
        <div className="telegram-placeholder" aria-hidden="true">
          TG
        </div>
        <p className="muted">
          Пока виджет не настроен, локальный organizer-токен можно передать через серверную
          переменную окружения.
        </p>
        <LinkButton href="/">Вернуться к поездкам</LinkButton>
      </Card>
    </main>
  );
}
